import protobuf from 'protobufjs'
import { type EventSpec, type Event, type FieldTriple, type MessageType, type TypeInfo, type TypeVariables, type PayloadType, type ArrayType, type Option, some, none, isNone, isSome, type ProtobufFieldType, getFieldType } from './types.js';
import type { Root } from 'protobufjs';
import { PROTOBUF_FIELD_TYPES, PROTOBUF_NAMES, META_NAMES, TYPEINFO_TYPES, TYPEINFO_NAMES } from './constants.js'
import snakeCase from 'lodash.snakecase'

export function eventSpecToProtoBuf(packageName: string, eventSpec: EventSpec, branchTracking = false): Root {
    const root = new protobuf.Root()
    const namespace = root.define(packageName)

    // Add meta as a message type
    const meta = encodeMeta()
    namespace.add(meta)

    // Encode the type definitions referred to by payload types
    addMessagesToNamespace(namespace, encodeTypeAliases(eventSpec.typeVariables))

    // Consider if FieldTriple is a good idea at all. We want to encode recursively?? Is one more type necessary?
    const extra: FieldTriple[] = [{ fieldName: META_NAMES.META_NAME_FIELD, fieldType: PROTOBUF_FIELD_TYPES.META }]
    if (branchTracking) { extra.push({ fieldName: PROTOBUF_NAMES.LAST_UP, fieldType: PROTOBUF_FIELD_TYPES.STRING }) }

    for (const event of eventSpec.events) {
        const msgTypes = encodeEventToProtoBuf(event, extra)
        for (const msgType of msgTypes) {
            namespace.add(msgType)
        }
    }

    namespace.add(topLevelEvent(eventSpec.events))
    return root
}

// Generate the overall message type that includes the different event types as variants
function topLevelEvent(events: Event[]): protobuf.Type {
    const sealedValue = new protobuf.Type(PROTOBUF_NAMES.TOP_LEVEL_EVENT_NAME)
    for (const [index, event] of events.entries()) {
        sealedValue.add(new protobuf.Field(snakeCase(event.eventTypeName), index, event.eventTypeName))
    }

    sealedValue.add(new protobuf.OneOf(PROTOBUF_NAMES.SEALED_VALUE, events.map(e => snakeCase(e.eventTypeName))));
    return sealedValue
}
function encodeTypeAliases(typeVariables: TypeVariables): protobuf.Type[] {

    return []
}

function payloadTypeToFieldTriples(payloadType: PayloadType): FieldTriple[] {
    switch (payloadType.type) {
        case TYPEINFO_TYPES.OBJECT:
            return payloadType.properties.map(([fieldName, typeInfo], index) => typeInfoToField(typeInfo, fieldName, index))
        case TYPEINFO_TYPES.UNION:
            throw Error("Not implemented")
    }
}


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

function typeInfoToField(typeInfo: TypeInfo, fieldName: string, fieldNumber: number): FieldTriple {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.BOOLEAN:
        case TYPEINFO_TYPES.NUMBER:
        case TYPEINFO_TYPES.STRING:
        case TYPEINFO_TYPES.REFERENCE:
            const protoBufType = resolveSimpleType(typeInfo)
            if (isSome(protoBufType)) {
                return { fieldName: fieldName, fieldNumber: fieldNumber, fieldType: protoBufType.value }
            }
            break
        case TYPEINFO_TYPES.ARRAY: // Right now only arrays of bools, numbers strings or typealias are allowed as element types of arrays.
            const elementProtoBufType = resolveSimpleType(typeInfo.elementType)
            if (isSome(elementProtoBufType)) {
                return { fieldName: fieldName, fieldNumber: fieldNumber, fieldType: elementProtoBufType.value, rule: PROTOBUF_NAMES.REPEATED }
            }
            break
    }

    throw Error("Not implemented")
}

function encodeEventToProtoBuf(event: Event, extra: FieldTriple[] = []): protobuf.Type[] {
    const msgType = new protobuf.Type(event.eventTypeName)
    const fields = event.eventKind === TYPEINFO_NAMES.WITH_PAYLOAD ? payloadTypeToFieldTriples(event.payloadType) : []
    addFields(msgType, fields)
    addFields(msgType, extra, fields.length)
    return [msgType]
}

function genMsgType(msgTypeName: string, fields: FieldTriple[]): protobuf.Type {
    const msgType = new protobuf.Type(msgTypeName)

    //fields.map((field, index) => field.fieldNumber ? genField(field) : genField(field, index))
    for (const [index, field] of fields.entries()) {
        msgType.add(new protobuf.Field(field.fieldName, field.fieldNumber ?? index + 1, getFieldType(field), field.rule))
    }

    return msgType
}

function addFields(msgType: protobuf.Type, fields: FieldTriple[], offset = 0) {
    for (const [index, field] of fields.entries()) {
        msgType.add(new protobuf.Field(field.fieldName, field.fieldNumber ?? offset + index + 1, getFieldType(field), field.rule))
    }
}

function genField(field: FieldTriple, fieldNumber = 0): protobuf.Field {
    return new protobuf.Field(field.fieldName, field.fieldNumber ?? fieldNumber, getFieldType(field), field.rule)
}

function addMessagesToNamespace(namespace: protobuf.Namespace, msgTypes: protobuf.Type[]) {
    for (const msgType of msgTypes) {
        namespace.add(msgType)
    }
}

/*
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
export function encodeMeta(): protobuf.Type {
    const msgTypeName = PROTOBUF_FIELD_TYPES.META
    const fields: FieldTriple[] = [
        { fieldName: META_NAMES.IS_LOCAL_EVENT, fieldNumber: 1, fieldType: PROTOBUF_FIELD_TYPES.BOOL },
        { fieldName: META_NAMES.TAGS, fieldNumber: 2, fieldType: PROTOBUF_FIELD_TYPES.STRING, rule: PROTOBUF_NAMES.REPEATED },
        { fieldName: META_NAMES.TIMESTAMP_MICROS, fieldNumber: 3, fieldType: PROTOBUF_FIELD_TYPES.UINT64 },
        { fieldName: META_NAMES.LAMPORT, fieldNumber: 4, fieldType: PROTOBUF_FIELD_TYPES.UINT32 },
        { fieldName: META_NAMES.APP_ID, fieldNumber: 5, fieldType: PROTOBUF_FIELD_TYPES.STRING },
        { fieldName: META_NAMES.EVENT_ID, fieldNumber: 6, fieldType: PROTOBUF_FIELD_TYPES.STRING },
        { fieldName: META_NAMES.STREAM, fieldNumber: 7, fieldType: PROTOBUF_FIELD_TYPES.STRING },
        { fieldName: META_NAMES.OFFSET, fieldNumber: 8, fieldType: PROTOBUF_FIELD_TYPES.UINT32 }
    ]

    return genMsgType(msgTypeName, fields)
}