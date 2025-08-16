import { TYPEINFO_TYPES, TYPEINFO_NAMES, PROTOBUF_NAMES, META_NAMES, PROTOBUF_FIELD_TYPES } from "./constants.js";

// Data structures to hold extracted info
type Variables = Map<string, string>; // Variables and the values they are initialized with as strings -- fails if not a value e.g. a + b

export type TypeInfo = BooleanType | NumberType | StringType | ReferenceType | ArrayType | UnionType | ObjectType;

export type BooleanType = { type: typeof TYPEINFO_TYPES.BOOLEAN, asString: string };
export type NumberType = { type: typeof TYPEINFO_TYPES.NUMBER, asString: string };
export type StringType = { type: typeof TYPEINFO_TYPES.STRING, asString: string };
export type ReferenceType = { type: typeof TYPEINFO_TYPES.REFERENCE, asString: string };
export type ArrayType = { type: typeof TYPEINFO_TYPES.ARRAY, asString: string, elementType: TypeInfo };
export type UnionType = { type: typeof TYPEINFO_TYPES.UNION, asString: string, members: TypeInfo[] };
export type ObjectType = { type: typeof TYPEINFO_TYPES.OBJECT, asString: string, properties: [string, TypeInfo][] };

export type PayloadType = ObjectType | (UnionType & { members: PayloadType[] });

// Maps type aliases to the types they denote.
export type TypeVariables = Map<string, TypeInfo>;
type EventWithoutPayload = { eventTypeName: string; eventKind: typeof TYPEINFO_NAMES.WITHOUT_PAYLOAD };
type EventWithPayload = { eventTypeName: string; eventKind: typeof TYPEINFO_NAMES.WITH_PAYLOAD; payloadType: PayloadType };
export type Event = EventWithoutPayload | EventWithPayload;

export type EventSpec = {
  variables: Variables;
  typeVariables: TypeVariables;
  events: Event[];
}

// Pretty print TypeInfo, Event and EventSpec
type Serializable = string | number | boolean | null | SerializableObject | Serializable[]
export type SerializableObject = { [key: string]: Serializable }

export function serializeTypeInfo(typeInfo: TypeInfo): Serializable {
  switch (typeInfo.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'reference':
      return typeInfo
    case 'array':
      return { type: typeInfo.type, asString: typeInfo.asString, elementType: serializeTypeInfo(typeInfo.elementType) }
    case 'union':
      return { type: typeInfo.type, asString: typeInfo.asString, members: typeInfo.members.map(m => serializeTypeInfo(m)) }
    case 'object':
      return { type: typeInfo.type, asString: typeInfo.asString, properties: typeInfo.properties.map(([propertyName, typeInfo]) => [propertyName, serializeTypeInfo(typeInfo)]) }
  }
}

function serializeEvent(event: Event): Serializable {
  switch (event.eventKind) {
    case 'withPayload':
      return { eventTypeName: event.eventTypeName, eventKind: event.eventKind, payloadType: serializeTypeInfo(event.payloadType) }
    case 'withoutPayload':
      return event
  }
}

export function serializeEventSpec(eventSpec: EventSpec): Serializable {
  return {
    variables: Array.from(eventSpec.variables.entries()),
    types: Array.from(eventSpec.typeVariables.entries()).map(([typeName, typeInfo]) => [typeName, serializeTypeInfo(typeInfo)]),
    events: eventSpec.events.map(e => serializeEvent(e))
  }
}

export function eventSpecToString(eventSpec: EventSpec, replacer?: (number | string)[] | null, space?: string | number): string {
  return JSON.stringify(serializeEventSpec(eventSpec), replacer, space)
}

// Types derived from constants
export type TypeInfoTName = typeof TYPEINFO_TYPES[keyof typeof TYPEINFO_TYPES];
export type ProtobufFieldType = typeof PROTOBUF_FIELD_TYPES[keyof typeof PROTOBUF_FIELD_TYPES] | { userDefined: string };
export type MetaNames = typeof META_NAMES[keyof typeof META_NAMES];

// For encoding to protobuf
export type MessageType = { messageName: string, fields: FieldTriple[] }
export type FieldTriple = { fieldName: string, fieldNumber?: number, fieldType: ProtobufFieldType, rule?: typeof PROTOBUF_NAMES.REPEATED }

export const isUserDefined = (fieldType: ProtobufFieldType): fieldType is { userDefined: string } => {
  return typeof fieldType === "object" && "userDefined" in fieldType && typeof fieldType.userDefined === "string"
}
export const getFieldType = (fieldTriple: FieldTriple): string => {
  if (isUserDefined(fieldTriple.fieldType)) { return fieldTriple.fieldType.userDefined }
  else { return fieldTriple.fieldType }
}
export const getFieldType_ = (fieldType: ProtobufFieldType): string => {
  if (isUserDefined(fieldType)) { return fieldType.userDefined }
  else { return fieldType }
}

// https://dev.to/martinpersson/a-guide-to-using-the-option-type-in-typescript-ki2
export type Some<T> = { tag: "Some", value: T}
export type None = { tag: "None" }
export type Option<T> = Some<T> | None

export const some = <T>(value: T): Option<T> => ({
  tag: "Some",
  value
});

export const none: Option<never> = { tag: "None" }

export const isNone = <T>(optionValue: Option<T>): boolean => {
  return optionValue.tag === "None"
}

export const isSome = <T>(optionValue: Option<T>): optionValue is Some<T> => {
  return optionValue.tag === "Some"
}

export const getValue = <T>(optionValue: Some<T>): T => {
  return optionValue.value
}