import protobuf from 'protobufjs'
import type { EventSpec, Event, FieldTriple, MessageType, TypeInfo } from './types.js';
import type { Root } from 'protobufjs';
import { PROTOBUF_FIELD_TYPES, PROTOBUF_NAMES, META_NAMES, TYPEINFO_TYPES } from './constants.js'
import snakeCase from 'lodash.snakecase'

// Find better solution...
class FreshNameGenerator {
    static counter: number

    static freshName(): string {
        return `fresh_${FreshNameGenerator.counter++}`
    }
}

// Returns a cleaned copy -- type definitions not used in messages are removed, string variables are replaced by their values, and fresh names are given to literal types
function eventSpecToMessageType(): MessageType[] {


    throw Error
}

/* function eventToMessageType(event: Event, extra: FieldTriple[]=[], eventSpec: EventSpec): MessageType {

    if (event.eventKind === "withoutPayload") {
        return { messageName: event.eventTypeName, fields: extra }
    }

    return { messageName: event.eventTypeName, fields: payloadTypeToFields(event.payloadType).concat(extra) }
    throw Error
}

function payloadTypeToFields(typeInfo: TypeInfo, eventSpec: EventSpec) {
    switch (typeInfo.type) {
        case TYPEINFO_TNAMES.OBJECT: //
            return Array.from(typeInfo.properties.entries()).map(([fieldName, typeInfo], index) => typeInfoToField(fieldName, typeInfo, index))
        case TYPEINFO_TNAMES.REFERENCE:
            const objectType = resolveTypeReference(typeInfo.asString)
            return Array.from(typeInfo.properties.entries()).map(([fieldName, typeInfo], index) => typeInfoToField(fieldName, typeInfo, index))
        default:
            throw Error("Not implemented")

    }
} */

// I think we should narrow earlier because payload types are all of the form '{ [key: string]: SerializableValue; }'
// Can be unions of such...
// Maybe we should narrow when we typeNodeToTypeInfo, another function specifically for payload type...
/* function typeInfoToField(fieldName: string, typeInfo: TypeInfo, fieldNumber=1): FieldTriple {
    switch (typeInfo.type) {
        case TYPEINFO_TNAMES.OBJECT: //
            return

    }

    throw Error
} */

export function eventSpecToProtoBuf(packageName: string, eventSpec: EventSpec, branchTracking=false): Root {
    const root = new protobuf.Root()
    const namespace = root.define(packageName)

    const meta = encodeMeta()
    namespace.add(meta)

    // Consider if FieldTriple is a good idea at all. We want to encode recursively?? Is one more type necessary?
    const extra: FieldTriple[] = [{fieldName: META_NAMES.META_NAME_FIELD, fieldType: PROTOBUF_FIELD_TYPES.META}]
    if (branchTracking) { extra.push({fieldName: PROTOBUF_NAMES.LAST_UP, fieldType: PROTOBUF_FIELD_TYPES.STRING}) }

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
        sealedValue.add(new protobuf.Field(snakeCase(event.eventTypeName), index, event.eventTypeName))
    }

    sealedValue.add(new protobuf.OneOf(PROTOBUF_NAMES.SEALED_VALUE, events.map(e => snakeCase(e.eventTypeName))));
    return sealedValue
}

function encodeEventToProtoBuf(event: Event, extra: FieldTriple[]=[]): protobuf.Type {
    const msgType = new protobuf.Type(event.eventTypeName)
    //console.log(event)

    msgType.add(new protobuf.Field("a", 1, PROTOBUF_FIELD_TYPES.BOOL))
    addFields(msgType, extra, 1)
    msgType.add(new protobuf.Type("aaaa"))
    return msgType
}

function genMsgType(msgTypeName: string, fields: FieldTriple[]): protobuf.Type {
    const msgType = new protobuf.Type(msgTypeName)

    //fields.map((field, index) => field.fieldNumber ? genField(field) : genField(field, index))
    for (const [index, field] of fields.entries()) {
        msgType.add(new protobuf.Field(field.fieldName, field.fieldNumber ?? index + 1, field.fieldType, field.rule))
    }

    return msgType
}

function addFields(msgType: protobuf.Type, fields: FieldTriple[], offset=0) {
    for (const [index, field] of fields.entries()) {
        msgType.add(new protobuf.Field(field.fieldName, field.fieldNumber ?? offset + index + 1, field.fieldType, field.rule))
    }
}

function genField(field: FieldTriple, fieldNumber=0): protobuf.Field {
    return new protobuf.Field(field.fieldName, field.fieldNumber ?? fieldNumber, field.fieldType, field.rule)
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

/*
Type 'number' does not satisfy the constraint 'SerializableObject'.
  Type 'number' is not assignable to type '{ [key: string]: SerializableValue; }'.


  Type 'number[]' does not satisfy the constraint 'SerializableObject'.
  Type 'number[]' is not assignable to type '{ [key: string]: SerializableValue; }'.
    Index signature for type 'string' is missing in type 'number[]'.ts(2344)
*/