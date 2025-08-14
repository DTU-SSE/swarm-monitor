import { TYPEINFO_TNAMES, PROTOBUF_NAMES } from "./constants.js";
import type { ProtobufFieldType } from './constants.js'

// Data structures to hold extracted info
type Variables = Map<string, string>; // Variables and the values they are initialized with as strings -- fails if not a value e.g. a + b

export type TypeInfo = BooleanType | NumberType | StringType | ReferenceType | ArrayType | UnionType | ObjectType;

type BooleanType = { type: typeof TYPEINFO_TNAMES.BOOLEAN, asString: string };
type NumberType = { type: typeof TYPEINFO_TNAMES.NUMBER, asString: string };
type StringType = { type: typeof TYPEINFO_TNAMES.STRING, asString: string };
type ReferenceType = { type: typeof TYPEINFO_TNAMES.REFERENCE, asString: string };
type ArrayType = { type: typeof TYPEINFO_TNAMES.ARRAY, asString: string, elementType: TypeInfo };
type UnionType = { type: typeof TYPEINFO_TNAMES.UNION, asString: string, members: TypeInfo[] };
type ObjectType = { type: typeof TYPEINFO_TNAMES.OBJECT, asString: string, properties: [string, TypeInfo][] };

export type PayloadType = ObjectType | (UnionType & { members: PayloadType[] });


/* const t3: TypeInfo = { type: TYPEINFO_TNAMES.BOOLEAN, asString: "" }
const t1: TypeInfo = { type: TYPEINFO_TNAMES.OBJECT, asString: "", properties: [] }
const t2: TypeInfo = { type: TYPEINFO_TNAMES.OBJECT, asString: "", properties: [["1", t1], ["2", t1]] }

const t4: TypeInfo = { type: TYPEINFO_TNAMES.OBJECT, asString: "", properties: [["1", t1], ["2", t1]] }
const t6: PayloadType = { type: TYPEINFO_TNAMES.UNION, asString: "", members: [t2, t3] }
const t7: PayloadType = { type: TYPEINFO_TNAMES.UNION, asString: "", members: [t2, t6] } */

export type Types = Map<string, TypeInfo>;
type EventWithoutPayload = { eventTypeName: string; eventKind: 'withoutPayload' };
type EventWithPayload = { eventTypeName: string; eventKind: 'withPayload'; payloadType: PayloadType };
export type Event = EventWithoutPayload | EventWithPayload;

export type EventSpec = {
  variables: Variables;
  types: Types;
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
    types: Array.from(eventSpec.types.entries()).map(([typeName, typeInfo]) => [typeName, serializeTypeInfo(typeInfo)]),
    events: eventSpec.events.map(e => serializeEvent(e))
  }
}

export function eventSpecToString(eventSpec: EventSpec, replacer?: (number | string)[] | null, space?: string | number): string {
  return JSON.stringify(serializeEventSpec(eventSpec), replacer, space)
}

export type MessageType = { messageName: string, fields: FieldTriple[] }
export type FieldTriple = { fieldName: string, fieldNumber?: number, fieldType: ProtobufFieldType, rule?: typeof PROTOBUF_NAMES.REPEATED }