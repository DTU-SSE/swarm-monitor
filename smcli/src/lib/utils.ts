import { type TypeInfo, type PayloadType, type TypeVariables, type Event, type EventSpec, isPrimitiveType } from "./types.js";
import { TypeNode, SyntaxKind, ArrayTypeNode, UnionTypeNode, TypeLiteralNode, PropertySignature } from "ts-morph";
import { TYPEINFO_TYPES, TYPEINFO_NAMES } from "./constants.js";

// Function to convert a TypeNode to TypeInfo
// Right now you can not do things like const a = "a"; type ClosingTimePayload = { timeOfDay: "typeof a" }; type PartIDPayload = {partName: "b"}
// TypeNodes are found in e.g. type arguments
export function typeNodeToTypeInfo(typeNode: TypeNode): TypeInfo {
    switch (typeNode.getKind()) {
        case SyntaxKind.StringKeyword:
            return { type: 'string', asString: typeNode.getText() };
        case SyntaxKind.NumberKeyword:
            return { type: 'number', asString: typeNode.getText() };
        case SyntaxKind.BooleanKeyword:
            return { type: 'boolean', asString: typeNode.getText() };
        case SyntaxKind.TypeReference:
            return { type: 'reference', asString: typeNode.getText() }; // references to type aliases
        case SyntaxKind.ArrayType:
            const arrayType = typeNode as ArrayTypeNode;
            return {
                type: 'array',
                asString: arrayType.getText(),
                elementType: typeNodeToTypeInfo(arrayType.getElementTypeNode()!)
            };
        case SyntaxKind.UnionType:
            const unionType = typeNode as UnionTypeNode;
            return {
                type: 'union',
                asString: unionType.getText(),
                members: unionType.getTypeNodes().map(t => typeNodeToTypeInfo(t))
            };
        // TypeLiteralNodes are used to represent object types
        case SyntaxKind.TypeLiteral:
            const typeLiteral = typeNode as TypeLiteralNode;
            const pairs: [string, TypeInfo][] = typeLiteral.getMembers()
                .filter(member => member.getKind() === SyntaxKind.PropertySignature) // Can be either PropertySignature | MethodSignature | ConstructSignatureDeclaration | CallSignatureDeclaration | IndexSignatureDeclaration | GetAccessorDeclaration | SetAccessorDeclaration;
                .map(member => member as PropertySignature) // Here we only consider PropertySignature, is this enough?
                .map(prop => {
                    const fieldType = typeNodeToTypeInfo(prop.getTypeNode()!);
                    return [prop.getName(), fieldType]
                });
            return { type: 'object', asString: typeLiteral.getText(), properties: pairs };
        default:
            throw new Error(`Unsupported TypeNode kind: ${SyntaxKind[typeNode.getKind()]}`);
    }
}

// type a = b
// type b = a
// that situation is not allowed anyway, so i do not think collecting visited necessary here.
// Ok?
// Get type that a type alias denotes.
export function resolveTypeReference(typeVar: string, typeVars: TypeVariables): TypeInfo {
    function inner(typeVar: string, typeVars: TypeVariables, visited: Set<string>): TypeInfo {
        const resolvedTypeInfo = typeVars.get(typeVar)
        if (resolvedTypeInfo) {
            return resolvedTypeInfo.type === TYPEINFO_TYPES.REFERENCE && !visited.has(resolvedTypeInfo.asString) ? inner(resolvedTypeInfo.asString, typeVars, visited.add(resolvedTypeInfo.asString)) : resolvedTypeInfo
        }

        throw Error(`Type ${typeVar} not known`)
    }

    return inner(typeVar, typeVars, new Set())
}

// Type predicates. Returns a boolean. If true ensures that 'typeInfo' is typed as PayloadType.
export function isPayloadType(typeInfo: TypeInfo, typeVars: TypeVariables): typeInfo is PayloadType {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.OBJECT:
            return true
        case TYPEINFO_TYPES.OBJECT1:
            return true
        case TYPEINFO_TYPES.UNION:
            return typeInfo.members.every(m => isPayloadType(m, typeVars))
        case TYPEINFO_TYPES.REFERENCE:
            const t = resolveTypeReference(typeInfo.asString, typeVars)
            return isPayloadType(t, typeVars)
        default:
            return false
    }
}

// Function to convert a TypeNode to PayloadType
export function typeNodeToPayloadType(typeNode: TypeNode, typeVars: TypeVariables): PayloadType {
    var typeInfo = typeNodeToTypeInfo(typeNode)
    // First level expanded by design.
    // We want 'message eventTypeName { ... fields of type denoted by type alias }'
    // instead of  'message eventTypeName { TypeAlias type_alias }' and 'message TypeAlias { ... fields of type denoted by type alias }
    if (typeInfo.type === TYPEINFO_TYPES.REFERENCE) {
        typeInfo = resolveTypeReference(typeInfo.asString, typeVars)
    }
    if (isPayloadType(typeInfo, typeVars)) {
        return typeInfo
    }

    throw new Error(`Unsupported TypeNode kind: ${SyntaxKind[typeNode.getKind()]}`);

}

