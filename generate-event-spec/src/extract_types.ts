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
type EventWithoutPayload = { name: string; eventKind: 'withoutPayload' };
type PayloadType = { typeAsString: string; kind: 'typeReference' | 'typeLiteral' };
type EventWithPayload = { name: string; eventKind: 'withPayload'; payloadType: PayloadType };
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
    basicVisit(child, prepend + '  * ');
  });
}

class CollectingVisitor implements ASTVisitor {
  data: ASTData = { variables: new Map(), types: new Map(), events: [], calls: [], propertyAccesses: [] };

  childWithKind(node: Node, kind: SyntaxKind): boolean {
    return node.getChildrenOfKind(kind).length > 0;
  }


  getEventTypeNameFromArgs(node: CallExpression): string {
    const args = node.getArguments();
    if (args && args.length > 0) {
      if (args[0]?.getKind() === SyntaxKind.StringLiteral) {
        return args[0]?.getText().replace(/['"]/g, '');
      } else if (args[0]?.getKind() === SyntaxKind.Identifier) {
        if (this.data.variables.has(args[0]?.getText())) {
          return this.data.variables.get(args[0]?.getText().replace(/['"]/g, ''))!;
        }
      }
    }
    throw new Error(`Event type name not found in arguments of call expression: ${node.getText()}`);
  }

  handleEventWithPayload(node: CallExpression): PayloadType {
    console.log(`Handling event with payload in: ${node.getText()}`);
    if (this.childWithKind(node, SyntaxKind.TypeReference)) {
      const typeReference = node.getFirstChildByKind(SyntaxKind.TypeReference);
      if (typeReference) {
        const payloadType = typeReference.getText();
        console.log(`Payload Type: ${payloadType}`);
        return { typeAsString: payloadType, kind: 'typeReference' };
      }
    } else if (this.childWithKind(node, SyntaxKind.TypeLiteral)) {
      const typeLiteral = node.getFirstChildByKind(SyntaxKind.TypeLiteral);
      if (typeLiteral) {
        const payloadType = typeLiteral.getText();
        console.log(`Payload Type: ${payloadType}`);
        return { typeAsString: payloadType, kind: 'typeLiteral' };
      }
    }
    throw new Error(`Payload type not found in expression: ${node.getText()}`);
  }


  // Extract event definitions from calls to MachineEvent.design(...)
  handleMachineEventDesign(node: CallExpression) {
    if (this.childWithKind(node, SyntaxKind.PropertyAccessExpression)) {
      const propertyAccess = node.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      // Log object and property to console
      if (propertyAccess) {
        console.log(`Object: ${propertyAccess.getExpression().getText()}, Property: ${propertyAccess.getName()}`);
      }
      if (propertyAccess && propertyAccess.getExpression().getText().startsWith('MachineEvent')) {
        // Event definitions of the form: MachineEvent.design(...)
        if(propertyAccess.getName() === 'design') {
          const eventName = this.getEventTypeNameFromArgs(node);
          console.log(`Event Type: ${eventName}`);

          this.data.events.push({ name: eventName, eventKind: 'withoutPayload' });

        // Event definitions of the form: MachineEvent.design(...).withPayload(...) and MachineEvent.design(...).withoutPayload(...)
        } else {
          if (this.childWithKind(propertyAccess, SyntaxKind.CallExpression)) {
            const callExpr = propertyAccess.getFirstChildByKind(SyntaxKind.CallExpression);
            if (callExpr) {
              const eventName = this.getEventTypeNameFromArgs(callExpr);
              console.log(`Event Type: ${eventName}`);
              if (propertyAccess.getName() === 'withPayload') {
                this.data.events.push({ name: eventName, eventKind: 'withPayload', payloadType: this.handleEventWithPayload(node) });
              } else if (propertyAccess.getName() === 'withoutPayload') {
                this.data.events.push({ name: eventName, eventKind: 'withoutPayload' });
              }

            }
          }
        }
      }
    }

  }

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
      this.handleMachineEventDesign(node.getInitializer() as CallExpression);
      //basicVisit(node);
      console.log()
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
  console.log(visitor.data.events);

}

main().catch(err => {
  console.error(err);
  process.exit(1);
})

