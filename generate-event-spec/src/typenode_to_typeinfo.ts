import type { TypeInfo } from "./types.js";
import { TypeNode, SyntaxKind, ArrayTypeNode, UnionTypeNode, TypeLiteralNode, PropertySignature } from "ts-morph";

// Function to convert a TypeNode to TypeInfo
export function typeNodeToTypeInfo(typeNode: TypeNode): TypeInfo {
    switch (typeNode.getKind()) {
        case SyntaxKind.StringKeyword:
            return { type: 'string', asString: typeNode.getText() };
        case SyntaxKind.NumberKeyword:
            return { type: 'number', asString: typeNode.getText() };
        case SyntaxKind.BooleanKeyword:
            return { type: 'boolean', asString: typeNode.getText() };
        case SyntaxKind.TypeReference:
            return { type: 'reference', asString: typeNode.getText() };
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
        case SyntaxKind.TypeLiteral:
            const objectType = typeNode as TypeLiteralNode;
            const properties = new Map<string, TypeInfo>();
            objectType.getMembers().forEach(member => {
                if (SyntaxKind.PropertySignature === member.getKind()) {
                    const prop = member as PropertySignature;
                    properties.set(prop.getName(), typeNodeToTypeInfo(prop.getTypeNode()!));
                }
            });
            return { type: 'object', asString: objectType.getText(), properties };
        default:
            throw new Error(`Unsupported TypeNode kind: ${SyntaxKind[typeNode.getKind()]}`);
    }
}