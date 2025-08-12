// Data structures to hold extracted info
type Variables = Map<string, string>;

export type TypeInfo = StringType | NumberType | BooleanType | ReferenceType | ArrayType | UnionType | ObjectType;

type StringType = {type: 'string', asString:  string};
type NumberType = {type: 'number', asString: string};
type BooleanType = {type: 'boolean', asString: string};
type ReferenceType = {type: 'reference', asString: string};
type ArrayType = {type: 'array', asString: string, elementType: TypeInfo};
type UnionType = {type: 'union', asString: string, members: TypeInfo[]};
type ObjectType = {type: 'object', asString: string, properties: Map<string, TypeInfo>};

type Types = Map<string, TypeInfo>;
type EventWithoutPayload = { name: string; eventKind: 'withoutPayload' };
export type PayloadType = { typeAsString: string; kind: 'typeReference' | 'typeLiteral' };
type EventWithPayload = { name: string; eventKind: 'withPayload'; payloadType: TypeInfo };
type Event = EventWithoutPayload | EventWithPayload;

export type ASTData = {
  variables: Variables;
  types: Types;
  events: Event[];
}

// Pretty print TypeInfo
function typeInfoToString(typeInfo: TypeInfo): string {
  switch (typeInfo.type) {
    case 'string':
    case 'number':
    case 'boolean':
        return `${typeInfo.type}`;
    case 'reference':
      return `${typeInfo.type} (${typeInfo.asString})`;
    case 'array':
      return `${typeInfoToString(typeInfo.elementType)}[]`; //(${typeInfo.asString})`;
    case 'union':
      return `union<${typeInfo.members.map(m => typeInfoToString(m)).join(' | ')}>`;// (${typeInfo.asString})`;
    case 'object':
      return `object { ${Array.from(typeInfo.properties.entries()).map(([k, v]) => `${k}: ${typeInfoToString(v)}`).join(', ')} }`;// (${typeInfo.asString})`;
    default:
      throw new Error(`Error`);
  }
}

// Pretty print ASTData
export function astDataToString(data: ASTData): string {
  const variablesStr = Array.from(data.variables.entries()).map(([k, v]) => `${k}: ${v}`).join('\n  ');
  const typesStr = Array.from(data.types.entries()).map(([k, v]) => `${k}: ${typeInfoToString(v)}`).join('\n  ');
  const eventsStr = data.events.map(e => {
    if (e.eventKind === 'withoutPayload') {
      return `Event: ${e.name} (without payload)`;
    } else {
      return `Event: ${e.name} (with payload: ${typeInfoToString(e.payloadType)} - ${e.payloadType.asString})`;
    }
  }).join('\n  ');

  return `Variables:\n  ${variablesStr}\n\nTypes:\n  ${typesStr}\n\nEvents:\n  ${eventsStr}`;
}