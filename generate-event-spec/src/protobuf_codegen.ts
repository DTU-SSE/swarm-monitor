import protobuf from "protobufjs";
import { writeFileSync, promises } from "fs";
import { randomUUID } from "crypto";
import pbjs from "protobufjs-cli/pbjs.js";


async function removeFile(path: string): Promise<void> {
    try {
        await promises.unlink(path);
    } catch (error) {
        throw error
    }
}

// Writes a .proto file from given file that should contain a json object generated with root.toJSON.
async function protoFromJsonFile(inputPath: string, outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    pbjs.main(
      [
        "--from", "json",       // file at inputPath is json
        inputPath,              // input file
        "--target", "proto3",   // emit proto3 syntax
        "--out", outputPath,    // output file
      ],
      (err: Error | null) => err ? reject(err) : resolve()
    );
  });
}

// Generate a .proto file by turning a protobuf.Root into a json file
// and transforming that into a .proto using pbjs. Somewhat hacky. Removes the json file afterwards.
export async function generateProtoBufMsgDefs(root: protobuf.Root, outputFile="output.proto"): Promise<void> {
    const outputPathSplit = outputFile.split('/').slice(0, -1)
    const outputDir = outputPathSplit.length == 0 ? "./" : `${outputPathSplit.join('/')}/`
    const tempJsonPath = `${outputDir}proto-${randomUUID()}.json`;
    writeFileSync(tempJsonPath, JSON.stringify(root.toJSON())); // .replaceAll("proto2", "proto3") consider?
    try {
        await protoFromJsonFile(tempJsonPath, `${outputFile}`);
    } catch(error) {
        throw error
    } finally {
        await removeFile(tempJsonPath)
    }
}