// Get the type aliases used in a TypeInfo
function namesInTypeInfo(typeInfo: TypeInfo, typeVars: TypeVariables): string[] {
    function inner(typeInfo: TypeInfo, typeVars: TypeVariables, visited: Set<string>): string[] {
        const names: string[] = []
        switch (typeInfo.type) {
            case TYPEINFO_TYPES.OBJECT:
                return names.concat(typeInfo.properties.flatMap(([_, typeInfo]) => inner(typeInfo, typeVars, visited)))
            case TYPEINFO_TYPES.OBJECT1:
                return names.concat(typeInfo.properties.flatMap(p => inner(p.propertyType, typeVars, visited)))
            case TYPEINFO_TYPES.REFERENCE:
                if (!visited.has(typeInfo.asString)) {
                    names.push(typeInfo.asString)
                    return names.concat(inner(resolveTypeReference(typeInfo.asString, typeVars), typeVars, visited.add(typeInfo.asString)))
                }
                break;
            case "array":
                return names.concat(inner(typeInfo.elementType, typeVars, visited))
            case "union":
                return names.concat(typeInfo.members.flatMap(typeInfo => inner(typeInfo, typeVars, visited)))
            default:
                break
        }
        return names
    }

    return inner(typeInfo, typeVars, new Set())
}

// Get all the type aliases used in an Event
function usedNamesEvent(event: Event, typeVars: TypeVariables): string[] {
    if (event.eventKind === TYPEINFO_NAMES.WITH_PAYLOAD) {
        return namesInTypeInfo(event.payloadType, typeVars)
    }
    return []
}

// Get all the type aliases used in an EventSpec.
// This is used to 'clean' the type variables field of an EventSpec so that we can define message types for all
// type aliases denoting to an object type.
export function usedNames(eventSpec: EventSpec): Set<string> {
    return new Set(eventSpec.events.flatMap(event => usedNamesEvent(event, eventSpec.typeVariables)))
}

// If some field or union member array element has a type alias for a primitive type as type, replace by that type.
// Postpone all these union considerations though. Not implemented anyway when encoding.
function replacePrimitiveTypeVarsTypeInfo(typeInfo: TypeInfo, typeVars: TypeVariables): TypeInfo {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.BOOLEAN:
        case TYPEINFO_TYPES.NUMBER:
        case TYPEINFO_TYPES.STRING:
            return typeInfo
        case TYPEINFO_TYPES.REFERENCE:
            const resolvedType = resolveTypeReference(typeInfo.asString, typeVars)

            if (isPrimitiveType(resolvedType) || resolvedType.type === TYPEINFO_TYPES.ARRAY) { return resolvedType }
            return typeInfo
        case TYPEINFO_TYPES.ARRAY:
            return { ...typeInfo, elementType: replacePrimitiveTypeVarsTypeInfo(typeInfo.elementType, typeVars) }
        case TYPEINFO_TYPES.UNION:
            return { ...typeInfo, members: typeInfo.members.map(m => replacePrimitiveTypeVarsTypeInfo(m, typeVars)) }
        case TYPEINFO_TYPES.OBJECT:
            return { ...typeInfo, properties: typeInfo.properties.map(([fieldName, field]) => [fieldName, replacePrimitiveTypeVarsTypeInfo(field, typeVars)]) }
        case TYPEINFO_TYPES.OBJECT1:
            return { ...typeInfo, properties: typeInfo.properties.map((p) => {return {propertyName: p.propertyName, propertyType: replacePrimitiveTypeVarsTypeInfo(p.propertyType, typeVars)} }) }
    }
}

// If some field or union member array element has a type alias for a primitive type as type, replace by that type
function replacePrimitiveTypeVarsPayloadType(payloadType: PayloadType, typeVars: TypeVariables): PayloadType {
    switch (payloadType.type) {
        case TYPEINFO_TYPES.OBJECT:
            return { ...payloadType, properties: payloadType.properties.map(([fieldName, field]) => [fieldName, replacePrimitiveTypeVarsTypeInfo(field, typeVars)]) }
        case TYPEINFO_TYPES.OBJECT1:
            return { ...payloadType, properties: payloadType.properties.map(p => { return { propertyName: p.propertyName, propertyType: replacePrimitiveTypeVarsTypeInfo(p.propertyType, typeVars) }}) }
        case TYPEINFO_TYPES.UNION:
            // as PayloadType sketchy but what??
            return { ...payloadType, members: payloadType.members.map(field => replacePrimitiveTypeVarsTypeInfo(field, typeVars) as PayloadType) }
    }
}

// not sure this recurses deep enough. type A = string; type B = number; type C = A | B
// Do this to object properties, element types of arrays and members of union...
export function replacePrimitiveTypeVars(typeVars: TypeVariables): TypeVariables {
    const newTypeVariables = new Map()
    for (const [typeVar, theType] of typeVars.entries()) {
        newTypeVariables.set(typeVar, replacePrimitiveTypeVarsTypeInfo(theType, typeVars))
    }

    return newTypeVariables
}

// We do not want to define message types for primitive types.
// So whenever a type alias for a primtive type is used then replace by the actual type.
// Do this for events and typevariables
export function replacePrimitiveTypeVarsEventSpec(eventSpec: EventSpec): EventSpec {
    const mapper = (event: Event): Event => {
        return event.eventKind === TYPEINFO_NAMES.WITHOUT_PAYLOAD
            ? event
            : { ...event, payloadType: replacePrimitiveTypeVarsPayloadType(event.payloadType, eventSpec.typeVariables) }
    }

    return { ...eventSpec, typeVariables: replacePrimitiveTypeVars(eventSpec.typeVariables), events: eventSpec.events.map(mapper) }
}