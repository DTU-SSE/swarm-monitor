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
type EventWithoutPayload = { name: string; eventKind: 'withoutPayload' };
type EventWithPayload = { name: string; eventKind: 'withPayload'; payloadType: TypeInfo };
type Event = EventWithoutPayload | EventWithPayload;

export type ASTData = {
  variables: Variables;
  types: Types;
  events: Event[];
}

// Pretty print Event and TypeInfo
type Serializable = string | number | boolean | null | { [key: string]: Serializable } | Serializable[]

function serializeTypeInfoTo(typeInfo: TypeInfo): Serializable {
  switch (typeInfo.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'reference':
      return typeInfo
    case 'array':
      return { type: typeInfo.type, asString: typeInfo.asString, elementType: serializeTypeInfoTo(typeInfo.elementType) }
    case 'union':
      return { type: typeInfo.type, asString: typeInfo.asString, members: typeInfo.members.map(m => serializeTypeInfoTo(m)) }
    case 'object':
      return { type: typeInfo.type, asString: typeInfo.asString, members: Array.from(typeInfo.properties.entries()).map(([propertyName, typeInfo]) => [propertyName, serializeTypeInfoTo(typeInfo)]) }
  }
}

function serializeEvent(event: Event): Serializable {
  switch (event.eventKind) {
    case 'withPayload':
      return { name: event.name, eventKind: event.eventKind, payloadType: serializeTypeInfoTo(event.payloadType) }
    case 'withoutPayload':
      return event
  }
}

export function serializeASTData(astData: ASTData): Serializable {
  return {
    variables: Array.from(astData.variables.entries()),
    types: Array.from(astData.types.entries()).map(([typeName, typeInfo]) => [typeName, serializeTypeInfoTo(typeInfo)]),
    events: astData.events.map(e => serializeEvent(e))
  }
}

export function astDataToString(astData: ASTData, replacer?: (number | string)[] | null, space?: string | number): string {
  return JSON.stringify(serializeASTData(astData), replacer, space)
}