import { TYPEINFO_TYPES, TYPEINFO_NAMES, META_NAMES, PROTOBUF_FIELD_TYPES } from "./constants.js";
import { SourceFile } from "ts-morph"
// Data structures to hold extracted info
type Variables = Map<string, string>; // Variables and the values they are initialized with as strings -- fails if not a value e.g. a + b

export type TypeKind = typeof TYPEINFO_TYPES[keyof typeof TYPEINFO_TYPES]

// Our own intermediate representation of TypeScript types.
export type TypeInfo = BooleanType | NumberType | StringType | ReferenceType | ArrayType | UnionType | ObjectType;

export type BooleanType = { type: typeof TYPEINFO_TYPES.BOOLEAN, asString: string };
export type NumberType = { type: typeof TYPEINFO_TYPES.NUMBER, asString: string };
export type StringType = { type: typeof TYPEINFO_TYPES.STRING, asString: string };
export type ReferenceType = { type: typeof TYPEINFO_TYPES.REFERENCE, asString: string };
export type ArrayType = { type: typeof TYPEINFO_TYPES.ARRAY, asString: string, elementType: TypeInfo };
export type UnionType = { type: typeof TYPEINFO_TYPES.UNION, asString: string, members: TypeInfo[] };
export type PropertyInfo = { propertyName: string, propertyType: TypeInfo }
export type ObjectType = { type: typeof TYPEINFO_TYPES.OBJECT, asString: string, properties: PropertyInfo[] };

// Payload of a Actyx event can be an object type or a unioni of object types. We do not currently support translating unions.
export type PayloadType = ObjectType | (UnionType & { members: PayloadType[] });

// Maps type aliases to the types they denote.
export type TypeVariables = Map<string, TypeInfo>;

// Intermediate representation of an Actyx event
type EventWithoutPayload = { eventTypeName: string; eventKind: typeof TYPEINFO_NAMES.WITHOUT_PAYLOAD };
type EventWithPayload = { eventTypeName: string; eventKind: typeof TYPEINFO_NAMES.WITH_PAYLOAD; payloadType: PayloadType };
export type Event = EventWithoutPayload | EventWithPayload;

export type Context = { sourceFile: SourceFile, typeVariables: TypeVariables, namedImports: Map<string, string> }

// Constructed when parsing a TypeScript file defining Actyx events.
export type EventSpec = {
  context: Context,
  events: Event[];
}

// Primitive here refers to boolean, number and string. typeInfo is BOOLEAN or ...??
export const isPrimitiveType = (typeInfo: TypeInfo): boolean => {
  return typeInfo.type === TYPEINFO_TYPES.BOOLEAN || typeInfo.type === TYPEINFO_TYPES.NUMBER || typeInfo.type === TYPEINFO_TYPES.STRING
}

export const isPrimitiveOrArray = (typeInfo: TypeInfo): boolean => {
  return typeInfo.type === TYPEINFO_TYPES.BOOLEAN || typeInfo.type === TYPEINFO_TYPES.NUMBER || typeInfo.type === TYPEINFO_TYPES.STRING || typeInfo.type === TYPEINFO_TYPES.ARRAY
}

// Serializable things are to pretty print TypeInfo, Event and EventSpec
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
      return { type: typeInfo.type, asString: typeInfo.asString, properties: typeInfo.properties.map((p) => [p.propertyName, serializeTypeInfo(p.propertyType)]) }
    }
}

export function serializeEvent(event: Event): Serializable {
  switch (event.eventKind) {
    case 'withPayload':
      return { eventTypeName: event.eventTypeName, eventKind: event.eventKind, payloadType: serializeTypeInfo(event.payloadType) }
    case 'withoutPayload':
      return event
  }
}

export function serializeEventSpec(eventSpec: EventSpec): Serializable {
  return {
    context: {
      typeVariables: Array.from(eventSpec.context.typeVariables.entries()).map(([typeName, typeInfo]) => [typeName, serializeTypeInfo(typeInfo)]),
      namedImports: Array.from(eventSpec.context.namedImports.entries())
    },
    events: eventSpec.events.map(e => serializeEvent(e))
  }
}

export function eventSpecToString(eventSpec: EventSpec, replacer?: (number | string)[] | null, space?: string | number): string {
  return JSON.stringify(serializeEventSpec(eventSpec), replacer, space)
}

// Types derived from constants.ts
export type TypeInfoTName = typeof TYPEINFO_TYPES[keyof typeof TYPEINFO_TYPES];
export type ProtobufFieldType = typeof PROTOBUF_FIELD_TYPES[keyof typeof PROTOBUF_FIELD_TYPES] | { userDefined: string };
export type MetaNames = typeof META_NAMES[keyof typeof META_NAMES];

export const isUserDefined = (fieldType: ProtobufFieldType): fieldType is { userDefined: string } => {
  return typeof fieldType === "object" && "userDefined" in fieldType && typeof fieldType.userDefined === "string"
}

export const getFieldType = (fieldType: ProtobufFieldType): string => {
  return isUserDefined(fieldType) ? fieldType.userDefined : fieldType
}

// https://dev.to/martinpersson/a-guide-to-using-the-option-type-in-typescript-ki2
// Not sure we need this whole option show.
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