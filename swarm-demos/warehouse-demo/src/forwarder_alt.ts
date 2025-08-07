import { Actyx, ActyxEvent, EventSubscription } from '@actyx/sdk'
import { Events, manifest, Composition } from './protocol'
import { Msg } from './generated/warehouse'
import * as dgram from "dgram";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';


/*
    To run:
    npm run start-forwarder-alt -- --address=10.197.104.210 --port=9999
*/
function send_message_protobuf(e: any, client: dgram.Socket) {
    //console.log(JSON.stringify(e, null, 2))
    const {type, ...ePayload} = e.payload
    console.log(e.meta)
    switch (type) {
    case Events.partReq.type:
        var msg: Msg = {kind: {oneofKind: "partReq", partReq: {...ePayload, meta: e.meta}}}
        console.log("Sending: ", msg)
        client.send(Msg.toBinary(msg))
        break
    case Events.partOK.type:
        var msg: Msg = {kind: {oneofKind: "partOK", partOK: {...ePayload, meta: e.meta}}}
        console.log("Sending: ", msg)
        client.send(Msg.toBinary(msg))
        break
    case Events.pos.type:
        var msg: Msg = {kind: {oneofKind: "pos", pos: {...ePayload, meta: e.meta}}}
        console.log("Sending: ", msg)
        client.send(Msg.toBinary(msg))
        break
    case Events.closingTime.type:
        var msg: Msg = {kind: {oneofKind: "closingTime", closingTime: {...ePayload, meta: e.meta}}}
        console.log("Sending: ", msg)
        client.send(Msg.toBinary(msg))
        break
    default:
        console.log("what")
    }
}

// Run the adapted machine
async function main() {
    const app = await Actyx.of(manifest)
    const tags = Composition.tagWithEntityId('warehouse')
    const eventSubscrptions: EventSubscription = {query: tags}
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
    const HOST = `${argv.address}`//"10.197.104.210"; //"localhost"//
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

    /* A machine uses subscribeMonotonic whose documentation (and some comment Actyx/blob/master/js/sdk/src/event-fns.ts) says:
        "Subscribe to a stream of events until this would go back in time.
        Instead of going back in time, receive a TimeTravelMsg and terminate the stream.""

      Instead for subscribe they say:
        "* Subscribe to all events fitting the `query` after `lowerBound`.
         *
         * The subscription goes on forever, until manually cancelled."

      subscribe: (query: EventSubscription, onEvent: (e: ActyxEvent) => Promise<void> | void, onError?: (err: unknown) => void) => CancelSubscription;

    export declare type EventSubscription = {
    **
     * Starting point for the query. Everything up-to-and-including `lowerBound` will be omitted from the result.
     * Defaults to empty map, which means no lower bound at all.
     * Sources not listed in the `lowerBound` will be delivered in full.
     *
    lowerBound?: OffsetMap;
    ** Statement to select specific events. Defaults to `allEvents`. *
    query?: Where<unknown>;
    };

    */
    app.subscribe(eventSubscrptions, (e: ActyxEvent) => { send_message_protobuf(e, socket)})
}

main()