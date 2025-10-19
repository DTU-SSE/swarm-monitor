import * as tsMorph from "ts-morph"
import { type Event, getValue, isSome, none, some, type Option, type PayloadType, type PropertyInfo, type TypeInfo, type EventSpec, serializeTypeInfo } from "./types.js"
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

                if (notLiteralObjectExpr(tName)) {
                    this.knownTypes.set(tName, typeInfo)
                }

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
                if (notLiteralObjectExpr(tName)) {
                    this.knownTypes.set(tName, typeInfo)
                }
                return typeInfo
            }
            // TODO: remaining cases: e.g. tuples, intersections. Consider using options to not crash when encountering something not implemented
            // But if this is not handled throughout then we just postpone the crash a little bit.
            throw Error(`Support for ${tName} not implemented`)
        }
        return inner(t, new Set())
    }

}
// definitely not a literal object type expr if it this is not satisfied :D
const notLiteralObjectExpr = (name: string): boolean => !(name.startsWith("{") && name.endsWith("}"))

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

    for (const [k, v] of typeExtractor.knownTypes) {
        console.log(`${k}: ${JSON.stringify(serializeTypeInfo(v), null, 2)}`)
    }
    for (const [k, v] of typeExtractor.namedImports) {
        console.log(`${k}: ${v}`)
    }
    return events
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
    const events = visitVariableDeclarations(sourceFile)
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