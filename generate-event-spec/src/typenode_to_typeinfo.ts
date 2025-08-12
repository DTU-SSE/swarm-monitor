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
            const properties = new Map<string, TypeInfo>(pairs);
            return { type: 'object', asString: typeLiteral.getText(), properties };
        default:
            throw new Error(`Unsupported TypeNode kind: ${SyntaxKind[typeNode.getKind()]}`);
    }
}