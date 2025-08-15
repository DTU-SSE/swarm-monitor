import type { TypeInfo, PayloadType, Types, Event, EventSpec } from "./types.js";
import { TypeNode, SyntaxKind, ArrayTypeNode, UnionTypeNode, TypeLiteralNode, PropertySignature } from "ts-morph";
import { TYPEINFO_TYPES, TYPEINFO_NAMES } from "./constants.js";

// Function to convert a TypeNode to TypeInfo
// Right now you can not do things like const a = "a"; type ClosingTimePayload = { timeOfDay: "typeof a" }; type PartIDPayload = {partName: "b"}
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
            //const properties = new Map<string, TypeInfo>(pairs);
            return { type: 'object', asString: typeLiteral.getText(), properties: pairs };
        default:
            throw new Error(`Unsupported TypeNode kind: ${SyntaxKind[typeNode.getKind()]}`);
    }
}

// type a = b
// type b = a

// Ok?
export function resolveTypeReference(typeVar: string, typeEnv: Types): TypeInfo {
    const typeInfo = typeEnv.get(typeVar)
    if (typeInfo) {
        return typeInfo.type === TYPEINFO_TYPES.REFERENCE ? resolveTypeReference(typeVar, typeEnv) : typeInfo
    }

    throw Error(`Type ${typeVar} not known`)

}

// Type predicates. Returns a boolean. If true ensures that 'typeInfo' is typed as PayloadType.
function isPayloadType(typeInfo: TypeInfo, typeEnv: Types): typeInfo is PayloadType {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.OBJECT:
            return true
        case TYPEINFO_TYPES.UNION:
            return typeInfo.members.every(m => isPayloadType(m, typeEnv))
        case TYPEINFO_TYPES.REFERENCE:
            const t = resolveTypeReference(typeInfo.asString, typeEnv)
            return isPayloadType(t, typeEnv)
        default:
            return false
    }
}

// Function to convert a TypeNode to PayloadType
export function typeNodeToPayloadType(typeNode: TypeNode, typeEnv: Types): PayloadType {
    var typeInfo = typeNodeToTypeInfo(typeNode)
    // First level expanded by design...
    if (typeInfo.type === TYPEINFO_TYPES.REFERENCE) {
        typeInfo = resolveTypeReference(typeInfo.asString, typeEnv)
    }
    if (isPayloadType(typeInfo, typeEnv)) {
        return typeInfo
    }

    throw new Error(`Unsupported TypeNode kind: ${SyntaxKind[typeNode.getKind()]}`);

}

function namesInTypeInfo(typeInfo: TypeInfo, types: Types): string[] {
    switch (typeInfo.type) {
      case "string":
      case "number":
      case "boolean":
      case "object":
      case "reference":
      case "array":
      case "union":
      throw Error
    }
}

function usedNamesEvent(event: Event, types: Types): string[] {
    if (event.eventKind === TYPEINFO_NAMES.WITH_PAYLOAD) {
      return namesInTypeInfo(event.payloadType, types)
    }
    return []
  }

export function usedNames(eventSpec: EventSpec): Set<string> {
    const events = eventSpec.events.flatMap(event => usedNamesEvent(event, eventSpec.types))

    throw Error
  }