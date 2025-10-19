import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration, SourceFile } from "ts-morph";
import * as tsMorph from "ts-morph"
import { getValue, isSome, none, serializeTypeInfo, some, type EventSpec, type Option, type PayloadType, type PropertyInfo, type TypeInfo, type TypeVariables, type Event, serializeEventSpec } from "./types.js";
import { isPayloadType, replacePrimitiveTypeVarsEventSpec, typeNodeToPayloadType, typeNodeToTypeInfo, usedNames } from "./utils.js";
import { TYPEINFO_NAMES, TYPEINFO_TYPES, MACHINE_RUNNER_NAMES } from "./constants.js";

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

const typeToTypeInfo = (t: tsMorph.Type, typeNames: Set<string>): TypeInfo => {
  const inner = (t: tsMorph.Type, visited: Set<string>): TypeInfo => {
    if (visited.has(t.getText())) {
      return { type: TYPEINFO_TYPES.REFERENCE, asString: t.getText() }
    }

    if (t.isArray()) {
      return { type: TYPEINFO_TYPES.ARRAY, asString: t.getText(), elementType: inner(t.getArrayElementTypeOrThrow(), visited) }
    }

    // We lose some information here. type t = true, will be represented as a boolean and not the narrower literal true, only differ in asString.
    // We do this because a union myUnion = boolean | number gets expanded as true | false | number
    if (t.isBoolean() || t.isBooleanLiteral()) {
      return { type: TYPEINFO_TYPES.BOOLEAN, asString: t.getText() }
    }

    if (t.isNumber() || t.isNumberLiteral()) {
      return { type: TYPEINFO_TYPES.NUMBER, asString: t.getText() }
    }

    if (t.isObject()) {
      visited.add(t.getText())
      const mapper = (symbol: tsMorph.Symbol):  PropertyInfo => {
        const valueDeclarationType = symbol.getValueDeclaration()?.getType()
        return valueDeclarationType && typeNames.has(valueDeclarationType.getText())
          ? { propertyName: symbol.getName(), propertyType: { type: TYPEINFO_TYPES.REFERENCE, asString: valueDeclarationType.getText() }}
          : { propertyName: symbol.getName(), propertyType: inner(symbol.getValueDeclaration()?.getType() ?? symbol.getDeclaredType(), visited)}
      }
      return { type: TYPEINFO_TYPES.OBJECT1, asString: t.getText(), properties: t.getProperties().map(mapper)}
    }

    if (t.isString() || t.isStringLiteral()) {
      return { type: TYPEINFO_TYPES.STRING, asString: t.getText() }
    }

    if (t.isUnion()) {
      // We should check for use of type alias here as well. Like we do for object properties
      const mapper = (unionTypeMember: tsMorph.Type): TypeInfo => { 
        return typeNames.has(unionTypeMember.getText()) 
          ? { type: TYPEINFO_TYPES.REFERENCE, asString: unionTypeMember.getText() }
          : inner(unionTypeMember, visited) 
        }
      let members = t.getUnionTypes().map(mapper)

      // We do this because a union myUnion = boolean | number gets expanded as true | false | number
      // Consider doing this in boolean instead if boolean literal replace asString with TYPEINFO_TYPES.BOOLEAN
      const predicateTrueLiteral = (typeInfo: TypeInfo): boolean => typeInfo.type == TYPEINFO_TYPES.BOOLEAN && typeInfo.asString == "true"
      const predicateFalseLiteral = (typeInfo: TypeInfo): boolean => typeInfo.type == TYPEINFO_TYPES.BOOLEAN && typeInfo.asString == "false"
      if (members.some(predicateTrueLiteral) && members.some(predicateFalseLiteral)) {
        members = members.filter(t => !(predicateTrueLiteral(t) || predicateFalseLiteral(t)))
        members.push({ type: TYPEINFO_TYPES.BOOLEAN, asString: TYPEINFO_TYPES.BOOLEAN })
      }
      return { type: TYPEINFO_TYPES.UNION, asString: t.getText(), members: members}
    }
    // TODO: remaining cases: e.g. tuples, intersections. Consider using options to not crash when encountering something not implemented
    // But if this is not handled throughout then we just postpone the crash a little bit.
    throw Error(`Support for ${t.getText()} not implemented`)
  }

  return inner(t, new Set())
}

