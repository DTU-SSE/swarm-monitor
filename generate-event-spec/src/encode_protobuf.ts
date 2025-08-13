import protobuf from 'protobufjs'
import type { EventSpec, Event } from './types.js';
import type { Root } from 'protobufjs';

type FieldTriple = { fieldName: string, fieldNumber: number, fieldType: FieldType, rule?: "repeated" }

type FieldType = "bool" | "string" | "int32" | "uint32" | "uint64"

export function eventSpecToProtoBuf(name: string, eventSpec: EventSpec, branchTracking=false): Root {
    const root = new protobuf.Root()
    const namespace = root.define(name)

    const meta = encodeMeta()
    namespace.add(meta)

    /*
    const extra = [{type: 'Meta', fieldName: 'meta'}]
    if (branchTracking) { extra.push({type: 'string', fieldName: 'lbj'}) }

    for (const event of eventSpec.events) {
        namespace.add(encodeEventToProtoBuf(event, extra))
    }

    namespace.add(topLevelEvent(eventSpec.events)) */

    return root
}

function topLevelEvent(events: Event[]): protobuf.Type {

    throw Error('Not implemented')
}

function encodeEventToProtoBuf(event: Event, extra: {type: string, fieldName: string}[]=[]): protobuf.Type {

    throw Error('Not implemented')
}

/*
    Always has the shape:
    message Meta {
        bool isLocalEvent = 1;
        repeated string tags = 2;
        uint64 timestampMicros = 3;
        uint32 lamport = 4;
        string appId = 5;
        string eventId = 6;
        string stream = 7;
        uint32 offset = 8;
    }
*/

function genMsgType(msgTypeName: string, fields: FieldTriple[]): protobuf.Type {
    const msgType = new protobuf.Type(msgTypeName)
    for (const field of fields) {
        msgType.add(new protobuf.Field(field.fieldName, field.fieldNumber, field.fieldType, field.rule))
    }

    return msgType
}

export function encodeMeta(): protobuf.Type {
    const msgTypeName = "Meta"
    const fields: FieldTriple[] = [
        {fieldName: "isLocalEvent", fieldNumber: 1, fieldType: "bool"},
        {fieldName: "tags", fieldNumber: 2, fieldType: "string", rule: "repeated"},
        {fieldName: "timestampMicros", fieldNumber: 3, fieldType: "uint64"},
        {fieldName: "lamport", fieldNumber: 4, fieldType: "uint32"},
        {fieldName: "appId", fieldNumber: 5, fieldType: "string"},
        {fieldName: "eventId", fieldNumber: 6, fieldType: "string"},
        {fieldName: "stream", fieldNumber: 7, fieldType: "string"},
        {fieldName: "offset", fieldNumber: 8, fieldType: "uint32"}
    ]

    return genMsgType(msgTypeName, fields)
}