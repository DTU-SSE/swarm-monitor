import { Command } from "commander";
import path from "path";
import { FORWARDER_CONSTANTS } from "./lib/constants.js";
import { generateForwarder, generateForwarderProject, getText, updatePackageJsonFwd, writeSourceFile } from "./lib/gen_forwarder.js";
import { spinnerSuccess, updateSpinnerText } from "./lib/spinner.js";

type Options = {
    output: string
    print: boolean
}

export const mkfwd = new Command("mkfwd")
    .description("Generate a program that joins an Actyx session forwarding all messages to some destination.")
    .argument("<CONFIG_FILE>")
    .option("-o, --output <FILE>", "Output file.", FORWARDER_CONSTANTS.FORWARDER_FILE_NAME)
    .action((configFile: string, options: Options) => {
        updateSpinnerText(`Generating ${options.output}.`);
        generateForwarder(path.resolve(process.cwd(), configFile), options.output)
        spinnerSuccess()
    });