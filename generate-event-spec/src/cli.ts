import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { extractTypesFromFile } from './extract_types.js';
import { astDataToString } from './types.js';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('swarm-events', {
      alias: 'e',
      type: 'string',
      description: 'File path to the definition of the swarm events',
      default: 'protocol.ts',
    })
    .parseAsync();
    if (!fs.existsSync(argv.swarmEvents)) {
      throw new Error(`File not found: ${argv.swarmEvents}`);
    }

  const data = extractTypesFromFile(argv.swarmEvents);
  console.log(astDataToString(data, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
})