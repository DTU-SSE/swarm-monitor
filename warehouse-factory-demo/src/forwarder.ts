import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT} from '@actyx/machine-runner'
import { Events, manifest, Composition, warehouse_factory_protocol, subs_composition, getRandomInt, warehouse_protocol, subs_warehouse, print_event } from './protocol'
import { checkComposedProjection, projectionAndInformation } from '@actyx/machine-check'
// import * as net from "net";
import * as dgram from "dgram";

function print_full_event(e: any) {
    print_event(e)
    //console.log(`received an event: ${JSON.stringify(e, null, 2)}`)
}

function send_message(e: any, client: dgram.Socket) {
    console.log("Forwarding message: ", e.payload)
    client.send(JSON.stringify(e.payload));
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

/* // Handle data received from server
client.on("data", (data) => {
    console.log("Received from server:", data.toString());
    client.end(); // Close the connection after receiving the response
}); */

// Handle connection close
client.on("close", () => {
    console.log("Connection closed");
});

// Handle errors
client.on("error", (err) => {
    console.error("Socket error:", err.message);
});

// Using the machine runner DSL an implmentation of door in warehouse w.r.t. subs_warehouse is:
const forwarder = Composition.makeMachine('Forwarder')
export const s0 = forwarder.designEmpty('s0')
    .finish()

s0.react([Events.partReq], s0, (_, e) => { send_message(e, client); return s0.make() })
s0.react([Events.partOK], s0, (_, e) => { send_message(e, client); return s0.make() })
s0.react([Events.closingTime], s0, (_, e) => { send_message(e, client); return s0.make() })
s0.react([Events.pos], s0, (_, e) => { send_message(e, client); return s0.make() })
s0.react([Events.car], s0, (_, e) => { send_message(e, client); return s0.make() })


// Unfortunately we need this here right now..... Another reason to refactor? Projection of warehouse || factory over D
const projectionInfoResult = projectionAndInformation(warehouse_factory_protocol, subs_composition, "Forwarder")
if (projectionInfoResult.type == 'ERROR') throw new Error('error getting projection')
const projectionInfo = projectionInfoResult.data

console.log(projectionInfo.branches)
console.log(projectionInfo.specialEventTypes)

// Run the adapted machine
async function main() {
    const app = await Actyx.of(manifest)
    const tags = Composition.tagWithEntityId('warehouse-factory')
    const machine = createMachineRunnerBT(app, tags, s0, undefined, projectionInfo.branches, projectionInfo.specialEventTypes)

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


/* client.connect(PORT, HOST, () => {
  console.log(`Connected to ${HOST}:${PORT}`);

  // Send messages one by one, every 1 second
  let index = 0;
  const interval = setInterval(() => {
    if (index < messages.length) {
      const msg = messages[index];
      console.log(`Sending: ${msg}`);
      client.write(msg + "\n"); // include newline if server expects it line-by-line
      index++;
    } else {
      clearInterval(interval);
      client.end(); // close connection after all messages sent
    }
  }, 1000);
});
 */
