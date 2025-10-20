import * as tsMorph from "ts-morph"
import { type Event, getValue, isSome, none, some, type Option, type PayloadType, type PropertyInfo, type TypeInfo, type EventSpec, serializeTypeInfo, isPrimitiveOrArray, serializeEvent } from "./types.js"
import { MACHINE_RUNNER_NAMES, TYPEINFO_NAMES, TYPEINFO_TYPES } from "./constants.js"
import { isPayloadType } from "./utils.js"
import { serialize } from "v8"


/*
    Plan:
        1. Visit all types given as parameters to  withPayload<...> (instead of those AND type declarations)
        2. Accumulate known names to avoid some duplicate work. If encounering a known name --> return its typeinfo
        3. Once all of this is done, replace fields that are payload types by their type name as reference.



*/
//class TypeExtractor {}

class TypeExtractor {

    knownTypes: Map<string, TypeInfo>
    namedImports: Map<string, string>
    constructor(sourceFile: tsMorph.SourceFile) {
        this.knownTypes = new Map()
        this.namedImports = this.getNamedImports(sourceFile)
    }

    getNamedImports(sourceFile: tsMorph.SourceFile): Map<string, string> {
        return new Map(
            sourceFile
                .getImportDeclarations()
                .flatMap(imp => {
                    return imp.getNamedImports().map(namedImp => {
                        const alias = namedImp.getAliasNode()
                        const declaredType = namedImp.getNameNode().getSymbol()?.getDeclaredType()
                        return declaredType
                            ? alias
                                ? some({ fullName: declaredType.getText(), alias: alias.getText() })
                                : some({ fullName: declaredType.getText(), alias: namedImp.getNameNode().getText() })
                            : none
                    })
                })
                .filter(optionImp => isSome(optionImp))
                .map(optionImp => getValue(optionImp))
                .map(imp => [imp.fullName, imp.alias])
        )
    }

    typeToTypeInfo(t: tsMorph.Type): TypeInfo {
        const inner = (t: tsMorph.Type, visited: Set<string>): TypeInfo => {
            const tName = this.namedImports.get(t.getText()) ?? t.getText()
            console.log("-----")
            console.log("tname: ", tName, " fully qualifiedName: ", t.getSymbol()?.getFullyQualifiedName())
            const decl = t.getSymbol()?.getDeclarations()
            if (decl && decl.length > 0) {
                const encolsingNamespace = decl[0]?.getFirstAncestorByKind(tsMorph.SyntaxKind.ModuleDeclaration)
                if (encolsingNamespace) {
                    console.log("namespace: ", encolsingNamespace.getName())
                    console.log("full name: ", encolsingNamespace.getNameNode().getSymbol()?.getFullyQualifiedName())
                }
            }
            console.log("calling typeName(): ", typeName({ knownTypes: this.knownTypes, namedImports: this.namedImports }, t))
            console.log("++++++")

            // Recursive types
            if (visited.has(tName)) {
                return { type: TYPEINFO_TYPES.REFERENCE, asString: tName }
            }

            // use tName to identify type name. using t.getAliasSymbol()?.getName() gives a cleaner name.
            // But does not work if multiple types with same imported with as ...
            if (this.knownTypes.has(tName)) {
                return this.knownTypes.get(tName)!
            }

            if (t.isArray()) {
                return { type: TYPEINFO_TYPES.ARRAY, asString: tName, elementType: inner(t.getArrayElementTypeOrThrow(), visited) }
            }

            // We lose some information here. type t = true, will be represented as a boolean and not the narrower literal true, only differ in asString.
            // We do this because a union myUnion = boolean | number gets expanded as true | false | number
            if (t.isBoolean() || t.isBooleanLiteral()) {
                return { type: TYPEINFO_TYPES.BOOLEAN, asString: tName }
            }

            if (t.isNumber() || t.isNumberLiteral()) {
                return { type: TYPEINFO_TYPES.NUMBER, asString: tName }
            }

            if (t.isObject()) {
                visited.add(tName)
                const mapper = (symbol: tsMorph.Symbol): PropertyInfo => {
                    return { propertyName: symbol.getName(), propertyType: inner(symbol.getValueDeclaration()?.getType() ?? symbol.getDeclaredType(), visited) }
                }

                const typeInfo = { type: TYPEINFO_TYPES.OBJECT1, asString: tName, properties: t.getProperties().map(mapper) }

                //if (notLiteralObjectExpr(tName)) {
                this.knownTypes.set(tName, typeInfo)
                //}

                return typeInfo
            }

            if (t.isString() || t.isStringLiteral()) {
                return { type: TYPEINFO_TYPES.STRING, asString: tName }
            }

            if (t.isUnion()) {
                // We should check for use of type alias here as well. Like we do for object properties
                const mapper = (unionTypeMember: tsMorph.Type): TypeInfo => inner(unionTypeMember, visited)
                let members = t.getUnionTypes().map(mapper)

                // We do this because a union myUnion = boolean | number gets expanded as true | false | number
                // Consider doing this in boolean instead if boolean literal replace asString with TYPEINFO_TYPES.BOOLEAN
                const predicateTrueLiteral = (typeInfo: TypeInfo): boolean => typeInfo.type == TYPEINFO_TYPES.BOOLEAN && typeInfo.asString == "true"
                const predicateFalseLiteral = (typeInfo: TypeInfo): boolean => typeInfo.type == TYPEINFO_TYPES.BOOLEAN && typeInfo.asString == "false"
                if (members.some(predicateTrueLiteral) && members.some(predicateFalseLiteral)) {
                    members = members.filter(t => !(predicateTrueLiteral(t) || predicateFalseLiteral(t)))
                    members.push({ type: TYPEINFO_TYPES.BOOLEAN, asString: TYPEINFO_TYPES.BOOLEAN })
                }
                const typeInfo = { type: TYPEINFO_TYPES.UNION, asString: tName, members: members }
                //if (notLiteralObjectExpr(tName)) {
                this.knownTypes.set(tName, typeInfo)
                //}
                return typeInfo
            }
            // TODO: remaining cases: e.g. tuples, intersections. Consider using options to not crash when encountering something not implemented
            // But if this is not handled throughout then we just postpone the crash a little bit.
            throw Error(`Support for ${tName} not implemented`)
        }
        return inner(t, new Set())
    }



