import { Project, SourceFile, Node, SyntaxKind, ts, VariableDeclaration, CallExpression, PropertyAccessExpression, TypeAliasDeclaration } from "ts-morph";

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';

/*
    To run:
    npm run gen-protobuf -- --swarm-events=protocol.ts
*/

// Visitor interface
interface ASTVisitor {
  visitVariableDeclaration?(node: VariableDeclaration): void;
  visitTypeAliasDeclaration?(node: TypeAliasDeclaration): void;
  visitCallExpression?(node: CallExpression): void;
  visitPropertyAccessExpression?(node: PropertyAccessExpression): void;
  // fallback for unhandled nodes
  visitNode?(node: Node): void;
}

// Traversal function — calls specialized visit methods if available
function traverse(node: Node, visitor: ASTVisitor) {
  switch (node.getKind()) {
    case SyntaxKind.VariableDeclaration:
      visitor.visitVariableDeclaration?.(node as VariableDeclaration);
      break;
    case SyntaxKind.TypeAliasDeclaration:
      visitor.visitTypeAliasDeclaration?.(node as TypeAliasDeclaration);
      break;
    /* case SyntaxKind.CallExpression:
      visitor.visitCallExpression?.(node as CallExpression);
      break;
    case SyntaxKind.PropertyAccessExpression:
      visitor.visitPropertyAccessExpression?.(node as PropertyAccessExpression);
      break; */
    default:
      visitor.visitNode?.(node);
  }

  node.forEachChild(child => traverse(child, visitor));
}

// Data structures to hold extracted info
type Variables = Map<string, string>;
type Types = Map<string, string>; // Maps type names to their AST nodes
type EventWithoutPayload = { name: string; type: 'withoutPayload' };
type EventWithPayload = { name: string; type: 'withPayload'; payloadType: string };
type Event = EventWithoutPayload | EventWithPayload;

type ASTData = {
  variables: Variables;
  types: Types;
  events: Event[];
  calls: { functionName: string; args: string[] }[];
  propertyAccesses: { object: string; property: string }[];
}

function basicVisit(node: Node, prepend: string = '') {
  console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
  node.forEachChild(child => {
    basicVisit(child, prepend + '  *');
  });
}

function childrenHasKind(node: Node, kind: SyntaxKind): boolean {
  return node.getChildrenOfKind(kind).length > 0;
}

//function getEventTypeNamePayloadSpecified()

function getEventTypeName(node: CallExpression): string | undefined {
  const args = node.getArguments();
  if (args && args.length > 0) {
    return args[0]?.getText().replace(/['"]/g, '');
  }
}

function machineEventDesign(node: CallExpression) {
  if (childrenHasKind(node, SyntaxKind.PropertyAccessExpression)) {
    const propertyAccess = node.getFirstDescendantByKind(SyntaxKind.PropertyAccessExpression);
    if (propertyAccess) {
      if(propertyAccess.getExpression().getText() === 'MachineEvent' && propertyAccess.getName() === 'design') {
        const eventName = getEventTypeName(node);
        console.log(`Event Type: ${eventName}`);
      } else if (propertyAccess.getExpression().getText().startsWith('MachineEvent') && propertyAccess.getName() === 'withPayload') {
        if (childrenHasKind(node, SyntaxKind.CallExpression)) {
          const callExpr = node.getFirstDescendantByKind(SyntaxKind.CallExpression);
          if (callExpr) {
            const eventName = getEventTypeName(callExpr);
            console.log(`Event Type: ${eventName}`);
          }
        }
        if (childrenHasKind(node, SyntaxKind.TypeReference)) {
          const typeReference = node.getFirstDescendantByKind(SyntaxKind.TypeReference);
          if (typeReference) {
            const payloadType = typeReference.getText();
            console.log(`Payload Type: ${payloadType}`);
            // Here you can store the event with payload type
            // e.g., this.data.events.push({ name: eventName, type: 'withPayload', payloadType });
          }
        } else if (childrenHasKind(node, SyntaxKind.TypeLiteral)) {
          const typeLiteral = node.getFirstDescendantByKind(SyntaxKind.TypeLiteral);
          if (typeLiteral) {
            const payloadType = typeLiteral.getText();
            console.log(`Payload Type: ${payloadType}`);
            // Here you can store the event with payload type
            // e.g., this.data.events.push({ name: eventName, type: 'withPayload', payloadType });
          }
        }
      }
    }
  }

}


function visitCallAsInitializer(node: CallExpression) {
  console.log(`CallExpression: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
  basicVisit(node);
  machineEventDesign(node);
  /* for (const arg of node.getArguments()) {
    console.log(`Argument: ${arg.getText()}`);
  }
  node.forEachChild(child => {
    console.log(`Child: ${child.getText()} of kind ${SyntaxKind[child.getKind()]}`);
  }); */
}

class CollectingVisitor implements ASTVisitor {
  data: ASTData = { variables: new Map(), types: new Map(), events: [], calls: [], propertyAccesses: [] };

  visitVariableDeclaration(node: VariableDeclaration) {
    if (node.getInitializer()?.getKind() === SyntaxKind.StringLiteral) {
      this.data.variables.set(node.getName(), node.getInitializer()?.getText().slice(1, -1) || '');
    } else if (node.getInitializer()?.getKind() === SyntaxKind.Identifier) {
      const value = this.data.variables.get(node.getInitializer()?.getText() || '')
      if (value) {
        this.data.variables.set(node.getName(), value);
      } else {
        throw new Error(`Variable ${node.getName()} initializer is an identifier that does not have a value`);
      }
    } else if (node.getInitializer()?.getKind() === SyntaxKind.CallExpression && node.getInitializer()?.getText().startsWith('MachineEvent.design')) {
      //var callExpr = node.getInitializer()?.asKind(SyntaxKind.CallExpression);
      //console.log(callExpr?.getExpression().getText().startsWith('MachineEvent.design'))
      //console.log(callExpr?.getExpression().getText())
      //console.log(callExpr?.getText().startsWith('MachineEvent.design'))
      //console.log(callExpr?.getText())
      visitCallAsInitializer(node.getInitializer() as CallExpression);
      //console.log(`Variable ${node.getName()} initializer is a CallExpression: ${node.getInitializer()?.getText()}`);
    }
  }

  visitTypeAliasDeclaration(node: TypeAliasDeclaration) {
    const typeNode = node.getTypeNode();
    if (typeNode) {
      this.data.types.set(node.getName(), typeNode.getText());
    } else {
      throw new Error(`Type alias ${node.getName()} does not have a type node`);
    }

  }

  /* visitCallExpression(node: CallExpression) {
    const functionName = node.getExpression().getText();
    const args = node.getArguments().map(arg => arg.getText());
    this.data.calls.push({ functionName, args });
  }

  visitPropertyAccessExpression(node: PropertyAccessExpression) {
    this.data.propertyAccesses.push({
      object: node.getExpression().getText(),
      property: node.getName(),
    });
  } */
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

  const project = new Project();

  const sourceFile = project.addSourceFileAtPath(argv.swarmEvents);
  //const stringVs = getStringVariables(sourceFile)
  const visitor = new CollectingVisitor();
  traverse(sourceFile, visitor);

  console.log(visitor.data.variables)
  console.log(visitor.data.types);
  for (const call of visitor.data.calls) {
    console.log(`Function: ${call.functionName}, Args: ${call.args.join(', ')}`);
  }
  for (const access of visitor.data.propertyAccesses) {
    console.log(`Property Access: ${access.object}.${access.property}`);
  }

}

main().catch(err => {
  console.error(err);
  process.exit(1);
})

