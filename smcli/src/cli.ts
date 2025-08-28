#!/usr/bin/env node
import { Command } from 'commander';
import { ax2pb } from './ax2pb.js';
import { mkfwd } from './mk_fwd.js';
import { stopSpinner } from './spinner.js';

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
  stopSpinner()
  console.error(`${err.name}: ${err.message}`);
  process.exit(1);
})