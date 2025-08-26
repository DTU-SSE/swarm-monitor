import { Command } from "commander";
import { generateProtoBufMsgDefs } from "./protobuf_codegen.js";
import { eventSpecToProtoBuf } from "./encode_protobuf.js";
import { extractTypesFromFileCleaned } from "./extract_types.js";
import path from "path";

type Options = {
    output: string,
    packageName: string,
    branchTracking: boolean
}

export const ax2pb = new Command("ax2pb")
    .description("Translate an Actyx event definition to a Protocol Buffers message types")
    .argument("<FILE>")
    .option("-o, --output <FILE>", "Output file (defaults to output.proto)", "output.proto")
    .option("-p, --package-name <PACKAGE>", "Name to give package containing message types (defaults to ;myPackage').", "myPackage")
    .option("-b, --branch-tracking", "Include last updating event field in message types.", false)
    .action((file: string, options: Options) =>  generateProtoBufMsgDefs(eventSpecToProtoBuf(options.packageName, extractTypesFromFileCleaned(path.resolve(process.cwd(), file)), options.branchTracking), path.resolve(process.cwd(), options.output)))