// Visit all type variable declarations and create a map from names to TypeInfos
// Use the slower getType() version that uses the Projects (instantiated in eventSpecification and containing sourcefile) typechecker
// Slower than looking at TypeNodes but still.
const visitTypeAliasDeclarations = (sourceFile: SourceFile): TypeVariables => {
  // Use the set of names to not expand nested types. E.g. type a = { f1: number }; type b = { f2: a }.
  // We do not want to expand the type a in the type b.
  // This is by design, we may be able to resuse message types later on like this.
  const typeNames = new Set(
      sourceFile
      .getTypeAliases()
      .map(typeAliasDeclaration => typeAliasDeclaration.getName())
  )
  const thing = new Map(
      sourceFile
      .getTypeAliases()
      .map(typeAliasDeclaration =>
        //[typeAliasDeclaration.getName(), typeNodeToTypeInfo(typeAliasDeclaration.getTypeNode()!)] // faster version
        [typeAliasDeclaration.getName(), typeToTypeInfo(typeAliasDeclaration.getType(), typeNames)]
      )
    )
  /* const typeVarsInitial: Map<string, Option<TypeInfo>> = new Map(
    sourceFile
    .getTypeAliases()
    .map(typeAliasDeclaration => [typeAliasDeclaration.getName(), none])
    )
  const thing1 = sourceFile
    .getTypeAliases()
    .reduce(
      (typeVars, typeDeclaration) =>  typeVars.set(typeDeclaration.getName(), some()),
      typeVarsInitial
    ) */
  return thing
}

// Get all variable declarations and try to parse them as MachineEvents.
const visitVariableDeclarations = (sourceFile: SourceFile, typeVariables: TypeVariables): Event[] => {
  return sourceFile
    .getVariableDeclarations()
    .concat(sourceFile
      .getDescendantsOfKind(SyntaxKind.ModuleDeclaration)
      .flatMap(m => m.getVariableDeclarations()))
    .map(variableDeclaration => machineEventDefinition(variableDeclaration, typeVariables, new Set(typeVariables.keys())))
    .filter(o => isSome(o))
    .map(o => getValue(o))
}

const machineEventDefinition = (node: VariableDeclaration, typeVariables: TypeVariables, typeNames: Set<string>): Option<Event> => {
  const initializer = node.getInitializer()
  if (initializer) {
    const maybeEventType = extractEventTypeFromDesign(initializer)
    if (isSome(maybeEventType)) {
      const optionPayloadType = extractPayloadTypeFromDesign(initializer, typeVariables, typeNames)
      const eventTypeName = getEventTypeName(getValue(maybeEventType))
      return isSome(optionPayloadType)
        ? some({ eventTypeName: eventTypeName, eventKind: TYPEINFO_NAMES.WITH_PAYLOAD, payloadType: getValue(optionPayloadType) })
        : some({ eventTypeName: eventTypeName, eventKind: TYPEINFO_NAMES.WITHOUT_PAYLOAD })
    }
  }
  return none
}

