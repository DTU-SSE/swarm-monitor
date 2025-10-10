import { execa } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import ora from "ora";

async function main() {
    // Parse args
    const argv = await yargs(hideBin(process.argv))
        .option("numProcesses", {
            alias: "n",
            type: "number",
            demandOption: true,
            describe: "Number of processes to spawn",
        })
        .strict()
        .parse();

    const N = argv.numProcesses;
    let terminatedCount = 0;
    const displayName = `car-factory`
    const appId = `com.example.${displayName}`
    const commandsAsObject = { "start-steel-transport": "dist/src/machine_drivers/steel_press_protocol/run_steel_transport.js",
    "start-stamp": "dist/src/machine_drivers/steel_press_protocol/run_stamp.js",
    "start-body-assembler": "dist/src/machine_drivers/steel_press_protocol/run_body_assembler.js",
    "start-car-body-checker": "dist/src/machine_drivers/steel_press_protocol/run_car_body_checker.js",
    "start-painter": "dist/src/machine_drivers/paint_shop_protocol/run_painter.js",
    "start-basic-transport": "dist/src/machine_drivers/warehouse_protocol/run_basic_transport.js",
    "start-smart-transport": "dist/src/machine_drivers/warehouse_protocol/run_smart_transport.js",
    "start-base-station": "dist/src/machine_drivers/warehouse_protocol/run_base_station.js",
    "start-engine-installer": "dist/src/machine_drivers/engine_installation_protocol/run_engine_installer.js",
    "start-engine-checker": "dist/src/machine_drivers/engine_installation_protocol/run_engine_checker.js",
    "start-warehouse": "dist/src/machine_drivers/engine_installation_protocol/run_warehouse.js",
    "start-wheel-installer": "dist/src/machine_drivers/wheel_installation_protocol/run_wheel_installer.js",
    "start-wheel-checker": "dist/src/machine_drivers/wheel_installation_protocol/run_wheel_checker.js",
    "start-window-installer": "dist/src/machine_drivers/window_installation_protocol/run_window_installer.js",
    "start-window-checker": "dist/src/machine_drivers/window_installation_protocol/run_window_checker.js",
    "start-quality-control": "dist/src/machine_drivers/quality_control_protocol/run_quality_control.js" }

    const commands = [
        [commandsAsObject["start-steel-transport"]],
        [commandsAsObject["start-stamp"]],
        [commandsAsObject["start-body-assembler"]],
        [commandsAsObject["start-car-body-checker"]],
        [commandsAsObject["start-painter"]],
        [commandsAsObject["start-basic-transport"]],
        [commandsAsObject["start-smart-transport"]],
        [commandsAsObject["start-base-station"]],
        [commandsAsObject["start-engine-installer"]],
        [commandsAsObject["start-engine-checker"]],
        [commandsAsObject["start-warehouse"]],
        [commandsAsObject["start-wheel-installer"]],
        [commandsAsObject["start-wheel-checker"]],
        [commandsAsObject["start-window-installer"]],
        [commandsAsObject["start-window-checker"]],
        [commandsAsObject["start-quality-control"]],
    ].map(array => array.concat([`--`, `-n`, `${displayName}`, `-i`, `${appId}`]));

    const processes: ReturnType<typeof execa>[] = [];

    // Spawn processes
    for (let i = 0; i < N; i++) {
        const p = execa(`node`, commands[i % commands.length], {
            stdout: "ignore",
            stderr: "ignore",
        });
        console.log(`Spawned process ${i}`)

        processes.push(p);
    }

    // Update termination spinner as processes exit
    for (const p of processes) {
        p.then(() => {
            terminatedCount++;
            console.log(`Terminated count: ${terminatedCount}`)
        }).catch((err) => {
            console.log(`Process failed: ${err}`);
        });
    }
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});