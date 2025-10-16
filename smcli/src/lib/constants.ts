// Names for various types and similar. Used for TypeInfo representing TypeScript types.
export const TYPEINFO_TYPES = {
    BOOLEAN: "boolean",
    NUMBER: "number",
    STRING: "string",
    REFERENCE: "reference",
    ARRAY: "array",
    UNION: "union",
    OBJECT: "object",
    OBJECT1: "object1",
    TUPLE: "tuple",
    UNKNOWN: "unknown"
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

// Constants for forwarder generation
export const FORWARDER_CONSTANTS = {
    FORWARDER_FILE_NAME: "forwarder.ts",
    MAIN_FUNCTION_CALL: "main()"
}

// Names from machine-runner
export const MACHINE_RUNNER_NAMES = {
    EVENT_DESIGN_FUNCTION: "design: <Key extends string>(key: Key) => EventFactoryIntermediate<Key>",
    EVENT_D_TS: "event.d.ts",
    EVENT_DEFINITION_FUNCTIONS: [
        "withPayload: <Payload extends utils.SerializableObject>() => Factory<Key, Payload>;",
        "withoutPayload: () => Factory<Key, Record<never, never>>;",
        // TODO: implement support for zod
        //"withZod: <Payload extends utils.SerializableObject>(z: z.ZodType<Payload>) => Factory<Key, Payload>;"
    ]
}