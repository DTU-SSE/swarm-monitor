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


    const commands = [
        [`run`, `start-steel-transport`],
        [`run`, `start-stamp`],
        [`run`, `start-body-assembler`],
        [`run`, `start-car-body-checker`],
        [`run`, `start-painter`],
        [`run`, `start-basic-transport`],
        [`run`, `start-smart-transport`],
        [`run`, `start-base-station`],
        [`run`, `start-engine-installer`],
        [`run`, `start-engine-checker`],
        [`run`, `start-warehouse`],
        [`run`, `start-wheel-installer`],
        [`run`, `start-wheel-checker`],
        [`run`, `start-window-installer`],
        [`run`, `start-window-checker`],
        [`run`, `start-quality-control`],
    ].map(array => array.concat([`--`, `-n`, `${displayName}`, `-i`, `${appId}`]));

    const processes: ReturnType<typeof execa>[] = [];

    // Spawn processes
    for (let i = 0; i < N; i++) {
        const p = execa(`npm`, commands[i % commands.length], {
            stdout: "ignore",
            stderr: "ignore",
        });

        processes.push(p);
    }
    console.log(`Spawned ${N} processes!`)

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