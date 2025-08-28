import { Actyx, ActyxEvent, EventSubscription } from '@actyx/sdk'
import { Events, manifest, Composition } from './protocol'
import { Event } from './generated/warehouse'
import * as dgram from "dgram";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';


/*
    To run:
    npm run start-forwarder-alt -- --address=10.197.104.210 --port=9999
*/

// Send a message to monitor
function forward(e: ActyxEvent<{type: string}>, socket: dgram.Socket) {
    const msg = to_protobuf(e)
    console.log("Sending: ", msg)
    socket.send(Event.toBinary(msg))
}

// Convert an event to a protobuf message
function to_protobuf(e: ActyxEvent<{type: string}>): Event {
    const {type, ...ePayload} = e.payload
    //const eee = {sealedValue: { one}}
    //const ee: Event = Event.fromJsonString(JSON.stringify(ePayload))
    return JSON.parse(`{"sealedValue": { "oneofKind": "${type}", "${type}": ${JSON.stringify({...ePayload, meta: e.meta})}}}`)
    /* switch (type) {
        case Events.partReq.type:
            const eee = `{"sealedValue": { "oneofKind": "${type}", "${type}": ${JSON.stringify({...ePayload, meta: e.meta})}}}`
            //console.log("one ", eee)
            //console.log("two ", {sealedValue: {oneofKind: "partReq", partReq: {...ePayload, meta: e.meta}}})
            console.log("one: ", JSON.parse(eee))
            console.log("two: ", {sealedValue: {oneofKind: "partReq", partReq: {...ePayload, meta: e.meta}}})
            //return Event.fromJsonString(eee)
            return JSON.parse(eee)//{sealedValue: {oneofKind: "partReq", partReq: {...ePayload, meta: e.meta}}}
        case Events.partOK.type:
            return {sealedValue: {oneofKind: "partOK", partOK: {...ePayload, meta: e.meta}}}
        case Events.pos.type:
            return {sealedValue: {oneofKind: "pos", pos: {...ePayload, meta: e.meta}}}
        case Events.closingTime.type:
            return {sealedValue: {oneofKind: "closingTime", closingTime: {...ePayload, meta: e.meta}}}
        default:
            throw new Error(`Unknown event type: ${type}`);
        } */
}


// Run the adapted machine
async function main() {
    const app = await Actyx.of(manifest)
    const tags = Composition.tagWithEntityId('warehouse')
    const eventSubscriptions: EventSubscription = {query: tags}
    const argv = await yargs(hideBin(process.argv))
        .option('address', {
            alias: 'a',
            type: 'string',
            description: 'Address to send to',
            default: 'localhost',
        })
        .option('port', {
            alias: 'p',
            type: 'number',
            description: 'Port to send to',
            default: 9999,
        })
        .parseAsync();

    // Define server address and port
    const HOST = `${argv.address}` // why this ${...}
    const PORT = argv.port;

    // Create a socket and connect to the server
    //const client = new net.Socket();
    const socket = dgram.createSocket("udp4");
    socket.connect(PORT, HOST, () => {
        console.log(`Connected to ${HOST}:${PORT}`);
    });

    // Handle connection close
    socket.on("close", () => {
        console.log("Connection closed");
    });

    // Handle errors
    socket.on("error", (err) => {
        console.error("Socket error:", err.message);
    });

    app.subscribe(eventSubscriptions, (e: ActyxEvent) => { forward(e as ActyxEvent<{type: string}>, socket) })
}

main()