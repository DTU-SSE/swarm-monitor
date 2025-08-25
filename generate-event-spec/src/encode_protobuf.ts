import protobuf from 'protobufjs'
import { type EventSpec, type Event, type TypeInfo, type TypeVariables, type PayloadType, type Option, some, none, isSome, type ProtobufFieldType, getFieldType } from './types.js';
import type { Root } from 'protobufjs';
import { PROTOBUF_FIELD_TYPES, PROTOBUF_NAMES, META_NAMES, TYPEINFO_TYPES, TYPEINFO_NAMES } from './constants.js'
import snakeCase from 'lodash.snakecase'

type FieldGenerator = (fieldNumber: number) => protobuf.Field

// Transform an EventSpec to a 'Root' -- data structure representing a set of protobuf message types.
export function eventSpecToProtoBuf(packageName: string, eventSpec: EventSpec, branchTracking = false): Root {
    const root = new protobuf.Root()
    const namespace = root.define(packageName)

    // Add meta as a message type
    const meta = metaMsgType()
    namespace.add(meta)

    // Encode the type definitions referred to by payload types
    addMessagesToNamespace(namespace, encodeTypeAliases(eventSpec.typeVariables))

    const extra: FieldGenerator[] = branchTracking ? [metaField, lastUpField] : [metaField]

    for (const event of eventSpec.events) {
        namespace.add(encodeEventToProtoBuf(event, extra))
    }

    namespace.add(topLevelEvent(eventSpec.events))
    return root
}

// Generate the overall message type that includes the different event types as variants
function topLevelEvent(events: Event[]): protobuf.Type {
    const sealedValue = new protobuf.Type(PROTOBUF_NAMES.TOP_LEVEL_EVENT_NAME)
    for (const [index, event] of events.entries()) {
        sealedValue.add(new protobuf.Field(snakeCase(event.eventTypeName), index + 1, event.eventTypeName)) // Field numbers start at 1
    }

    sealedValue.add(new protobuf.OneOf(PROTOBUF_NAMES.SEALED_VALUE, events.map(e => snakeCase(e.eventTypeName))));
    return sealedValue
}

// Transform type aliases denoting object types as message types
function encodeTypeAliases(typeVariables: TypeVariables): protobuf.Type[] {
    const mapper = (typeName: string, typeInfo: PayloadType) => {
        return encodeEventToProtoBuf({eventTypeName: typeName, eventKind: TYPEINFO_NAMES.WITH_PAYLOAD, payloadType: typeInfo})
    }

    return Array.from(typeVariables)
        .filter(([_, typeInfo]) => typeInfo.type === TYPEINFO_TYPES.OBJECT)
        .map(([typeName, typeInfo]) => mapper(typeName, typeInfo as PayloadType))
}

// Transform the fields of an object type used as payload type to an array of 'ReflectionObject'
// which is a type we use to represent the fields of a message type. A field can itself be a message type.
// Unions of object types supported as Actyx payload type, but currently not supported here.
function payloadTypeToFields(payloadType: PayloadType): protobuf.ReflectionObject[] {
    switch (payloadType.type) {
        case TYPEINFO_TYPES.OBJECT:
            return payloadType.properties.map(([fieldName, typeInfo], index) => typeInfoToField(typeInfo, fieldName, index + 1)) // Field numbers start at 1
        case TYPEINFO_TYPES.UNION:
            throw Error("Encoding of union types is not implemented")
    }
}

// Primitive TypeInfo type or reference to ProtoBufFieldType. Consider of Option show is necessary
function resolveSimpleType(typeInfo: TypeInfo): Option<ProtobufFieldType> {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.BOOLEAN:
            return some(PROTOBUF_FIELD_TYPES.BOOL)
        case TYPEINFO_TYPES.NUMBER:
            return some(PROTOBUF_FIELD_TYPES.DOUBLE)
        case TYPEINFO_TYPES.STRING:
            return some(PROTOBUF_FIELD_TYPES.STRING)
        case TYPEINFO_TYPES.REFERENCE:
            return some({ userDefined: typeInfo.asString })
        default:
            return none
    }
}