    simplifyTypeInfo(typeInfo: TypeInfo): TypeInfo {
        switch (typeInfo.type) {
            case TYPEINFO_TYPES.OBJECT1:

        }

        throw Error
    }

    simplifyEvents(events: Event[]): Event[] {


        throw Error
    }

}

type Context = { knownTypes: Map<string, TypeInfo>, namedImports: Map<string, string> }
type TypeVisitResult = { context: Context, typeInfo: TypeInfo }
type EventTypeInitExpr = { eventTypeName: string, initializer: tsMorph.Expression }

const getNamedImports = (sourceFile: tsMorph.SourceFile): Map<string, string> => {
    return new Map(
        sourceFile
            .getImportDeclarations()
            .flatMap(imp => {
                return imp.getNamedImports().map(namedImp => {
                    const alias = namedImp.getAliasNode()
                    const declaredType = namedImp.getNameNode().getSymbol()?.getDeclaredType()
                    return declaredType
                        ? alias
                            ? some({ fullName: declaredType.getText(), alias: alias.getText() })
                            : some({ fullName: declaredType.getText(), alias: namedImp.getNameNode().getText() })
                        : none
                })
            })
            .filter(optionImp => isSome(optionImp))
            .map(optionImp => getValue(optionImp))
            .map(imp => [imp.fullName, imp.alias])
    )
}

