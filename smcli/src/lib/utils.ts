import { type TypeInfo, type PayloadType, type TypeVariables, type Event, type EventSpec } from "./types.js";
import { TYPEINFO_TYPES, TYPEINFO_NAMES } from "./constants.js";

// type a = b
// type b = a
// that situation is not allowed anyway, so i do not think collecting visited necessary here.
// Ok?
// Get type that a type alias denotes.
export function resolveTypeReference(typeVar: string, typeVars: TypeVariables): TypeInfo {
    function inner(typeVar: string, typeVars: TypeVariables, visited: Set<string>): TypeInfo {
        const resolvedTypeInfo = typeVars.get(typeVar)
        if (resolvedTypeInfo) {
            return resolvedTypeInfo.type === TYPEINFO_TYPES.REFERENCE && !visited.has(resolvedTypeInfo.asString) 
                ? inner(resolvedTypeInfo.asString, typeVars, visited.add(resolvedTypeInfo.asString)) 
                : resolvedTypeInfo
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
        case TYPEINFO_TYPES.UNION:
            return typeInfo.members.every(m => isPayloadType(m, typeVars))
        case TYPEINFO_TYPES.REFERENCE:
            const t = resolveTypeReference(typeInfo.asString, typeVars)
            return isPayloadType(t, typeVars)
        default:
            return false
    }
}

// Get the type aliases used in a TypeInfo
function namesInTypeInfo(typeInfo: TypeInfo, typeVars: TypeVariables): string[] {
    function inner(typeInfo: TypeInfo, typeVars: TypeVariables, visited: Set<string>): string[] {
        const names: string[] = []
        switch (typeInfo.type) {
            case TYPEINFO_TYPES.OBJECT:
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
    return new Set(eventSpec.events.flatMap(event => usedNamesEvent(event, eventSpec.context.typeVariables)))
}