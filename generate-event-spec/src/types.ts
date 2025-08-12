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

type Types = Map<string, string>;
type EventWithoutPayload = { name: string; eventKind: 'withoutPayload' };
export type PayloadType = { typeAsString: string; kind: 'typeReference' | 'typeLiteral' };
type EventWithPayload = { name: string; eventKind: 'withPayload'; payloadType: PayloadType };
type Event = EventWithoutPayload | EventWithPayload;

export type ASTData = {
  variables: Variables;
  types: Types;
  events: Event[];
}