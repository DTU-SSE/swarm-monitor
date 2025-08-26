#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { extractTypesFromFileCleaned } from './extract_types.js';
import { eventSpecToProtoBuf } from './encode_protobuf.js';
import { generateProtoBufMsgDefs } from './protobuf_codegen.js';
import { Command } from 'commander';
import { ax2pb } from './actyxToProtobuf.js';

// https://github.com/TerribleDev/example-ts-cli/blob/main/index.ts
const program = new Command()
program
  .name("smcli")
  .description("Tool for translating Actyx event definitions to Protocol Buffers and generating 'forwarders'.")
  .version("0.0.1", "--version", "output the current version")

program.addCommand(ax2pb)

async function main() {
  await program.parseAsync();
}

main()

/* type Options = {
    outputfile: string,
    package: string,
    isB: boolean
}
export const a = new Command("a <FILE>");

a
    .description("desc")
    .option("-o, --output <FILE>", "Output file ")
    .option("-p, --package-name <PACKAGE>", "(defaults to ;myPackage').", "myPackage")
    .option("-b, --bbbb", "bbb.", false)
    .action((file: string, options: Options) => f(file, options))

const program = new Command()
program
  .name("mycli")
  .description("Tool for ....")
  .version("0.0.1", "--version", "output the current version")

program.addCommand(a)

async function main() {
  await program.parseAsync();
}

main() */

/* async function main() {
  // Command line arguments
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
    .demandOption("input") // Input file must be passed
    .parseAsync();

  if (!argv.input) {
    throw new Error(`No file containing definition of Actyx event types given.`);
  }
  if (!fs.existsSync(argv.input)) {
    throw new Error(`File not found: ${argv.input}.`);
  }

  // Generate argv.output (defaults to output.proto) from argv.input
  generateProtoBufMsgDefs(eventSpecToProtoBuf(argv.packageName, extractTypesFromFileCleaned(argv.input), argv.branchTracking), argv.output)
}
*/
main().catch((err: Error) => {
  console.error(`${err.name}: ${err.message}`);
  process.exit(1);
})