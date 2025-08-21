import protobuf from 'protobufjs'
import { type EventSpec, type Event, type FieldTriple, type MessageType, type TypeInfo, type TypeVariables, type PayloadType, type ArrayType, type Option, some, none, isNone, isSome, type ProtobufFieldType, getFieldType, getFieldType_ } from './types.js';
import type { Root } from 'protobufjs';
import { PROTOBUF_FIELD_TYPES, PROTOBUF_NAMES, META_NAMES, TYPEINFO_TYPES, TYPEINFO_NAMES } from './constants.js'
import snakeCase from 'lodash.snakecase'

type FieldGenerator = (fieldNumber: number) => protobuf.Field

export function eventSpecToProtoBuf(packageName: string, eventSpec: EventSpec, branchTracking = false): Root {
    const root = new protobuf.Root()
    const namespace = root.define(packageName)

    // Add meta as a message type
    const meta = metaMsgType()
    namespace.add(meta)

    // Encode the type definitions referred to by payload types
    addMessagesToNamespace(namespace, encodeTypeAliases(eventSpec.typeVariables))

    // Consider if FieldTriple is a good idea at all. We want to encode recursively?? Is one more type necessary?
    const extra: FieldGenerator[] = [metaField]
    if (branchTracking) { extra.push(lastUpField) }

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
        sealedValue.add(new protobuf.Field(snakeCase(event.eventTypeName), index + 1, event.eventTypeName)) // Field numbers start at 1
    }

    sealedValue.add(new protobuf.OneOf(PROTOBUF_NAMES.SEALED_VALUE, events.map(e => snakeCase(e.eventTypeName))));
    return sealedValue
}

function encodeTypeAliases(typeVariables: TypeVariables): protobuf.Type[] {
    const mapper = (typeName: string, typeInfo: PayloadType) => {
        return encodeEventToProtoBuf({eventTypeName: typeName, eventKind: TYPEINFO_NAMES.WITH_PAYLOAD, payloadType: typeInfo})
    }

    return Array.from(typeVariables)
        .filter(([_, typeInfo]) => typeInfo.type === TYPEINFO_TYPES.OBJECT)
        .flatMap(([typeName, typeInfo]) => mapper(typeName, typeInfo as PayloadType))
}

function payloadTypeToFields(payloadType: PayloadType): protobuf.ReflectionObject[] {
    switch (payloadType.type) {
        case TYPEINFO_TYPES.OBJECT:
            return payloadType.properties.map(([fieldName, typeInfo], index) => typeInfoToField(typeInfo, fieldName, index + 1)) // Field numbers start at 1
        case TYPEINFO_TYPES.UNION:
            throw Error("Encoding of union types is not implemented")
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
        // Right now only arrays of bools, numbers, strings or typealias are allowed as element types of arrays.
        case TYPEINFO_TYPES.ARRAY:
            const elementProtoBufType = resolveSimpleType(typeInfo.elementType)
            if (isSome(elementProtoBufType)) {
                return generateField(fieldName, fieldNumber, elementProtoBufType.value, PROTOBUF_NAMES.REPEATED)

            }
            break
        case TYPEINFO_TYPES.UNION:
            throw Error("Encoding of union types is not implemented") // sealed oneof
        case TYPEINFO_TYPES.OBJECT:
            const msgType = new protobuf.Type(fieldName)
            const encodedObject = payloadTypeToFields(typeInfo)
            addFields(msgType, encodedObject)
            return msgType
    }

    throw Error("Not implemented")
}

// Why is it we have an array here?
function encodeEventToProtoBuf(event: Event, extra: FieldGenerator[] = []): protobuf.Type[] {
    const msgType = new protobuf.Type(event.eventTypeName)
    const fields = event.eventKind === TYPEINFO_NAMES.WITH_PAYLOAD ? payloadTypeToFields(event.payloadType) : []
    addFields(msgType, fields.concat(extra.map((generateField, index) => generateField(fields.length + index + 1))))
    return [msgType]
}

function addFields(msgType: protobuf.Type, fields: protobuf.ReflectionObject[]) {
    for (const field of fields) {
        msgType.add(field)
    }
}

function generateField(fieldName: string, fieldNumber: number, fieldType: ProtobufFieldType, rule?: (string|{ [k: string]: any })): protobuf.Field {
    return new protobuf.Field(fieldName, fieldNumber, getFieldType_(fieldType), rule)
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

export const metaField = (fieldNumber: number): protobuf.Field => {
    return new protobuf.Field(META_NAMES.META_NAME_FIELD, fieldNumber, PROTOBUF_FIELD_TYPES.META)
}

export const lastUpField = (fieldNumber: number): protobuf.Field => {
    return new protobuf.Field(PROTOBUF_NAMES.LAST_UP, fieldNumber, PROTOBUF_FIELD_TYPES.STRING)
}