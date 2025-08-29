import { Command } from "commander";
import { generateProtoBufMsgDefs } from "./lib/protobuf_codegen.js";
import { eventSpecToProtoBuf } from "./lib/encode_protobuf.js";
import { extractTypesFromFileCleaned } from "./lib/extract_types.js";
import path from "path";
import { spinnerSuccess, updateSpinnerText } from "./lib/spinner.js";
import { updatePackageJson } from "./lib/update_package_json.js";

type Options = {
    output: string,
    packageName: string,
    branchTracking: boolean,
    compile: string
}

export const ax2pb = new Command("ax2pb")
    .description("Translate an Actyx event definition to a Protocol Buffers message types.")
    .argument("<FILE>")
    .option("-o, --output <FILE>", "Output file.", "output.proto")
    .option("-p, --package-name <PACKAGE>", "Name to give package containing message types.", "myPackage")
    .option("-b, --branch-tracking", "Include last updating event field in message types.", false)
    .option("-c, --compile <PACKAGE.JSON FILE>", "Adds compilation of generated .proto to 'scripts' package.json")
    .action((file: string, options: Options) => {
        updateSpinnerText(`Generating ${options.output} from ${file}.`);
        generateProtoBufMsgDefs(eventSpecToProtoBuf(options.packageName, extractTypesFromFileCleaned(path.resolve(process.cwd(), file)), options.branchTracking), path.resolve(process.cwd(), options.output))
        if (options.compile) {
            updatePackageJson(path.resolve(process.cwd(), options.compile)) // maybe just pass a directory here, then find a package.json create the add the scripts, maybe assert that it is the directory with the protocol.ts
        }
        spinnerSuccess()
    })