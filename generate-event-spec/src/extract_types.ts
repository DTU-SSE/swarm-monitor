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
    case SyntaxKind.CallExpression:
      visitor.visitCallExpression?.(node as CallExpression);
      break;
    case SyntaxKind.PropertyAccessExpression:
      visitor.visitPropertyAccessExpression?.(node as PropertyAccessExpression);
      break;
    default:
      visitor.visitNode?.(node);
  }

  node.forEachChild(child => traverse(child, visitor));
}

// Data structures to hold extracted info
type Variables = Map<string, string>;
type Types = Map<string, string>; // Maps type names to their AST nodes
type ASTData = {
  variables: Variables;
  types: Types;
  calls: { functionName: string; args: string[] }[];
  propertyAccesses: { object: string; property: string }[];
}

class CollectingVisitor implements ASTVisitor {
  data: ASTData = { variables: new Map(), types: new Map(), calls: [], propertyAccesses: [] };

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

  visitCallExpression(node: CallExpression) {
    const functionName = node.getExpression().getText();
    const args = node.getArguments().map(arg => arg.getText());
    this.data.calls.push({ functionName, args });
  }

  visitPropertyAccessExpression(node: PropertyAccessExpression) {
    this.data.propertyAccesses.push({
      object: node.getExpression().getText(),
      property: node.getName(),
    });
  }
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
  console.log(visitor.data)

}

main().catch(err => {
  console.error(err);
  process.exit(1);
})

