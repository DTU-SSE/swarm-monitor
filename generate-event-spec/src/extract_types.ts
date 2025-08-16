import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration } from "ts-morph";
import type { EventSpec } from "./types.js";
import { replacePrimitiveTypeAliases, typeNodeToPayloadType, typeNodeToTypeInfo, usedNames } from "./utils.js";

/*
    To run:
    npm run gen-protobuf -- --swarm-events=protocol.ts
*/

// Visitor interface
interface ASTVisitor {
  visitVariableDeclaration?(node: VariableDeclaration): void;
  visitTypeAliasDeclaration?(node: TypeAliasDeclaration): void;
  // Fallback for unhandled nodes
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
    default:
      visitor.visitNode?.(node);
  }

  node.forEachChild(child => traverse(child, visitor));
}

// Nice for debugging
function basicVisit(node: Node, prepend: string = '') {
  console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
  node.forEachChild(child => {
    basicVisit(child, prepend + '  * ');
  });
}

class CollectingVisitor implements ASTVisitor {
  eventSpec: EventSpec = { variables: new Map(), typeVariables: new Map(), events: [] };

  childWithKind(node: Node, kind: SyntaxKind): boolean {
    return node.getChildrenOfKind(kind).length > 0;
  }

  // Find child that is a TypeNode or undefined
  childTypeNode(node: Node): Node | undefined {
    return node.getChildren().find(child => Node.isTyped(child));
  }


  getEventTypeNameFromArgs(node: CallExpression): string {
    const args = node.getArguments();
    if (args && args.length > 0) {
      if (args[0]?.getKind() === SyntaxKind.StringLiteral) {
        return args[0]?.getText().replace(/['"]/g, '');
      } else if (args[0]?.getKind() === SyntaxKind.Identifier) { // const a = "a"; const b = a; const eventTypeName = b; ??? What happens
        if (this.eventSpec.variables.has(args[0]?.getText())) {
          return this.eventSpec.variables.get(args[0]?.getText().replace(/['"]/g, ''))!;
        }
      }
    }
    throw new Error(`Event type name not found in arguments of call expression: ${node.getText()}`);
  }

  // Extract event definitions from calls to MachineEvent.design(...)
  // Use basicVisit to see layout of ast, but thing is:
  // Either we have calls to MachineEvent.design(...) in which case the call is a property access expression with 'design' as the property name,
  // or the call is a property access with 'withPayload' or 'withoutPayload' as the property name, in this case the call to MachineEvent.design(...) is the first child of the property access expression.
  handleMachineEventDesign(node: CallExpression) {
    //basicVisit(node)
    if (this.childWithKind(node, SyntaxKind.PropertyAccessExpression)) {
      const propertyAccess = node.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      if (propertyAccess && propertyAccess.getExpression().getText().startsWith('MachineEvent')) {
        // Event definitions of the form: MachineEvent.design(...)
        if (propertyAccess.getName() === 'design') {
          const eventTypeName = this.getEventTypeNameFromArgs(node);
          this.eventSpec.events.push({ eventTypeName: eventTypeName, eventKind: 'withoutPayload' });

          // Event definitions of the form: MachineEvent.design(...).withPayload(...) and MachineEvent.design(...).withoutPayload(...)
        } else {
          if (this.childWithKind(propertyAccess, SyntaxKind.CallExpression)) {
            const callExpr = propertyAccess.getFirstChildByKind(SyntaxKind.CallExpression);
            if (callExpr) {
              const eventTypeName = this.getEventTypeNameFromArgs(callExpr);
              if (propertyAccess.getName() === 'withPayload') {
                const typeArgs = node.getTypeArguments();
                if (typeArgs.length === 0) {
                  throw new Error(`Call to MachineEvent.design(...).withPayload with no type arguments: ${node.getText()}`);
                }
                this.eventSpec.events.push({ eventTypeName: eventTypeName, eventKind: 'withPayload', payloadType: typeNodeToPayloadType(node.getTypeArguments()[0]!, this.eventSpec.typeVariables) });
              } else if (propertyAccess.getName() === 'withoutPayload') {
                this.eventSpec.events.push({ eventTypeName: eventTypeName, eventKind: 'withoutPayload' });
              }
            }
          }
        }
      }
    }
  }

  // Visit VariableDeclaration nodes to extract variable names and values
  // We do this to get all variables that may be used somewhere in event definitions
  // and to get the event definitoins themselves.
  visitVariableDeclaration(node: VariableDeclaration) {
    if (node.getInitializer()?.getKind() === SyntaxKind.StringLiteral) {
      this.eventSpec.variables.set(node.getName(), node.getInitializer()?.getText().slice(1, -1) || '');
    } else if (node.getInitializer()?.getKind() === SyntaxKind.Identifier) {
      const value = this.eventSpec.variables.get(node.getInitializer()?.getText() || '')
      if (value) {
        this.eventSpec.variables.set(node.getName(), value);
      } else {
        throw new Error(`Variable ${node.getName()} initializer is an identifier that does not have a value`);
      }
    } else if (node.getInitializer()?.getKind() === SyntaxKind.CallExpression && node.getInitializer()?.getText().startsWith('MachineEvent.design')) {
      this.handleMachineEventDesign(node.getInitializer() as CallExpression);
    }
  }

  visitTypeAliasDeclaration(node: TypeAliasDeclaration) {
    const typeNode = node.getTypeNode();
    if (typeNode) {
      this.eventSpec.typeVariables.set(node.getName(), typeNodeToTypeInfo(typeNode));
    } else {
      throw new Error(`Type alias ${node.getName()} does not have a type node`);
    }
  }

  // Returns a cleaned copy"
  //  type definitions not used in messages are removed,
  //  variables are replaced by their values if they have a primitive type -- nope consider relevance of this later then do
  //  fresh names are given to literal types -- nope these are inserted as is nested or they have an alias and become their own 'top-level' messages.
  cleanEventSpec(): EventSpec {
    //const eventSpec = replacePrimitiveTypeAliases(this.eventSpec)
    const eventSpec = this.eventSpec
    const namesInUse = usedNames(eventSpec)
    return {...eventSpec, typeVariables: new Map(Array.from(eventSpec.typeVariables.entries()).filter(([name, _]) => namesInUse.has(name)))}
  }

}

export function extractTypesFromFile(filePath: string): EventSpec {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);
  const visitor = new CollectingVisitor();
  traverse(sourceFile, visitor)

  return visitor.eventSpec;
}

export function extractTypesFromFileCleaned(filePath: string): EventSpec {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);
  const visitor = new CollectingVisitor();
  traverse(sourceFile, visitor)

  return visitor.cleanEventSpec();
}
