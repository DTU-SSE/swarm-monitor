// Names for various types and similar. Used for TypeInfo representing TypeScript types.
export const TYPEINFO_TNAMES = {
    BOOLEAN: "boolean",
    NUMBER: "number",
    STRING: "string",
    REFERENCE: "reference",
    ARRAY: "array",
    UNION: "union",
    OBJECT: "object"
} as const;

// Names for various field types and similar things (e.g. field cardinality things like 'repeated') for Protocol Buffers messages.
// Therefore we have e.g. both BOOLEAN and BOOL
export const PROTOBUF_TNAMES = {
    BOOL: "bool",
}


export type TypeInfo_TNames = typeof TYPEINFO_TNAMES[keyof typeof TYPEINFO_TNAMES];