// Events are defined using MachineEvent.design('event type')...
// Extract 'event type'
const getEventTypeName = (node: Node): string => {
  // TODO: other cases e.g. property access?
  if (node.getKind() === SyntaxKind.StringLiteral) {
    return node.getText().replace(/['"]/g, '')
  } else if (node.getKind() === SyntaxKind.Identifier) {
    const optionDefinitionNode = definitionNodeInfo(node)
    if (isSome(optionDefinitionNode)) {
      const initializer = (getValue(optionDefinitionNode).definitionNode as VariableDeclaration).getInitializer()
      if (initializer) {
        return getEventTypeName(initializer)
      }
    }
  }
  throw new Error(`Event type name not found in arguments of call expression: ${node.getText()}`);
}

type DefinitionNodeInfo = { sourceFile: string, definitionNodeText: string, definitionNode: Node }

function isEventDefinition(nodeInfo: DefinitionNodeInfo): boolean {
  return (nodeInfo.sourceFile.endsWith(MACHINE_RUNNER_NAMES.EVENT_D_TS)
    && MACHINE_RUNNER_NAMES.EVENT_DEFINITION_FUNCTIONS.some(eventDefFunction => eventDefFunction === nodeInfo.definitionNodeText))
}

function isEventDesign(nodeInfo: DefinitionNodeInfo): boolean {
  return nodeInfo.sourceFile.endsWith(MACHINE_RUNNER_NAMES.EVENT_D_TS)
    && nodeInfo.definitionNodeText === MACHINE_RUNNER_NAMES.EVENT_DESIGN_FUNCTION
}

// Assumes one definition
const definitionNodeInfo = (node: Node): Option<DefinitionNodeInfo> => {
    switch (node.getKind()) {
        case SyntaxKind.PropertyAccessExpression:
            const definitionNodesProperty = (node as tsMorph.PropertyAccessExpression).getNameNode().getDefinitionNodes()
            if (definitionNodesProperty.length > 0) {
                // Assume just one definition
                const definitionNode = definitionNodesProperty[0]
                return definitionNode
                  ? some({ sourceFile: definitionNode.getSourceFile().getFilePath(), definitionNodeText: definitionNode.getText(), definitionNode })
                  : none
            }
            return none
        case SyntaxKind.Identifier:
            const definitionNodesIdentifier = (node as tsMorph.Identifier).getDefinitionNodes()
            if (definitionNodesIdentifier.length > 0) {
                // Assume just one definition
                const definitionNode = definitionNodesIdentifier[0]
                return definitionNode
                  ? some({ sourceFile: definitionNode.getSourceFile().getFilePath(), definitionNodeText: definitionNode.getText(), definitionNode })
                  : none
            }
            return none
        default:
          console.log(`Not implemented: definitionNodeInfo(node) where \`node\` is of type ${node.getKindName()}.`)
          return none
    }
}

const extractEventTypeFromDesign = (node: Node): Option<Node> => {
  switch (node.getKind()) {
      case SyntaxKind.PropertyAccessExpression:
          const definitionNodeProperty = definitionNodeInfo(node)
          if (isSome(definitionNodeProperty) && isEventDefinition(getValue(definitionNodeProperty))) {
              // At this point we have an expression MachineEvent.design('myEventType').( withoutPayload() + withPayload<...>() + withZod<...>() )
              // Recurse wit the 'MachineEvent.design('myEventType')' bit of this expression
              return extractEventTypeFromDesign((node as tsMorph.PropertyAccessExpression).getExpression())
          }
          // Entered if e.g. event is defined in a namespace Events and we have
          // Events.myEvent --> getNamenameNode() returns the myEvent bit of this expression.
          return extractEventTypeFromDesign((node as tsMorph.PropertyAccessExpression).getNameNode())
      case SyntaxKind.Identifier:
          const definitionNodes = (node as tsMorph.Identifier).getDefinitionNodes()
          // Assume there is just one definition of this name. At defnitionNodes[0]
          return definitionNodes.length > 0 ? extractEventTypeFromDesign(definitionNodes[0]!) : none
      case SyntaxKind.VariableDeclaration:
          const initializer = (node as tsMorph.VariableDeclaration).getInitializer()
          return initializer ? extractEventTypeFromDesign(initializer) : none
      case SyntaxKind.CallExpression:
          // Check if this is a call to withPayload or withoutPayload. If so get parent propertyAccessExpression and go back to call to design.
          // Do this by resolving files. Should be somewhere in Runner.
          const expr = (node as CallExpression).getExpression()
          const callInfoOption = definitionNodeInfo(expr)
          if (isSome(callInfoOption) && isEventDesign(getValue(callInfoOption))) {
              // Assume there will be exactly one arguments: a string naming the event type
              return some((node as CallExpression).getArguments()[0]!)
          }
          return extractEventTypeFromDesign(expr)
  }

  return none
}

// Function to convert a TypeNode to PayloadType
// First level expanded by design.
// We want 'message eventTypeName { ... fields of type denoted by type alias }'
// instead of  'message eventTypeName { TypeAlias type_alias }' and 'message TypeAlias { ... fields of type denoted by type alias }
const designTypeArgsToPayloadType = (typeArgumets:tsMorph.TypeNode<tsMorph.ts.TypeNode>[], typeVariables: TypeVariables, typeNames: Set<string>): Option<PayloadType> => {
  if (typeArgumets.length != 1) {
    return none
  }
  const t = typeArgumets[0]!.getType()
  var typeInfo = typeVariables.get(t.getText()) ?? typeToTypeInfo(t, typeNames)
  if (isPayloadType(typeInfo, typeVariables)) {
      return some(typeInfo)
  }

  return none

}

const extractPayloadTypeFromDesign = (node: Node, typeVariables: TypeVariables, typeNames: Set<string>): Option<PayloadType> => {
  if (node.getKind() === SyntaxKind.CallExpression) {
    const expr = (node as CallExpression).getExpression()
    const callInfoOption = definitionNodeInfo(expr)
    
    if (isSome(callInfoOption) && isEventDefinition(getValue(callInfoOption))) {
      const typeArguments = (node as CallExpression).getTypeArguments()
      return designTypeArgsToPayloadType(typeArguments, typeVariables, typeNames)
    }
  }

  return none
}

// Traverse an ast constructing an EventSpec. Hardcoded to work with a file defining events using MachineEvent.design(...)
class CollectingVisitor implements ASTVisitor {
  eventSpec: EventSpec = { variables: new Map(), typeVariables: new Map(), events: [] };

  childWithKind(node: Node, kind: SyntaxKind): boolean {
    return node.getChildrenOfKind(kind).length > 0;
  }

  // Find child that is a TypeNode or undefined
  childTypeNode(node: Node): Node | undefined {
    return node.getChildren().find(child => Node.isTyped(child));
  }

  // Events are defined using MachineEvent.design('event type')...
  // Extract 'event type'
  getEventTypeNameFromArgs(node: CallExpression): string {
    const args = node.getArguments();
    if (args && args.length > 0) {
      if (args[0]!.getKind() === SyntaxKind.StringLiteral) {
        return args[0]!.getText().replace(/['"]/g, '');
      } else if (args[0]?.getKind() === SyntaxKind.Identifier) { // const a = "a"; const b = a; const eventTypeName = b; ??? What happens
        if (this.eventSpec.variables.has(args[0]!.getText())) {
          return this.eventSpec.variables.get(args[0]!.getText().replace(/['"]/g, ''))!;
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
                // By setting payload type through typeNodeToPayloadType we get the object type litterally if it is behind a type alias.
                // This is a design choice. We want 'message eventTypeName { ... fields of type denoted by type alias }'
                // instead of  'message eventTypeName { TypeAlias type_alias }' and 'message TypeAlias { ... fields of type denoted by type alias }
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

  // Insert a type variable into eventSpec.typeVariables
  visitTypeAliasDeclaration(node: TypeAliasDeclaration) {
    const typeNode = node.getTypeNode();
    if (typeNode) {
      this.eventSpec.typeVariables.set(node.getName(), typeNodeToTypeInfo(typeNode));
    } else {
      throw new Error(`Type alias ${node.getName()} does not have a type node`);
    }
  }
}

// Returns a cleaned copy of constructed EventSpec
//  type definitions not used in messages are removed such that we can generate a message type for all type aliases that have an object type
//  variables are replaced by their values if they have a primitive type -- nope consider relevance of this later then do
//  type aliases denoting primitive types are replaced by these primitive types.
function cleanEventSpec(dirtyEventSpec: EventSpec): EventSpec {
  const eventSpec = replacePrimitiveTypeVarsEventSpec(dirtyEventSpec)
  const namesInUse = usedNames(eventSpec)
  return {...eventSpec, typeVariables: new Map(Array.from(eventSpec.typeVariables.entries()).filter(([name, _]) => namesInUse.has(name)))}
}

// Construct an event spec and return it.
export function extractTypesFromFile(filePath: string): EventSpec {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);
  const visitor = new CollectingVisitor();
  traverse(sourceFile, visitor)

  return visitor.eventSpec;
}

// Construct an event spec, 'clean' it, and return it.
export function extractTypesFromFileCleaned(filePath: string): EventSpec {
  return cleanEventSpec(extractTypesFromFile(filePath))
}

/* export function eventSpec(filePath: string): EventSpec {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);
  const typeVariables = visitTypeAliasDeclarations(sourceFile)
  const events = visitVariableDeclarations(sourceFile, typeVariables)
  const eventSpec = replacePrimitiveTypeVarsEventSpec({ variables: new Map(), typeVariables, events })
  const namesInUse = usedNames(eventSpec)
  return {...eventSpec, typeVariables: new Map(Array.from(eventSpec.typeVariables.entries()).filter(([name, _]) => namesInUse.has(name))) }
} */

export const eventSpecification = (filePath: string): EventSpec => {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);
  const typeVariables = visitTypeAliasDeclarations(sourceFile)
  const events = visitVariableDeclarations(sourceFile, typeVariables)
  return { variables: new Map(), typeVariables, events }
}

const eventSpecificationCleaned = (filePath: string): EventSpec => { 
  const eventSpec = replacePrimitiveTypeVarsEventSpec(eventSpecification(filePath))
  const namesInUse = usedNames(eventSpec)
  return {...eventSpec, typeVariables: new Map(Array.from(eventSpec.typeVariables.entries()).filter(([name, _]) => namesInUse.has(name))) }
}