const typeName = (context: Context, t: tsMorph.Type): string => {
    const tText = t.getText()
    if (context.namedImports.has(tText)) {
        return context.namedImports.get(tText)!
    }
    // The type could be defined in some submodule. In this case we want the full name including all modules.
    const decl = t.getSymbol()?.getDeclarations()
    if (decl && decl.length > 0) {
        const encolsingNamespace = decl[0]?.getFirstAncestorByKind(tsMorph.SyntaxKind.ModuleDeclaration)
        const symbol = encolsingNamespace?.getNameNode().getSymbol()
        if (symbol) {
            // getFullyQualifiedName() should give us "file".A.B.C for some type defined in C. We actually get the quotes around the file name.
            return symbol.getFullyQualifiedName().split(".").slice(1).join("_") // Find more robust solution. The file name should be included somehow. And is it always there?
        }
    }

    return tText
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
        if (context.knownTypes.has(tName)) {
            return { context, typeInfo: context.knownTypes.get(tName)! }
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
            const elementTypeResult = inner(context, t.getArrayElementTypeOrThrow(), visited)
            return { context: elementTypeResult.context, typeInfo: { type: TYPEINFO_TYPES.ARRAY, asString: tName, elementType: elementTypeResult.typeInfo } }
        }

        if (t.isObject()) {
            visited.add(tName)
            // This looks a bit odd.
            const folder = (acc: { context: Context, propertyInfos: PropertyInfo[] }, symbol: tsMorph.Symbol): { context: Context, propertyInfos: PropertyInfo[] } => {
                const typeVisitResult = inner(acc.context, symbol.getValueDeclaration()?.getType() ?? symbol.getDeclaredType(), visited)
                // Add property type to property infos. Bit weird that it mutates.
                // Consider possibly adding a reference here? If object or union but not literal?
                const property = { propertyName: symbol.getName(), propertyType: typeVisitResult.typeInfo }
                acc.propertyInfos.push(property)
                // Return updated context and property infos.
                return { context: typeVisitResult.context, propertyInfos: acc.propertyInfos }
            }

            const propertiesResult = t.getProperties().reduce(folder, { context, propertyInfos: [] })
            const typeInfo = { type: TYPEINFO_TYPES.OBJECT1, asString: tName, properties: propertiesResult.propertyInfos }

            // Update context
            context.knownTypes.set(tName, typeInfo)

            return { context, typeInfo }
        }

        if (t.isUnion()) {
            const folder = (acc: { context: Context, unionTypeMembers: TypeInfo[] }, unionTypeMember: tsMorph.Type): { context: Context, unionTypeMembers: TypeInfo[] } => {
                const typeVisitResult = inner(context, unionTypeMember, visited)
                acc.unionTypeMembers.push(typeVisitResult.typeInfo)
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

            // Update context
            context.knownTypes.set(tName, typeInfo)

            return { context, typeInfo }

        }

        throw Error(`Support for ${tName} not implemented`)

    }

    return inner(context, t, new Set())
}
// definitely not a literal object type expr if it this is not satisfied :D
const notLiteralObjectExpr = (name: string): boolean => !(name.startsWith("{") && name.endsWith("}"))

// This is weird mapping and passing type extractor. Move everything to type extractor instead
// Get all variable declarations and try to parse them as MachineEvents.
const visitVariableDeclarations = (sourceFile: tsMorph.SourceFile): Event[] => {
    const typeExtractor = new TypeExtractor(sourceFile)
    const events = sourceFile
        .getVariableDeclarations()
        .concat(sourceFile
            .getDescendantsOfKind(tsMorph.SyntaxKind.ModuleDeclaration)
            .flatMap(m => m.getVariableDeclarations()))
        .map(variableDeclaration => machineEventDefinition(variableDeclaration, typeExtractor))
        .filter(o => isSome(o))
        .map(o => getValue(o))

    //const ee = typeExtractor.simplifyEvents(events)

    for (const [k, v] of typeExtractor.knownTypes) {
        console.log(`${k}: ${JSON.stringify(serializeTypeInfo(v), null, 2)}`)
    }
    for (const [k, v] of typeExtractor.namedImports) {
        console.log(`${k}: ${v}`)
    }
    return events
}

