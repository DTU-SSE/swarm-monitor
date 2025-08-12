import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration, ArrayTypeNode, UnionTypeNode, TypeLiteralNode, TypeReferenceNode, PropertySignature } from "ts-morph";
import type { ASTData, PayloadType } from "./types.js";
import { typeNodeToTypeInfo } from "./typenode_to_typeinfo.js";
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

function basicVisit(node: Node, prepend: string = '') {
  console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
  node.forEachChild(child => {
    basicVisit(child, prepend + '  * ');
  });
}

class CollectingVisitor implements ASTVisitor {
  data: ASTData = { variables: new Map(), types: new Map(), events: [] };

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
      } else if (args[0]?.getKind() === SyntaxKind.Identifier) {
        if (this.data.variables.has(args[0]?.getText())) {
          return this.data.variables.get(args[0]?.getText().replace(/['"]/g, ''))!;
        }
      }
    }
    throw new Error(`Event type name not found in arguments of call expression: ${node.getText()}`);
  }

  handleEventWithPayload(node: CallExpression): PayloadType {
    if (this.childWithKind(node, SyntaxKind.TypeReference)) {
      const typeReference = node.getFirstChildByKind(SyntaxKind.TypeReference);
      if (typeReference) {
        const payloadType = typeReference.getText();
        return { typeAsString: payloadType, kind: 'typeReference' };
      }
    } else if (this.childWithKind(node, SyntaxKind.TypeLiteral)) {
      const typeLiteral = node.getFirstChildByKind(SyntaxKind.TypeLiteral);
      if (typeLiteral) {
        const payloadType = typeLiteral.getText();
        return { typeAsString: payloadType, kind: 'typeLiteral' };
      }
    }
    throw new Error(`Payload type not found in expression: ${node.getText()}`);
  }


  // Extract event definitions from calls to MachineEvent.design(...)
  // Use basicVisit to see layout of ast, but thing is:
  // Either we have calls to MachineEvent.design(...) in which case the call is a property access expression with 'design' as the property name,
  // or the call is a property access with 'withPayload' or 'withoutPayload' as the property name, in this case the call to MachineEvent.design(...) is the first child of the property access expression.
  handleMachineEventDesign(node: CallExpression) {
    if (this.childWithKind(node, SyntaxKind.PropertyAccessExpression)) {
      const propertyAccess = node.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      if (propertyAccess && propertyAccess.getExpression().getText().startsWith('MachineEvent')) {
        // Event definitions of the form: MachineEvent.design(...)
        if(propertyAccess.getName() === 'design') {
          const eventName = this.getEventTypeNameFromArgs(node);
          this.data.events.push({ name: eventName, eventKind: 'withoutPayload' });

        // Event definitions of the form: MachineEvent.design(...).withPayload(...) and MachineEvent.design(...).withoutPayload(...)
        } else {
          if (this.childWithKind(propertyAccess, SyntaxKind.CallExpression)) {
            const callExpr = propertyAccess.getFirstChildByKind(SyntaxKind.CallExpression);
            if (callExpr) {
              const eventName = this.getEventTypeNameFromArgs(callExpr);
              if (propertyAccess.getName() === 'withPayload') {
                //console.log(`Child that is typed: ${this.childTypeNode(node)?.getText()}`);
                //console.log(`Is call with type arguments: ${Node.isExpressionWithTypeArguments(node)}`);
                //console.log(`Is call with type arguments: ${Node.isExpressionWithTypeArguments(callExpr)}`);
                //console.log(`Is call with type arguments: ${Node.isExpressionWithTypeArguments(propertyAccess)}`);
                //console.log(`TypeArgs outer call node : ${node.getTypeArguments().map(t => t.getText()).join(', ')}`);
                //console.log(`TypeArgs call child of property: ${callExpr.getTypeArguments().map(t => t.getText()).join(', ')}`);
                //console.log(`TypeArgs: ${propertyAccess.getTypeArguments().map(t => t.getText()).join(', ')}`);
                //basicVisit(node, '  * '); // For debugging, can be removed later
                const typeArgs = node.getTypeArguments();
                if (typeArgs.length === 0) {
                  throw new Error(`Call to MachineEvent.design(...).withPayload with no type arguments: ${node.getText()}`);
                }
                this.data.events.push({ name: eventName, eventKind: 'withPayload', payloadType: typeNodeToTypeInfo(node.getTypeArguments()[0]!) });
              } else if (propertyAccess.getName() === 'withoutPayload') {
                this.data.events.push({ name: eventName, eventKind: 'withoutPayload' });
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
    }
  }
  // Function typenode to ...

  visitTypeAliasDeclaration(node: TypeAliasDeclaration) {
    const typeNode = node.getTypeNode();
    if (typeNode) {
      //console.log(`Found type alias: ${node.getName()} with type node: ${typeNode.getText()} :D`);
      if (typeNode.getKind() === SyntaxKind.TypeLiteral) {
        const hting = (typeNode as TypeLiteralNode).getMembers();
        hting.forEach(m => {
          // Type literal member: ${Object.keys(m)}
          //console.log(` Kind: ${m.getKindName()} thing: ${(m as PropertySignature).getType().getText()}`);
          //console.log(`thing: ${(m as PropertySignature).getType()}, ${(m as PropertySignature).getTypeNode()}`);
          //console.log()
        })
        //console.log(`Type alias ${node.getName()} is a type literal with members: ${hting.map(m => m.getText()).join(', ')}`);
        //console.log(`Type alias ${node.getName()} is a type literal`);
      } else if (typeNode.getKind() === SyntaxKind.TypeReference) {
        //console.log(`Type alias ${node.getName()} is a type reference`);
        const jfsl = (typeNode as TypeReferenceNode).getTypeName();
        //console.log(`Type reference name: ${jfsl.getText()}`);
        //console.log(`Type reference: ${jfsl}`);
      } else if (typeNode.getKind() === SyntaxKind.ArrayType) {
        //console.log(`Type alias ${node.getName()} is an array type`);
        // Handle array types specifically if needed
        //const elementType = typeNode.getFirstChildByKind(SyntaxKind.TypeReference);
        const elementType = (typeNode as ArrayTypeNode).getElementTypeNode();
        if (elementType) {
          //console.log(`Array type element: ${elementType.getText()}`);
          //this.data.types.set(node.getName(), `Array<${elementType.getText()}>`);
          //return;
        }
      } else if (typeNode.getKind() === SyntaxKind.UnionType) {
        //console.log(`Type alias ${node.getName()} is a union type`);
        const choices = (typeNode as UnionTypeNode).getTypeNodes().map(t => t.getText());
        //console.log(`Union type choices: ${choices.join(', ')}`);
      } else if (typeNode.getKind() === SyntaxKind.StringKeyword) {
        //console.log(`Type alias ${node.getName()} is a string type`);
      } else if (typeNode.getKind() === SyntaxKind.NumberKeyword) {
        //console.log(`Type alias ${node.getName()} is a number type`);
      } else if (typeNode.getKind() === SyntaxKind.BooleanKeyword) {
        //console.log(`Type alias ${node.getName()} is a boolean type`);
      } else {
        //console.log(`Type alias ${node.getName()} is of unknown kind: ${SyntaxKind[typeNode.getKind()]}`);
      }
      this.data.types.set(node.getName(), typeNodeToTypeInfo(typeNode));
    } else {
      throw new Error(`Type alias ${node.getName()} does not have a type node`);
    }
    console.log()
  }
}

export function extractTypesFromFile(filePath: string): ASTData {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);
  const visitor = new CollectingVisitor();
  traverse(sourceFile, visitor)

  return visitor.data;
}

