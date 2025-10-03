import { execa } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

async function main() {
    // Parse args
    const argv = await yargs(hideBin(process.argv))
        .option("numProcesses", {
            alias: "n",
            type: "number",
            demandOption: true,
            describe: "Number of processes to spawn",
        })
        .option("choiceAorB", {
            alias: "c",
            type: "string",
            demandOption: true,
            describe: "Use async.queue() (a) with 8 concurrent workers or Promise.all() (b)"
        })
        .strict()
        .parse();

    const N = argv.numProcesses;
    let terminatedCount = 0;
    const displayName = `car-factory`
    const appId = `com.example.${displayName}`
    const first_half_a = "dist/src/machine_drivers/run_first_half_A.js"
    const second_half_a = "dist/src/machine_drivers/run_second_half_A.js"
    const first_half_b = "dist/src/machine_drivers/run_first_half_B.js"
    const second_half_b = "dist/src/machine_drivers/run_second_half_B.js"
    const commands = argv.choiceAorB === "a" ? [[first_half_a], [second_half_a]]
        : argv.choiceAorB === "b" ? [[first_half_b], [second_half_b]] : undefined
    if (!commands) { throw Error(`Invalid argument ${argv.choiceAorB} given`)}

    const processes: ReturnType<typeof execa>[] = [];
    // Each time we execute a command we start 8 machines

    const quotient = Math.floor(N / 8)
    // Spawn processes
    for (let i = 0; i < quotient; i++) {
        const p = execa(`node`, commands[i % commands.length], {
            stdout: "ignore",
            stderr: "ignore",
        });
        console.log(`Spawned process ${i * 8}`)

        processes.push(p);
    }

    // Update termination spinner as processes exit
    for (const p of processes) {
        p.then(() => {
            terminatedCount++;
            console.log(`Terminated count: ${terminatedCount * 8}`)
        }).catch((err) => {
            console.log(`Process failed: ${err}`);
        });
    }
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});