import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { extractTypesFromFile, extractTypesFromFileCleaned } from './extract_types.js';
import { eventSpecToString } from './types.js';
import { eventSpecToProtoBuf } from './encode_protobuf.js';
import { generateProtoBufMsgDefs } from './protobuf_codegen.js';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('input', {
      alias: 'i',
      type: 'string',
      description: 'File containing Actyx event definitions.',

    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Name to give output .proto file.',
      default: 'output.proto'
    })
    .option('package-name', {
      alias: 'p',
      type: 'string',
      description: 'Name to give package containing message types.',
      default: 'myPackage'
    })
    .option('branch-tracking', {
      alias: 'b',
      type: 'boolean',
      description: 'Include last updating event field in message types.',
      default: false
    })
    .demandOption("input")
    .parseAsync();

  if (!argv.input) {
    throw new Error(`No file containing definition of Actyx event types given.`);
  }
  if (!fs.existsSync(argv.input)) {
    throw new Error(`File not found: ${argv.input}.`);
  }

  generateProtoBufMsgDefs(eventSpecToProtoBuf(argv.packageName, extractTypesFromFileCleaned(argv.input), argv.branchTracking), argv.output)
}

main().catch((err: Error) => {
  console.error(`${err.name}: ${err.message}`);
  process.exit(1);
})