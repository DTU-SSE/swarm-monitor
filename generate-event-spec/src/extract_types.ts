import { Project, SyntaxKind, TypeAliasDeclaration, CallExpression, SourceFile } from "ts-morph";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';

/*
    To run:
    npm run gen-protobuf -- --swarm-events=protocol.ts
*/

// Types for the extracted event and type definitions
type TypeDef = {
  name: string,
  node: TypeAliasDeclaration,
};
type EventDef = {
  eventName: string,
  node: CallExpression,
  payloadType?: string, // Optional payload type for events
};

type EventSpec = {
  typeDefs: TypeDef[],
  eventDefs: EventDef[],
};

function getTypeAliases(sourceFile: SourceFile): TypeDef[] {
  // Store type alias nodes
  const typeDefs: TypeDef[] = [];
  sourceFile.getTypeAliases().forEach(typeAlias => {
    typeDefs.push({
      name: typeAlias.getName(),
      node: typeAlias,
    });
  });

  return typeDefs
}

function getEventDefinitions(sourceFile: SourceFile): EventDef[] {
  const eventDefs: EventDef[] = [];
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.CallExpression) {
      const callExpr = node.asKind(SyntaxKind.CallExpression);
      if (callExpr) {
        const exprText = callExpr.getExpression().getText();
        if (exprText.startsWith("MachineEvent.design")) {
          const arg = callExpr.getArguments()[0];
          console.log("Children of call expression: ", callExpr.getChildren().map(c => c.getText()).join(' '));
          console.log("Children of call expression: ", callExpr.getKindName());
          console.log()

          if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
            //console.log("hej " + arg.getText());
            let payloadType: string | undefined = undefined;
            const parent = callExpr.getParentIfKind(SyntaxKind.CallExpression);
            if (parent) {
              const parentExprText = parent.getExpression().getText();
              if (parentExprText.endsWith("withPayload")) {
                const typeArgs = parent.getTypeArguments();
                if (typeArgs.length > 0) {
                  payloadType = typeArgs[0]!.getText();
                }
              } else if (parentExprText.endsWith("withoutPayload")) {
                payloadType = undefined;
              }
              eventDefs.push({
                eventName: arg.getText().replace(/['"]/g, ""),
                node: parent,
                payloadType,
              });
            }
          }
        }
      }
    }
  });


  return eventDefs;
}

function extractTypesAndEvents(path: string): EventSpec {
  const project = new Project();

  const sourceFile = project.addSourceFileAtPath(path);

  return {
    typeDefs: getTypeAliases(sourceFile),
    eventDefs: getEventDefinitions(sourceFile),
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
    if (!fs.existsSync(argv.swarmEvents)) {
      throw new Error(`File not found: ${argv.swarmEvents}`);
    }
  //console.log(extractTypesAndEvents(argv.swarmEvents));

  // Print the extracted types and events
  const eventSpec = extractTypesAndEvents(argv.swarmEvents);
  console.log("Extracted Type Definitions:");
  eventSpec.typeDefs.forEach(typeDef => {
    console.log(`- ${typeDef.name}: ${typeDef.node.getStructure().type}`);
  });

  eventSpec.eventDefs.forEach(eventDef => {
    console.log(`- ${eventDef.eventName}: ${eventDef.node.getText()}`);
  });

}

main().catch(err => {
  console.error(err);
  process.exit(1);
})