// Data structures to hold extracted info
type Variables = Map<string, string>;

export type TypeInfo = StringType | NumberType | BooleanType | ReferenceType | ArrayType | UnionType | ObjectType;

type StringType = { type: 'string', asString: string };
type NumberType = { type: 'number', asString: string };
type BooleanType = { type: 'boolean', asString: string };
type ReferenceType = { type: 'reference', asString: string };
type ArrayType = { type: 'array', asString: string, elementType: TypeInfo };
type UnionType = { type: 'union', asString: string, members: TypeInfo[] };
type ObjectType = { type: 'object', asString: string, properties: Map<string, TypeInfo> };

type Types = Map<string, TypeInfo>;
type EventWithoutPayload = { eventTypeName: string; eventKind: 'withoutPayload' };
type EventWithPayload = { eventTypeName: string; eventKind: 'withPayload'; payloadType: TypeInfo };
type Event = EventWithoutPayload | EventWithPayload;

export type EventSpec = {
  variables: Variables;
  types: Types;
  events: Event[];
}

// Pretty print TypeInfo, Event and EventSpec
type Serializable = string | number | boolean | null | { [key: string]: Serializable } | Serializable[]

function serializeTypeInfo(typeInfo: TypeInfo): Serializable {
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
      return { type: typeInfo.type, asString: typeInfo.asString, members: Array.from(typeInfo.properties.entries()).map(([propertyName, typeInfo]) => [propertyName, serializeTypeInfo(typeInfo)]) }
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