const visitVariableDeclarations1 = (sourceFile: tsMorph.SourceFile): Event[] => {
    const context = { knownTypes: new Map(), namedImports: getNamedImports(sourceFile) }
    const eventTypeDeclarations = sourceFile
        .getVariableDeclarations()
        .concat(sourceFile
            .getDescendantsOfKind(tsMorph.SyntaxKind.ModuleDeclaration)
            .flatMap(m => m.getVariableDeclarations()))
            .map(machineEventDefinition1)
            .filter(isSome)
            .map(getValue)

    // Turn {context, events} into eventspec??
    const folder = (acc: {context: Context, events: Event[]}, eventTypeInitExpr: EventTypeInitExpr): {context: Context, events: Event[]} => {
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
    const result = eventTypeDeclarations
        .reduce(folder, {context, events: []})

    console.log("KNOWN TYPES: ")
    for (const [k, v] of result.context.knownTypes) {
        console.log(`${k}: ${JSON.stringify(serializeTypeInfo(v), null, 2)}`)
    }
    console.log("NAMED IMPORTS: ")
    for (const [k, v] of result.context.namedImports) {
        console.log(`${k}: ${v}`)
    }
    console.log("EVENTS: ")
    for (const e of result.events) {
        console.log(JSON.stringify(serializeEvent(e), null, 2))
    }
    return result.events
}

const machineEventDefinition1 = (node: tsMorph.VariableDeclaration): Option<EventTypeInitExpr> => {
    const initializer = node.getInitializer()
    if (initializer) {
        const maybeEventType = extractEventTypeFromDesign(initializer)
        return isSome(maybeEventType) ? some({ eventTypeName: getEventTypeName(getValue(maybeEventType)), initializer}) : none
    }
    return none
}

const machineEventDefinition = (node: tsMorph.VariableDeclaration, typeExtractor: TypeExtractor): Option<Event> => {
    const initializer = node.getInitializer()
    if (initializer) {
        const maybeEventType = extractEventTypeFromDesign(initializer)
        if (isSome(maybeEventType)) {
            const optionPayloadType = extractPayloadTypeFromDesign(initializer, typeExtractor)
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

type DefinitionNodeInfo = { sourceFile: string, definitionNodeText: string, definitionNode: tsMorph.Node }

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

// Function to convert a TypeNode to PayloadType
// First level expanded by design.
// We want 'message eventTypeName { ... fields of type denoted by type alias }'
// instead of  'message eventTypeName { TypeAlias type_alias }' and 'message TypeAlias { ... fields of type denoted by type alias }
const designTypeArgsToPayloadType = (typeArgumets: tsMorph.TypeNode<tsMorph.ts.TypeNode>[], typeExtractor: TypeExtractor): Option<PayloadType> => {
    if (typeArgumets.length != 1) {
        return none
    }
    const t = typeArgumets[0]!.getType()
    const typeInfo = typeExtractor.typeToTypeInfo(typeArgumets[0]!.getType())
    if (isPayloadType(typeInfo, typeExtractor.knownTypes)) {
        return some(typeInfo)
    }

    return none

}

const extractPayloadTypeFromDesign = (node: tsMorph.Node, typeExtractor: TypeExtractor): Option<PayloadType> => {
    if (node.getKind() === tsMorph.SyntaxKind.CallExpression) {
        const expr = (node as tsMorph.CallExpression).getExpression()
        const callInfoOption = definitionNodeInfo(expr)

        if (isSome(callInfoOption) && isEventDefinition(getValue(callInfoOption))) {
            const typeArguments = (node as tsMorph.CallExpression).getTypeArguments()
            return designTypeArgsToPayloadType(typeArguments, typeExtractor)
        }
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


/* export const aliasedNamedImports = (sourceFile: tsMorph.SourceFile): Map<string, string> => {
    return new Map(
        sourceFile
        .getImportDeclarations()
        .flatMap(imp => {
            return imp.getNamedImports().map(namedImp => {
                const alias = namedImp.getAliasNode()
                const declaredType = namedImp.getNameNode().getSymbol()?.getDeclaredType()
                return alias && declaredType ? some({fullName: declaredType.getText(), alias: alias.getText()}) : none
            })
        })
        .filter(optionImp => isSome(optionImp))
        .map(optionImp => getValue(optionImp))
        .map(imp => [imp.fullName, imp.alias])
    )
}  */

export const eventSpecification1 = (filePath: string): EventSpec => {
    console.log()
    const project = new tsMorph.Project();
    const sourceFile = project.addSourceFileAtPath(filePath);
    const events = visitVariableDeclarations1(sourceFile)
    /* const aliasedImports = aliasedNamedImports(sourceFile)
    for (const [k, v] of aliasedImports) {
        console.log(k, v)
    } */


    return { variables: new Map(), typeVariables: new Map(), events }
}
/*


for (const imp of sourceFile.getImportDeclarations()) {
        console.log("11111 ", imp.getText())

        for (const named of imp.getNamedImports()) {
            console.log("named.getName(): ", named.getName()); // e.g., "MyType"
            console.log("named.getNameNode().getSymbol()?.getDeclaredType().getText(): ", named.getNameNode().getSymbol()?.getDeclaredType().getText())
            console.log("isTypeOnly?: ", named.isTypeOnly())
            console.log(`alias::: ${named.getAliasNode()?.getText()}`)
            }
        console.log("111111 dione")
        if (imp.isTypeOnly()) {
            for (const named of imp.getNamedImports()) {
            console.log("is type only ", named.getName()); // e.g., "MyType"
            }
        }
    } */


// {(\w:\w+)([,;](\w+:\w+))*}

//{(\w+\s*:\s*\w+\s*)\s*([,;]\s*(\w+\s*:\s*\w+\s*))*}