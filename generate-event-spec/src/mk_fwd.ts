import { Command, Option } from "commander";
import path from "path";
import { FORWARDER_CONSTANTS } from "./constants.js";
import { generate_forwarder, getText, writeSourceFile } from "./gen_forwarder.js";

type Options = {
    output: string
    print: boolean
}

export const mkfwd = new Command("mkfwd")
    .description("Generate a program that joins an Actyx session forwarding all messages to some destination")
    .argument("<CONFIG_FILE>")
    .option("-o, --output <FILE>", "Output file (defaults to forwarder.ts)", FORWARDER_CONSTANTS.FORWARDER_FILE_NAME)
    .option("-p, --print", "Prints generated file to stdout without saving it", false)
    .action((configFile: string, options: Options) => {
        const generated = generate_forwarder(path.resolve(process.cwd(), configFile), options.output)
        if (options.print) {
            console.log(getText(generated, options.output))
        }
        writeSourceFile(generated, options.output)
    });