#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { extractTypesFromFileCleaned } from './extract_types.js';
import { eventSpecToProtoBuf } from './encode_protobuf.js';
import { generateProtoBufMsgDefs } from './protobuf_codegen.js';
import { Command } from 'commander';
import { ax2pb } from './actyxToProtobuf.js';
import { mkfwd } from './mk_fwd.js';

// https://github.com/TerribleDev/example-ts-cli/blob/main/index.ts
const program = new Command()
program
  .name("smcli")
  .description("Tool for translating Actyx event definitions to Protocol Buffers and generating 'forwarders'.")
  .version("0.0.1", "--version", "output the current version")
  .addCommand(ax2pb)
  .addCommand(mkfwd)

async function main() {
  await program.parseAsync();
}

main().catch((err: Error) => {
  console.error(`${err.name}: ${err.message}`);
  process.exit(1);
})