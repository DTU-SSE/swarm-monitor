import { Command } from "commander";
import { generateProtoBufMsgDefs } from "./protobuf_codegen.js";
import { eventSpecToProtoBuf } from "./encode_protobuf.js";
import { extractTypesFromFileCleaned } from "./extract_types.js";
import path from "path";
//export const ax2pb = new Command("ax2pb");

type Options = {
    outputfile: string,
    package: string,
    isBranchTracking: boolean
}

export const ax2pb = new Command("ax2pb")
    .description("Translate an Actyx event definition to a Protocol Buffers message types")
    .argument("<FILE>")
    .option("-o, --output <FILE>", "Output file (defaults to output.proto)", "output.proto")
    .option("-p, --package-name <PACKAGE>", "Name to give package containing message types (defaults to ;myPackage').", "myPackage")
    .option("-b, --branch-tracking", "Include last updating event field in message types.", false)
    .action(async (file: string, options: Options) => { generateProtoBufMsgDefs(eventSpecToProtoBuf(options.package, extractTypesFromFileCleaned(path.resolve(file)), options.isBranchTracking), options.outputfile)})
//ax2pb.exe
    //console.log(file), console.log(typeof(file)), console.log(process.cwd()), console.log(path.resolve(process.cwd(), file))