import { Project, SyntaxKind } from "ts-morph";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

function extractTypesAndEvents(path: string): { typeDefs: Record<string, string>, eventNames: string[] } {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(path);

  // Extract all type definitions
  const typeDefs: Record<string, string> = {};
  sourceFile.getTypeAliases().forEach(typeAlias => {
    typeDefs[typeAlias.getName()] = typeAlias.getText();
  });

  // Extract all MachineEvent.design(...) event names
  const eventNames: string[] = [];
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.CallExpression) {
      const callExpr = node.asKind(SyntaxKind.CallExpression);
      if (callExpr) {
        const exprText = callExpr.getExpression().getText();
        if (exprText.startsWith("MachineEvent.design")) {
          const arg = callExpr.getArguments()[0];
          if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
            eventNames.push(arg.getText().replace(/['"]/g, ""));
          }
        }
      }
    }
  });

  // Return the extracted types and event names
  return {
    typeDefs,
    eventNames,
  };
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('swarm-events', {
      alias: 'e',
      type: 'string',
      description: 'File path to the definition of the swarm events',
      default: 'protocol.ts',
    })
    .parseAsync();
  console.log(extractTypesAndEvents(argv.swarmEvents));
}
// "../swarm-demos/warehouse-demo/src/protocol.ts"

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
})