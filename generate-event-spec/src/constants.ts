// Names for various types and similar. Used for TypeInfo representing TypeScript types.
export const TYPEINFO_TYPES = {
    BOOLEAN: "boolean",
    NUMBER: "number",
    STRING: "string",
    REFERENCE: "reference",
    ARRAY: "array",
    UNION: "union",
    OBJECT: "object"
} as const;

export const TYPEINFO_NAMES = {
    WITHOUT_PAYLOAD: "withoutPayload",
    WITH_PAYLOAD: "withPayload"
} as const;

// Names for various field types and similar things (e.g. field cardinality things like 'repeated') for Protocol Buffers messages.
// Therefore we have e.g. both BOOLEAN and BOOL
export const PROTOBUF_FIELD_TYPES = {
    BOOL: "bool",
    STRING: "string",
    INT32: "int32",
    UINT32: "uint32",
    UINT64: "uint64",
    DOUBLE: "double",
    META: "Meta"
} as const;

export const PROTOBUF_NAMES = {
    REPEATED: "repeated",
    TOP_LEVEL_EVENT_NAME: "Event",
    LAST_UP: "lbj",
    SEALED_VALUE: "sealed_value"
} as const;

export const META_NAMES = {
    META_NAME_FIELD: "meta",
    IS_LOCAL_EVENT: "is_local_event",
    TAGS: "tags",
    TIMESTAMP_MICROS: "timestamp_micros",
    LAMPORT: "lamport",
    APP_ID: "app_id",
    EVENT_ID: "event_id",
    STREAM: "stream",
    OFFSET: "offset"
} as const;


/* export const TYPEINFO_TO_PROTOBUF_TYPES: { [K in keyof typeof TYPEINFO_TYPES]: typeof PROTOBUF_FIELD_TYPES[K] } = {
    BOOLEAN: PROTOBUF_FIELD_TYPES.BOOL,
    NUMBER: PROTOBUF_FIELD_TYPES.DOUBLE,
    STRING: PROTOBUF_FIELD_TYPES.STRING,
    REFERENCE: PROTOBUF_FIELD_TYPES.DOUBLE,
    ARRAY: PROTOBUF_FIELD_TYPES.DOUBLE,
    UNION: PROTOBUF_FIELD_TYPES.DOUBLE,
    OBJECT: PROTOBUF_FIELD_TYPES.DOUBLE,
} */

export const TYPEINFO_TO_PROTOBUF_TYPES = new Map<string, string>([
  [TYPEINFO_TYPES.BOOLEAN, PROTOBUF_FIELD_TYPES.BOOL],
  [TYPEINFO_TYPES.NUMBER, PROTOBUF_FIELD_TYPES.DOUBLE],
  [TYPEINFO_TYPES.STRING, PROTOBUF_FIELD_TYPES.STRING],
  [TYPEINFO_TYPES.NUMBER, PROTOBUF_FIELD_TYPES.DOUBLE],
]);


export type TypeInfoTName = typeof TYPEINFO_TYPES[keyof typeof TYPEINFO_TYPES];
export type ProtobufFieldType = typeof PROTOBUF_FIELD_TYPES[keyof typeof PROTOBUF_FIELD_TYPES] | { userDefined: string };
export type MetaNames = typeof META_NAMES[keyof typeof META_NAMES];

export const PROTOBUF_FIELD_TYPE_VALUES = Object.values(PROTOBUF_FIELD_TYPES) as readonly ProtobufFieldType[];