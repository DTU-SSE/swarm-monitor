import protobuf from 'protobufjs'
import type { EventSpec, Event } from './types.js';
import type { Root } from 'protobufjs';
import { PROTOBUF_FIELD_TYPES, PROTOBUF_NAMES, META_NAMES } from './constants.js'
import type { ProtobufFieldType } from './constants.js'

type FieldTriple = { fieldName: string, fieldNumber?: number, fieldType: ProtobufFieldType, rule?: typeof PROTOBUF_NAMES.REPEATED }

export function eventSpecToProtoBuf(name: string, eventSpec: EventSpec, branchTracking=false): Root {
    const root = new protobuf.Root()
    const namespace = root.define(name)

    const meta = encodeMeta()
    namespace.add(meta)

    // Consider if FieldTriple is a good idea at all. We want to encode recursively?? Is one more type necessary?
    const extra: FieldTriple[] = [{fieldName: 'meta', fieldType: 'Meta'}]
    if (branchTracking) { extra.push({fieldName: 'lbj', fieldType: 'string'}) }

    for (const event of eventSpec.events) {
        namespace.add(encodeEventToProtoBuf(event, extra))
    }

    namespace.add(topLevelEvent(eventSpec.events))

    return root
}

function topLevelEvent(events: Event[]): protobuf.Type {
    const sealedValue = new protobuf.Type(PROTOBUF_NAMES.TOP_LEVEL_EVENT_NAME)

    throw Error('Not implemented')
}

function encodeEventToProtoBuf(event: Event, extra: FieldTriple[]=[]): protobuf.Type {

    throw Error('Not implemented')
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
function genMsgType(msgTypeName: string, fields: FieldTriple[]): protobuf.Type {
    const msgType = new protobuf.Type(msgTypeName)

    //fields.map((field, index) => field.fieldNumber ? genField(field) : genField(field, index))
    for (const [index, field] of fields.entries()) {
        msgType.add(new protobuf.Field(field.fieldName, field.fieldNumber ?? index + 1, field.fieldType, field.rule))
    }

    return msgType
}

function genField(field: FieldTriple, fieldNumber=0): protobuf.Field {
    return new protobuf.Field(field.fieldName, field.fieldNumber ?? fieldNumber, field.fieldType, field.rule)
}

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