// Transform a TypeInfo to a ReflectionObject. Used to create the fields of a message type.
function typeInfoToField(typeInfo: TypeInfo, fieldName: string, fieldNumber: number): protobuf.ReflectionObject {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.BOOLEAN:
        case TYPEINFO_TYPES.NUMBER:
        case TYPEINFO_TYPES.STRING:
        case TYPEINFO_TYPES.REFERENCE:
            const protoBufType = resolveSimpleType(typeInfo)
            if (isSome(protoBufType)) {
                return generateField(fieldName, fieldNumber, protoBufType.value)
            }
            break
        // Right now only arrays of bools, numbers, strings or typealiases are allowed as element types of arrays.
        case TYPEINFO_TYPES.ARRAY:
            const elementProtoBufType = resolveSimpleType(typeInfo.elementType)
            if (isSome(elementProtoBufType)) {
                return generateField(fieldName, fieldNumber, elementProtoBufType.value, PROTOBUF_NAMES.REPEATED)

            }
            break
        case TYPEINFO_TYPES.UNION:
            throw Error("Encoding of union types is not implemented") // sealed oneof. But what to do with field name? Of sealed oneof and its options.
        case TYPEINFO_TYPES.OBJECT:
            const msgType = new protobuf.Type(fieldName)
            const encodedObject = payloadTypeToFields(typeInfo)
            addFields(msgType, encodedObject)
            return msgType
    }

    throw Error("Not implemented")
}

// Transform an Event to a protobuf message type
function encodeEventToProtoBuf(event: Event, extra: FieldGenerator[] = []): protobuf.Type {
    const msgType = new protobuf.Type(event.eventTypeName)
    const fields = event.eventKind === TYPEINFO_NAMES.WITH_PAYLOAD ? payloadTypeToFields(event.payloadType) : []
    addFields(msgType, fields.concat(extra.map((generateField, index) => generateField(fields.length + index + 1))))
    return msgType
}

function addFields(msgType: protobuf.Type, fields: protobuf.ReflectionObject[]) {
    for (const field of fields) {
        msgType.add(field)
    }
}

function generateField(fieldName: string, fieldNumber: number, fieldType: ProtobufFieldType, rule?: (string|{ [k: string]: any })): protobuf.Field {
    return new protobuf.Field(fieldName, fieldNumber, getFieldType(fieldType), rule)
}

function addMessagesToNamespace(namespace: protobuf.Namespace, msgTypes: protobuf.Type[]) {
    for (const msgType of msgTypes) {
        namespace.add(msgType)
    }
}

/*
    Generate the Meta message type. Always included in actyx events at runtime.
    Always part of the corresponding protobuf version of the event.

    Always has the shape:
    message Meta {
        bool is_local_event = 1;
        repeated string tags = 2;
        uint64 timestamp_micros = 3;
        uint32 lamport = 4;
        string app_id = 5;
        string event_id = 6;
        string stream = 7;
        uint32 offset = 8;
    }
*/
export const metaMsgType = (): protobuf.Type => {
    const msgType = new protobuf.Type(PROTOBUF_FIELD_TYPES.META)
    msgType.add(generateField(META_NAMES.IS_LOCAL_EVENT, 1, PROTOBUF_FIELD_TYPES.BOOL))
    msgType.add(generateField(META_NAMES.TAGS, 2, PROTOBUF_FIELD_TYPES.STRING, PROTOBUF_NAMES.REPEATED))
    msgType.add(generateField(META_NAMES.TIMESTAMP_MICROS, 3, PROTOBUF_FIELD_TYPES.UINT64))
    msgType.add(generateField(META_NAMES.LAMPORT, 4, PROTOBUF_FIELD_TYPES.UINT32))
    msgType.add(generateField(META_NAMES.APP_ID, 5, PROTOBUF_FIELD_TYPES.STRING))
    msgType.add(generateField(META_NAMES.EVENT_ID, 6, PROTOBUF_FIELD_TYPES.STRING))
    msgType.add(generateField(META_NAMES.STREAM, 7, PROTOBUF_FIELD_TYPES.STRING))
    msgType.add(generateField(META_NAMES.OFFSET, 8, PROTOBUF_FIELD_TYPES.UINT32))
    return msgType
}

// Generate the Meta field. Always a field of a message type.
export const metaField = (fieldNumber: number): protobuf.Field => {
    return new protobuf.Field(META_NAMES.META_NAME_FIELD, fieldNumber, PROTOBUF_FIELD_TYPES.META)
}

// Generate the last updating event field.
export const lastUpField = (fieldNumber: number): protobuf.Field => {
    return new protobuf.Field(PROTOBUF_NAMES.LAST_UP, fieldNumber, PROTOBUF_FIELD_TYPES.STRING)
}