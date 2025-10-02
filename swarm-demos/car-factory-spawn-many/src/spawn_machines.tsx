/* import { execa } from "execa";
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
    let spawnedCount = 0;
    let terminatedCount = 0;

    const spawnSpinner = ora(`Spawned ${spawnedCount}/${N} processes`).start();
    const terminateSpinner = ora(`Terminated ${terminatedCount}/${N} processes`).start();
    const displayName = `car-factory`
    const appId = `com.example.${displayName}` */

/*
    DEMO_NAME="car-factory"
    displayName="${DEMO_NAME}-${1}"
    appId_PREFIX="com.example.${DEMO_NAME}."
    appId="${appId_PREFIX}${1}"
    START_STEEL_TRANSPORT=

*/
/*
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

        spawnedCount++;
        spawnSpinner.text = `Spawned ${spawnedCount}/${N} processes`;
    }

    // Update termination spinner as processes exit
    for (const p of processes) {
        p.then(() => {
            terminatedCount++;
            terminateSpinner.text = `Terminated ${terminatedCount}/${N} processes`;
            if (terminatedCount === N) {
                terminateSpinner.succeed(`All ${N} processes terminated`);
                spawnSpinner.succeed(`All ${N} processes spawned`);
            }
        }).catch((err) => {
            terminateSpinner.fail(`Process failed: ${err}`);
        });
    }
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
}); */

/* import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { execa } from "execa";
import { Listr } from "listr2";

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
    let spawnedCount = 0;
    let terminatedCount = 0;
    const displayName = `car-factory`
    const appId = `com.example.${displayName}`

    // Capture the terminated task so the spawn task can update it
    let terminatedTask: any;

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

    const tasks = new Listr(
        [
            {
                title: "Spawned processes",
                task: async (_, task) => {
                    // Create N processes
                    const processes = Array.from({ length: N }, (_, i) => {
                        const subprocess = execa(`npm`, commands[i % commands.length], {
                            stdout: "ignore",
                            stderr: "ignore",
                        });

                        // Increment spawned count
                        spawnedCount++;
                        task.output = `${spawnedCount}/${N}`;

                        // When it finishes, update the terminated spinner
                        subprocess.then(() => {
                            terminatedCount++;
                            if (terminatedTask) {
                                terminatedTask.output = `${terminatedCount}/${N}`;
                            }
                        });

                        return subprocess;
                    });

                    // Wait for all processes to finish
                    await Promise.all(processes);
                },
            },
            {
                title: "Terminated processes",
                task: async (_, task) => {
                    terminatedTask = task;
                    // Wait until all processes are finished (spawn task ensures this)
                },
            },
        ],
        {
            concurrent: true, // both spinners run together

        }
    );

    await tasks.run();
}

main().catch((err) => {
    console.error(err);
}); */

import React, { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { execa } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
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
const displayName = `car-factory`
const appId = `com.example.${displayName}`

const App: React.FC = () => {
    const { exit } = useApp();
    const [spawnedCount, setSpawnedCount] = useState(0);
    const [terminatedCount, setTerminatedCount] = useState(0);
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
    useEffect(() => {
        const processes = Array.from({ length: N }, (_, i) => {
            const subprocess = execa(`npm`, commands[i % commands.length], {
            stdout: "ignore",
            stderr: "ignore",
        });

            // Update spawned count immediately
            setSpawnedCount((prev) => prev + 1);

            // When finished, update terminated count
            subprocess.then(() => {
                setTerminatedCount((prev) => prev + 1);
            });

            return subprocess;
        });

        // Wait for all to finish
        Promise.all(processes).then(() => {
            // Give spinner some time to update
            setTimeout(() => {
                exit()
            }, 500)
        });
    }, []);

    return (
        <Box flexDirection="column">
            <Box>
                <Text>
                    {spawnedCount === N ? "✅" : <Spinner />} Spawned processes: {spawnedCount}/{N}
                </Text>
            </Box>
            <Box>
                <Text>
                    {terminatedCount === N ? "✅" : <Spinner />} Terminated processes: {terminatedCount}/{N}
                </Text>
            </Box>
        </Box>
    );
};

render(<App />);