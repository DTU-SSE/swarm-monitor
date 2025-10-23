import { Command } from "commander";
import { generateProtoBufMsgDefs } from "./lib/protobuf_codegen.js";
import { eventSpecToProtoBuf } from "./lib/encode_protobuf.js";
import path from "path";
import { spinnerSuccess, updateSpinnerText } from "./lib/spinner.js";
import { setUpAutoCompile } from "./lib/set_up_proto_buf_compilation.js";
import { eventSpecificationCleaned } from "./lib/extract_types.js";
import { eventSpecToString } from "./lib/types.js";

type Options = {
    output: string,
    packageName: string,
    branchTracking: boolean,
    compile: boolean
}

export const ax2pb = new Command("ax2pb")
    .description("Translate an Actyx event definition to a Protocol Buffers message types.")
    .argument("<FILE>")
    .option("-o, --output <FILE>", "Output file.", "output.proto")
    .option("-p, --package-name <PACKAGE>", "Name to give package containing message types.", "myPackage")
    .option("-b, --branch-tracking", "Include last updating event field in message types.", false)
    .option("-c, --compile", "Adds compilation of generated .proto to 'scripts' package.json")
    .action((file: string, options: Options) => {
        updateSpinnerText(`Generating ${options.output} from ${file}.`);
        //const eventSpecNew = eventSpecification(path.resolve(process.cwd(), file))
        //console.log(eventSpecToString(eventSpecNew, null, 2))
        const eventSpec = eventSpecificationCleaned(path.resolve(process.cwd(), file))
        console.log(eventSpecToString(eventSpec, null, 2))
        const protoBufRoot = eventSpecToProtoBuf(options.packageName, eventSpec, options.branchTracking)
        generateProtoBufMsgDefs(protoBufRoot, path.resolve(process.cwd(), options.output))
        spinnerSuccess()
        if (options.compile) {
            updateSpinnerText(`Setting up compilation scripts.`);
            setUpAutoCompile(options.output)
            //updatePackageJson(path.resolve(process.cwd(), options.compile), updates) // maybe just pass a directory here, then find a package.json create the add the scripts, maybe assert that it is the directory with the protocol.ts
            spinnerSuccess()
        }

    })