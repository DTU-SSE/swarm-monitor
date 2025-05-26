import { Actyx } from '@actyx/sdk'
import { createMachineRunner } from '@actyx/machine-runner'
import { Events, manifest, Composition } from './protocol'
import { Msg } from './generated/warehouse'
// import * as net from "net";
import * as dgram from "dgram";

function send_message_protobuf(e: any, messageIDs: Set<string>, client: dgram.Socket) {
    //console.log(JSON.stringify(e, null, 2))
    const {type, ...ePayload} = e.payload
    if (!messageIDs.has(e.meta.eventId)) {
      messageIDs.add(e.meta.eventId)
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
}

// Define server address and port
const HOST = "localhost";
const PORT = 9999;

// Create a socket and connect to the server
//const client = new net.Socket();
const client = dgram.createSocket("udp4");
client.connect(PORT, HOST, () => {
    console.log(`Connected to ${HOST}:${PORT}`);
});

// Handle connection close
client.on("close", () => {
    console.log("Connection closed");
});

// Handle errors
client.on("error", (err) => {
    console.error("Socket error:", err.message);
});

const messageIDs: Set<string> = new Set()

// Using the machine runner DSL an implmentation of door in warehouse w.r.t. subs_warehouse is:
const forwarder = Composition.makeMachine('Forwarder')
export const s0 = forwarder.designEmpty('s0')
    .finish()

s0.react([Events.partReq], s0, (_, e) => { send_message_protobuf(e, messageIDs, client); return s0.make() })
s0.react([Events.partOK], s0, (_, e) => { send_message_protobuf(e, messageIDs, client); return s0.make() })
s0.react([Events.closingTime], s0, (_, e) => { send_message_protobuf(e, messageIDs, client); return s0.make() })
s0.react([Events.pos], s0, (_, e) => { send_message_protobuf(e, messageIDs, client); return s0.make() })


// Run the adapted machine
async function main() {
    const app = await Actyx.of(manifest)
    const tags = Composition.tagWithEntityId('warehouse')
    const machine = createMachineRunner(app, tags, s0, undefined)//, projectionInfo.branches, projectionInfo.specialEventTypes)

    for await (const state of machine) {
      console.log("Forwarder. State is:", state.type)
      if (state.payload !== undefined) {
        console.log("State payload is:", state.payload)
      }
      console.log()
    }
    app.dispose()
}

main()
