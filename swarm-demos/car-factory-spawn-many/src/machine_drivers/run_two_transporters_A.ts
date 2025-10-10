import { main as smartTransportMain } from "./warehouse_protocol/smart_transport.js";
import { main as basicTransportMain } from "./warehouse_protocol/basic_transport.js";

import { runAsyncFunctionsA } from "./call_async_functions.js";

const mainFunctions = [
    smartTransportMain,
    basicTransportMain,
]

runAsyncFunctionsA(mainFunctions, 2)


/*

1010 machines

2025-10-03T12:39:45.370322Z ERROR hyper::server::tcp: accept error: No file descriptors available (os error 24)
2025-10-03T12:39:45.763496Z ERROR ax_core::node::node_api: SwarmEvent::ListenerError No file descriptors available (os error 24)
2025-10-03T12:39:45.863630Z ERROR ax_core::node::node_api: SwarmEvent::ListenerError No file descriptors available (os error 24)
2025-10-03T12:39:45.963738Z ERROR ax_core::node::node_api: SwarmEvent::ListenerError No file descriptors available (os error 24)
2025-10-03T12:39:46.063890Z ERROR ax_core::node::node_api: SwarmEvent::ListenerError No file descriptors available (os error 24)
2025-10-03T12:39:46.406193Z ERROR hyper::server::tcp: accept error: No file descriptors available (os error 24)

*/
