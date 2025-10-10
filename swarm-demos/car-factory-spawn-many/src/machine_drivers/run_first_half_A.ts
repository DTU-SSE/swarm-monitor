import { main as steelTransportMain } from "./steel_press_protocol/steel_transport.js";
import { main as stampMain } from "./steel_press_protocol/stamp.js";
import { main as bodyAssemblerMain } from "./steel_press_protocol/body_assembler.js";
import { main as carBodyChecker } from "./steel_press_protocol/car_body_checker.js";
import { main as painterMain } from "./paint_shop_protocol/painter.js";
import { main as engineInstallerMain } from "./engine_installation_protocol/engine_installer.js";
import { main as warehouseMain } from "./engine_installation_protocol/warehouse.js";
import { runAsyncFunctionsA } from "./call_async_functions.js";

const mainFunctions = [
    steelTransportMain,
    stampMain,
    bodyAssemblerMain,
    carBodyChecker,
    painterMain,
    engineInstallerMain,
    warehouseMain
]

runAsyncFunctionsA(mainFunctions, 8)