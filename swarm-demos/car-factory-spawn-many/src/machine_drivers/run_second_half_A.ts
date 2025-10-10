import { main as baseStationMain } from "./warehouse_protocol/base_station.js";
import { main as smartTransportMain } from "./warehouse_protocol/smart_transport.js";
import { main as basicTransportMain } from "./warehouse_protocol/basic_transport.js";
import { main as engineCheckerMain } from "./engine_installation_protocol/engine_checker.js";
import { main as wheelInstallerMain } from "./wheel_installation_protocol/wheel_installer.js";
import { main as wheelCheckerMain } from "./wheel_installation_protocol/wheel_checker.js";
import { main as windowInstallerMain } from "./window_installation_protocol/window_installer.js";
import { main as windowCheckerMain } from "./window_installation_protocol/window_checker.js";
import { main as qualityControlMain } from "./quality_control_protocol/quality_control.js";

import { runAsyncFunctionsA } from "./call_async_functions.js";

const mainFunctions = [
    baseStationMain,
    wheelInstallerMain,
    wheelCheckerMain,
    windowInstallerMain,
    windowCheckerMain,
    qualityControlMain,
    engineCheckerMain
]

runAsyncFunctionsA(mainFunctions, 8)