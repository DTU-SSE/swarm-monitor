import { manifest, Composition, Events } from "./protocol.js";
import { Event } from "./generated/car_factory.js";
import { Actyx, ActyxEvent } from "@actyx/sdk";
import type { EventSubscription } from "@actyx/sdk";
import * as dgram from "dgram";
import * as net from "net";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import camelCase from "lodash.camelcase";

// UDP version
function forward(e: ActyxEvent<{type: string}>, socket: dgram.Socket) {
    const {type, ...ePayload} = e.payload
    const msg = JSON.parse(`{"sealedValue": { "oneofKind": "${camelCase(type)}", "${camelCase(type)}": ${JSON.stringify({...ePayload, meta: e.meta})}}}`)
    console.log("Sending: ", msg)
    socket.send(Event.toBinary(msg))
}

// TCP version sets up a new connection for EACH event...
/* function forward(e: ActyxEvent<{type: string}>, host: string, port: number) {
    const socket = new net.Socket();
    socket.connect(port, host, () => {
        const {type, ...ePayload} = e.payload
        const msg = JSON.parse(`{"sealedValue": { "oneofKind": "${camelCase(type)}", "${camelCase(type)}": ${JSON.stringify({...ePayload, meta: e.meta})}}}`)
        console.log("Sending: ", msg)
        socket.write(Event.toBinary(msg))
    });
    socket.on("close", () => {
        //console.log("Connection closed");
    });
    socket.on("error", (err) => {
        console.error(`Socket error: ${err.message}`);
    });
} */


async function main() {
    const argv = await yargs(hideBin(process.argv))
            .option("address", {
              alias: "a",
              type: "string",
              description: "Address to send to",
              default: "localhost",
            })
            .option("port", {
              alias: "p",
              type: "number",
              description: "Port to send to",
              default: 9999,
            })
            .parseAsync();
    const app = await Actyx.of(manifest);
    const tags = Composition.tagWithEntityId("car-factory-session1");
    const eventSubscriptions: EventSubscription = { query: tags };
    const HOST = `${argv.address}`;
    const PORT = argv.port;

    // UDP version
    const socket = dgram.createSocket("udp4");
    socket.connect(PORT, HOST, () => {
        console.log(`Connected to ${HOST}:${PORT}`);
    });
    socket.on("close", () => {
        console.log("Connection closed");
    });
    socket.on("error", (err) => {
        console.error(`Socket error: ${err.message}`);
    });

    app.subscribe(eventSubscriptions, (e: ActyxEvent) => {
        forward(e as ActyxEvent<{type: string}>, socket);
    });
}
main()
