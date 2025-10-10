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