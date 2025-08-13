import protobuf from 'protobufjs'
import type { EventSpec, Event } from './types.js';
import type { Root } from 'protobufjs';

type FieldTriple = { fieldName: string, fieldNumber: number, fieldType: string, rule?: (string|{ [k: string]: any }) }

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

function encodeMeta(): protobuf.Type {
    const msgTypeName = "Meta"
    const fields: FieldTriple[] = [
        {fieldName: "isLocalEvent", fieldNumber: 1, fieldType: "bool"}
    ]

    const message = new protobuf.Type("Meta")
        .add(new protobuf.Field("id", 1, "int32"))

    message.add(new protobuf.Field("name", 2, "string"))
        .add(new protobuf.Field("timestamp", 3, "int64"));
    throw Error('Not implemented')
}