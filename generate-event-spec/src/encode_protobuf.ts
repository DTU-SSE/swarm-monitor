import * as protobuf from 'protobufjs'
import { writeFileSync, unlink } from 'fs';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import type { EventSpec, Event } from './types.js';
import type { Root } from 'protobufjs';

export function eventSpecToProtoBuf(name: string, eventSpec: EventSpec, branchTracking=false): Root {
    const root = new protobuf.Root()
    const namespace = root.define(name)

    encodeMeta(root)

    const extra = [{type: 'Meta', fieldName: 'meta'}]
    if (branchTracking) { extra.push({type: 'string', fieldName: 'lbj'}) }

    for (const event of eventSpec.events) {
        namespace.add(encodeEventToProtoBuf(event, extra))
    }

    namespace.add(topLevelEvent(eventSpec.events))

    return root
}

function topLevelEvent(events: Event[]): protobuf.Type {

    throw Error('Not implemented')
}

function encodeEventToProtoBuf(event: Event, extra: {type: string, fieldName: string}[]=[]): protobuf.Type {

    throw Error('Not implemented')
}

function encodeMeta(root: Root): protobuf.Type {

    throw Error('Not implemented')
}