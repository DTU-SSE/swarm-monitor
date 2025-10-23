import * as tsMorph from "ts-morph"
import { type Event, getValue, isSome, none, some, type Option, type PayloadType, type PropertyInfo, type TypeInfo, type EventSpec, serializeTypeInfo, serializeEvent, type Context } from "./types.js"
import { MACHINE_RUNNER_NAMES, TYPEINFO_NAMES, TYPEINFO_TYPES } from "./constants.js"
import { usedNames } from "./utils.js"
import path from "path"

/*
    One approach could be to get typeNodes for array element types, object properties and union members, check the syntax to see if a type reference is used.
    In that case add to context and use reference type info? visitType is already weird
*/


type TypeVisitResult = { context: Context, typeInfo: TypeInfo }
type EventTypeInitExpr = { eventTypeName: string, initializer: tsMorph.Expression }
type DefinitionNodeInfo = { sourceFile: string, definitionNodeText: string, definitionNode: tsMorph.Node }

const getNamedImports = (sourceFile: tsMorph.SourceFile): Map<string, string> => {
    return new Map(
        sourceFile
            .getImportDeclarations()
            .flatMap(imp => {
                const prefix = imp.getModuleSpecifierValue().replace(/^\.\//, "").replace(".ts", "").replaceAll("/", ".")
                return imp.getNamedImports().map(namedImp => {
                    const alias = namedImp.getAliasNode()
                    const declaredType = namedImp.getNameNode().getSymbol()?.getDeclaredType()
                    const fullName = `${prefix}.${namedImp.getName()}`
                    return declaredType
                        ? alias
                            ? some({ fullName, alias: alias.getText() })
                            : some({ fullName, alias: namedImp.getName() })
                        : none
                })
                //names.push(some({fullName: prefix, alias: prefix}))
                //return names
            })
            .filter(optionImp => isSome(optionImp))
            .map(optionImp => getValue(optionImp))
            .map(imp => [imp.fullName, imp.alias])
    )
}

// Literal object type expr would begin like this. Works for our purpose.
const hasLiteralObjectExprStartEnd = (name: string): boolean => (name.startsWith("{") && name.endsWith("}"))
const hasBar = (name: string): boolean => name.includes("|")
const fullTypeName = (context: Context, t: tsMorph.Type): Option<string> => {
    const declaration = t.getSymbol()?.getDeclarations()?.[0]
    if (declaration) {
        // path to file in which type is declared relative to file containing events that we are inspecting
        const relativePath = path.relative(path.dirname(context.sourceFile.getFilePath()), declaration.getSourceFile().getFilePath())
        const enclosingNamespaceSymbol = declaration.getFirstAncestorByKind(tsMorph.SyntaxKind.ModuleDeclaration)?.getNameNode().getSymbol()
        const enclosingNamespace = enclosingNamespaceSymbol ? enclosingNamespaceSymbol.getFullyQualifiedName().split(".").slice(1).join(".") : ""
        // relative path without extension and with all '/'s replaced by '.'s
        // concatenated with module specifiers if any
        // concatenated with the actual name of the type (with any 'import("...").' stripped away)
        // more than two .. (like if ../../../node_modules becoming .........node_modules? removed)
        const fullName = `${relativePath.replaceAll(".ts", "").replaceAll("/", ".")}${enclosingNamespace ? "." + enclosingNamespace : ""}.${t.getText().replace(/^import(.*)\./, "")}`//.replace(/(\.(\.)+)/, "")
        return some(fullName)
    }

    return none
}

// TODO: 'nested imports' of same name.
const typeName = (context: Context, t: tsMorph.Type): string => {
    const tText = t.getText()
    /* console.log("----")
    console.log("in typeName: ", tText)
    const sym = t.getSymbol() */
    /* if (sym) {
        console.log("sym: ", sym.getName())
        console.log("sym escaped name: ", sym.getEscapedName())
    } */
    /* const decls = sym?.getDeclarations()?.[0]
    if (decls) {
        console.log("decl: ", decls.getText())
        console.log("decl source: ", decls.getSourceFile().getBaseName())
        console.log("decl source again: ", decls.getSourceFile().getFilePath())
        console.log("context.sourceFile.getFilePath(): ", context.sourceFile.getFilePath())
        const p = path.relative(path.dirname(context.sourceFile.getFilePath()), decls.getSourceFile().getFilePath())
        const p1 = path.relative(path.dirname(context.sourceFile.getFilePath()), decls.getSourceFile().getBaseName())

        console.log("p: ", p)
        console.log("p1: ", p1)
        const enclosingNamespace = decls.getFirstAncestorByKind(tsMorph.SyntaxKind.ModuleDeclaration)
        const symbol = enclosingNamespace?.getNameNode().getSymbol()
        if (symbol) {
            // getFullyQualifiedName() should give us "file".A.B.C for some type defined in C. We actually get the quotes around the file name.
            console.log("LOng thing: ", symbol.getFullyQualifiedName().split(".").slice(1).join("_"))
        }

        const okName = `${p.replaceAll(".ts", "").replaceAll("/", ".")}${symbol ? "." + symbol.getFullyQualifiedName().split(".").slice(1).join(".") : ""}.${tText.replace(/^import(.*)\./, "")}`.replace(/(\.(\.)+)/, "")
        console.log("okName: ", okName)

    }
    console.log("----") */
    if (hasLiteralObjectExprStartEnd(tText) || hasBar(tText)) {
        return tText
    }
    if (context.namedImports.has(tText)) {
        return context.namedImports.get(tText)!
    }
    const fullNameOption = fullTypeName(context, t)
    if (isSome(fullNameOption)) {
        const fullName = getValue(fullNameOption)
        if (context.namedImports.has(fullName)) {
            return context.namedImports.get(fullName)!
        } else {
            return fullName
        }
    }


    /* // The type could be defined in some submodule. In this case we want the full name including all modules.
    const decl = t.getSymbol()?.getDeclarations()
    if (decl && decl.length > 0) {
        const encolsingNamespace = decl[0]?.getFirstAncestorByKind(tsMorph.SyntaxKind.ModuleDeclaration)
        const symbol = encolsingNamespace?.getNameNode().getSymbol()
        if (symbol) {
            // getFullyQualifiedName() should give us "file".A.B.C for some type defined in C. We actually get the quotes around the file name.
            return symbol.getFullyQualifiedName().split(".").slice(1).join("_") // Find more robust solution. The file name should be included somehow. And is it always there?
        }
    } */

    return tText
}

function basicVisit(node: tsMorph.Node, prepend: string = '') {
  console.log(`${prepend}Node: ${node.getText()} of kind ${tsMorph.SyntaxKind[node.getKind()]}`);
  node.forEachChild(child => {
    basicVisit(child, prepend + '  * ');
  });
}

const visitType = (context: Context, t: tsMorph.Type): TypeVisitResult => {
    const inner = (context: Context, t: tsMorph.Type, visited: Set<string>): TypeVisitResult => {
        const tName = typeName(context, t)
        // Recursive types
        if (visited.has(tName)) {
            return { context, typeInfo: { type: TYPEINFO_TYPES.REFERENCE, asString: tName } }
        }
        // Types already encountered. Avoid recomputing type.
        // Insert as reference if object or union (and ... ?) ?? No I think do this afterwards.
        if (context.typeVariables.has(tName)) {
            return { context, typeInfo: context.typeVariables.get(tName)! }
        }

        // We lose some information here. type t = true, will be represented as a boolean and not the narrower literal true, only differ in asString.
        // We do this because a union myUnion = boolean | number gets expanded as true | false | number
        if (t.isBoolean() || t.isBooleanLiteral()) {
            return { context, typeInfo: { type: TYPEINFO_TYPES.BOOLEAN, asString: tName } }
        }

        if (t.isNumber() || t.isNumberLiteral()) {
            return { context, typeInfo: { type: TYPEINFO_TYPES.NUMBER, asString: tName } }
        }

        if (t.isString() || t.isStringLiteral()) {
            return { context, typeInfo: { type: TYPEINFO_TYPES.STRING, asString: tName } }
        }

        if (t.isArray()) {
            // need to use reference here sometimes? use something like get symbol??
            const elementTypeResult = inner(context, t.getArrayElementTypeOrThrow(), visited)
            return { context: elementTypeResult.context, typeInfo: { type: TYPEINFO_TYPES.ARRAY, asString: tName, elementType: elementTypeResult.typeInfo } }
        }

        if (t.isObject()) {
            visited.add(tName)
            // This looks a bit odd.
            const folder = (acc: { context: Context, propertyInfos: PropertyInfo[] }, symbol: tsMorph.Symbol): { context: Context, propertyInfos: PropertyInfo[] } => {
                const typeVisitResult = inner(acc.context, symbol.getValueDeclaration()?.getType() ?? symbol.getDeclaredType(), visited)
                const propertySignatureTypeNode = (symbol.getValueDeclaration() as tsMorph.PropertySignature)?.getTypeNode()

                const typeInfo = propertySignatureTypeNode
                    && propertySignatureTypeNode.getKind() === tsMorph.SyntaxKind.TypeReference
                    && (typeVisitResult.typeInfo.type === TYPEINFO_TYPES.OBJECT || typeVisitResult.typeInfo.type === TYPEINFO_TYPES.UNION)
                        ? { type: TYPEINFO_TYPES.REFERENCE, asString: propertySignatureTypeNode.getText() }
                        : typeVisitResult.typeInfo

                // Make sure type name is in context if reference. Might not be the case already.
                // In 'type a = { ... }; type b = a;' typeInfo would be { ... } and we would have an entry for a.
                // However, propertySignatureTypeNode.getText() would be b. Sketchy
                if (typeInfo.type == TYPEINFO_TYPES.REFERENCE) {
                    context.typeVariables.set(propertySignatureTypeNode?.getText()!, typeVisitResult.typeInfo)
                }

                // Add property type to property infos. Bit weird that it mutates.
                // Consider possibly adding a reference here? If object or union but not literal?
                const property = { propertyName: symbol.getName(), propertyType: typeInfo }
                acc.propertyInfos.push(property)
                // Return updated context and property infos.
                return { context: typeVisitResult.context, propertyInfos: acc.propertyInfos }
            }

            const propertiesResult = t.getProperties().reduce(folder, { context, propertyInfos: [] })
            const typeInfo = { type: TYPEINFO_TYPES.OBJECT, asString: tName, properties: propertiesResult.propertyInfos }

            // Update context for object types that are not given as literal object type
            if (!hasLiteralObjectExprStartEnd(tName)) {
                context.typeVariables.set(tName, typeInfo)
            }

            return { context, typeInfo }
        }

        if (t.isUnion()) {
            const folder = (acc: { context: Context, unionTypeMembers: TypeInfo[] }, unionTypeMember: tsMorph.Type): { context: Context, unionTypeMembers: TypeInfo[] } => {
                const typeVisitResult = inner(context, unionTypeMember, visited)
                const typeInfoFromContext = typeVisitResult.context.typeVariables.get(typeVisitResult.typeInfo.asString)
                // Sketchy
                const typeInfo = typeInfoFromContext
                    && (typeVisitResult.typeInfo.type === TYPEINFO_TYPES.OBJECT || typeVisitResult.typeInfo.type === TYPEINFO_TYPES.UNION)
                        ? { type: TYPEINFO_TYPES.REFERENCE, asString: typeVisitResult.typeInfo.asString }
                        : typeVisitResult.typeInfo

                acc.unionTypeMembers.push(typeInfo)
                return { context: typeVisitResult.context, unionTypeMembers: acc.unionTypeMembers }
            }
            const membersResult = t.getUnionTypes().reduce(folder, { context, unionTypeMembers: [] })

            // We do this because a union myUnion = boolean | number gets expanded as true | false | number
            // Consider doing this in boolean instead if boolean literal replace asString with TYPEINFO_TYPES.BOOLEAN
            const predicateTrueLiteral = (typeInfo: TypeInfo): boolean => typeInfo.type == TYPEINFO_TYPES.BOOLEAN && typeInfo.asString == "true"
            const predicateFalseLiteral = (typeInfo: TypeInfo): boolean => typeInfo.type == TYPEINFO_TYPES.BOOLEAN && typeInfo.asString == "false"
            const memberDeduplicater = (acc: { membersSet: Set<string>, members: TypeInfo[] }, m: TypeInfo): { membersSet: Set<string>, members: TypeInfo[] } => {
                // Remove possible duplicate booleans. Should we use type here and check if primitive?
                if (acc.membersSet.has(m.asString)) {
                    return acc
                } else {
                    acc.membersSet.add(m.asString)
                    acc.members.push(m)
                    return acc
                }
            }
            // Double check this
            const members = membersResult
                .unionTypeMembers
                .map(m => predicateTrueLiteral(m) || predicateFalseLiteral(m) ? { type: TYPEINFO_TYPES.BOOLEAN, asString: TYPEINFO_TYPES.BOOLEAN } : m)
                .reduce(memberDeduplicater, { membersSet: new Set<string>(), members: [] })
                .members

            const typeInfo = { type: TYPEINFO_TYPES.UNION, asString: tName, members: members }

            // Update context for union types that are not given as literal union type
            if (!hasBar(tName)) {
                context.typeVariables.set(tName, typeInfo)
            }

            return { context, typeInfo }

        }

        throw Error(`Support for ${tName} not implemented`)

    }

    return inner(context, t, new Set())
}

// Visit all variable declarations in a file and create an event specification.
const visitVariableDeclarations = (sourceFile: tsMorph.SourceFile): EventSpec => {
    const context = { sourceFile: sourceFile, typeVariables: new Map(), namedImports: getNamedImports(sourceFile) }
    const eventTypeDeclarations = sourceFile
        .getVariableDeclarations()
        .concat(sourceFile
            .getDescendantsOfKind(tsMorph.SyntaxKind.ModuleDeclaration)
            .flatMap(m => m.getVariableDeclarations()))
        .map(machineEventDefinition)
        .filter(isSome)
        .map(getValue)

    const folder = (acc: EventSpec, eventTypeInitExpr: EventTypeInitExpr): EventSpec => {
        const payloadTypeArg = payloadTypeArgument(eventTypeInitExpr.initializer)
        if (isSome(payloadTypeArg)) {
            const visitTypeResult = visitType(acc.context, getValue(payloadTypeArg))
            // TODO: handle this as PayloadType thing
            const event = { eventTypeName: eventTypeInitExpr.eventTypeName, eventKind: TYPEINFO_NAMES.WITH_PAYLOAD, payloadType: visitTypeResult.typeInfo as PayloadType }
            acc.events.push(event)
            return { context: visitTypeResult.context, events: acc.events }
        } else {
            const event = { eventTypeName: eventTypeInitExpr.eventTypeName, eventKind: TYPEINFO_NAMES.WITHOUT_PAYLOAD }
            acc.events.push(event)
            return { context: acc.context, events: acc.events }
        }
    }
    return eventTypeDeclarations
        .reduce(folder, { context, events: [] })
}

const machineEventDefinition = (node: tsMorph.VariableDeclaration): Option<EventTypeInitExpr> => {
    const initializer = node.getInitializer()
    if (initializer) {
        const maybeEventType = extractEventTypeFromDesign(initializer)
        return isSome(maybeEventType) ? some({ eventTypeName: getEventTypeName(getValue(maybeEventType)), initializer }) : none
    }
    return none
}

// Events are defined using MachineEvent.design('event type')...
// Extract 'event type'
const getEventTypeName = (node: tsMorph.Node): string => {
    // TODO: other cases e.g. property access?
    if (node.getKind() === tsMorph.SyntaxKind.StringLiteral) {
        return node.getText().replace(/['"]/g, '')
        // Seems sketchy
    } else if (node.getKind() === tsMorph.SyntaxKind.Identifier) {
        const optionDefinitionNode = definitionNodeInfo(node)
        if (isSome(optionDefinitionNode)) {
            const initializer = (getValue(optionDefinitionNode).definitionNode as tsMorph.VariableDeclaration).getInitializer()
            if (initializer) {
                return getEventTypeName(initializer)
            }
        }
    }
    throw new Error(`Event type name not found in arguments of call expression: ${node.getText()}`);
}

function isEventDefinition(nodeInfo: DefinitionNodeInfo): boolean {
    return (nodeInfo.sourceFile.endsWith(MACHINE_RUNNER_NAMES.EVENT_D_TS)
        && MACHINE_RUNNER_NAMES.EVENT_DEFINITION_FUNCTIONS.some(eventDefFunction => eventDefFunction === nodeInfo.definitionNodeText))
}

function isEventDesign(nodeInfo: DefinitionNodeInfo): boolean {
    return nodeInfo.sourceFile.endsWith(MACHINE_RUNNER_NAMES.EVENT_D_TS)
        && nodeInfo.definitionNodeText === MACHINE_RUNNER_NAMES.EVENT_DESIGN_FUNCTION
}

// Assumes one definition
const definitionNodeInfo = (node: tsMorph.Node): Option<DefinitionNodeInfo> => {
    switch (node.getKind()) {
        case tsMorph.SyntaxKind.PropertyAccessExpression:
            const definitionNodesProperty = (node as tsMorph.PropertyAccessExpression).getNameNode().getDefinitionNodes()
            if (definitionNodesProperty.length > 0) {
                // Assume just one definition
                const definitionNode = definitionNodesProperty[0]
                return definitionNode
                    ? some({ sourceFile: definitionNode.getSourceFile().getFilePath(), definitionNodeText: definitionNode.getText(), definitionNode })
                    : none
            }
            return none
        case tsMorph.SyntaxKind.Identifier:
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
// Events are defined using MachineEvent.design('event type')...
// Return some( AST node representing 'event type' ) or none
const extractEventTypeFromDesign = (node: tsMorph.Node): Option<tsMorph.Node> => {
    switch (node.getKind()) {
        case tsMorph.SyntaxKind.PropertyAccessExpression:
            const definitionNodeProperty = definitionNodeInfo(node)
            if (isSome(definitionNodeProperty) && isEventDefinition(getValue(definitionNodeProperty))) {
                // At this point we have an expression MachineEvent.design('myEventType').( withoutPayload() + withPayload<...>() + withZod<...>() )
                // Recurse wit the 'MachineEvent.design('myEventType')' bit of this expression
                return extractEventTypeFromDesign((node as tsMorph.PropertyAccessExpression).getExpression())
            }
            // Entered if e.g. event is defined in a namespace Events and we have
            // Events.myEvent --> getNamenameNode() returns the myEvent bit of this expression.
            return extractEventTypeFromDesign((node as tsMorph.PropertyAccessExpression).getNameNode())
        case tsMorph.SyntaxKind.Identifier:
            const definitionNodes = (node as tsMorph.Identifier).getDefinitionNodes()
            // Assume there is just one definition of this name. At defnitionNodes[0]
            return definitionNodes.length > 0 ? extractEventTypeFromDesign(definitionNodes[0]!) : none
        case tsMorph.SyntaxKind.VariableDeclaration:
            const initializer = (node as tsMorph.VariableDeclaration).getInitializer()
            return initializer ? extractEventTypeFromDesign(initializer) : none
        case tsMorph.SyntaxKind.CallExpression:
            // Check if this is a call to withPayload or withoutPayload. If so get parent propertyAccessExpression and go back to call to design.
            // Do this by resolving files. Should be somewhere in Runner.
            const expr = (node as tsMorph.CallExpression).getExpression()
            const callInfoOption = definitionNodeInfo(expr)
            if (isSome(callInfoOption) && isEventDesign(getValue(callInfoOption))) {
                // Assume there will be exactly one arguments: a string naming the event type
                return some((node as tsMorph.CallExpression).getArguments()[0]!)
            }
            return extractEventTypeFromDesign(expr)
    }

    return none
}

// Payload types T are given as type arguments to MachinEvent.design(name).withPayload<T>()
const payloadTypeArgument = (node: tsMorph.Node): Option<tsMorph.Type> => {
    if (node.getKind() === tsMorph.SyntaxKind.CallExpression) {
        const expr = (node as tsMorph.CallExpression).getExpression()
        const callInfoOption = definitionNodeInfo(expr)

        if (isSome(callInfoOption) && isEventDefinition(getValue(callInfoOption))) {
            const typeArguments = (node as tsMorph.CallExpression).getTypeArguments()
            return typeArguments.length == 1 ? some(typeArguments[0]!.getType()) : none
        }
    }

    return none

}

export const eventSpecification = (filePath: string): EventSpec => {
    const project = new tsMorph.Project();
    const sourceFile = project.addSourceFileAtPath(filePath);
    const eventSpec = visitVariableDeclarations(sourceFile)

    return eventSpec
}

export const eventSpecificationCleaned = (filePath: string): EventSpec => {
    const eventSpec = eventSpecification(filePath)
    //console.log(eventSpec.context.namedImports)
    const namesInUse = usedNames(eventSpec)
    const typeVariables = new Map(Array.from(eventSpec.context.typeVariables.entries()).filter(([name, _]) => namesInUse.has(name)))
    return {...eventSpec, context: {...eventSpec.context, typeVariables }}
}