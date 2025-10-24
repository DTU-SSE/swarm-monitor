import protobuf from 'protobufjs'
import { type EventSpec, type Event, type TypeInfo, type TypeVariables, type PayloadType, type Option, some, none, isSome, type ProtobufFieldType, getFieldType, type UnionType, isListOfTypeReferences, type ObjectType, type PropertyInfo } from './types.js';
import type { Root } from 'protobufjs';
import { PROTOBUF_FIELD_TYPES, PROTOBUF_NAMES, META_NAMES, TYPEINFO_TYPES, TYPEINFO_NAMES } from './constants.js'
import snakeCase from 'lodash.snakecase'
import { checkEventSpec } from './utils.js';

type FieldGenerator = (fieldNumber?: number) => protobuf.Field

const META_FIELD_NUMBER = 1
const LASTUP_FIELD_NUMBER = 2
class FieldNumbeHandler {
    private static oneOfCounter: number = 1

    static nextOneOfId(): string {
        return `oneof_${FieldNumbeHandler.oneOfCounter++}`
    }
    // Maps numbers to numbers used as field numbers taking into account the fact that
    // field numbers start at 1 and we have reserved 1 and 2 for meta and last up
    static nextFieldNumber(n: number): number {
        return n + 3
    }
}

// Transform an EventSpec to a 'Root' -- data structure representing a set of protobuf message types.
export const eventSpecToProtoBuf = (packageName: string, eventSpec: EventSpec, branchTracking = false): Root => {
    const eventSpecErrors = checkEventSpec(eventSpec)
    if (eventSpecErrors.length > 0) {
        throw Error(eventSpecErrors.join(",\n"))
    }
    const root = new protobuf.Root()
    const namespace = root.define(packageName)

    // Add meta as a message type
    const meta = metaMsgType()
    namespace.add(meta)

    // Encode the type definitions referred to by payload types
    addMessagesToNamespace(namespace, encodeTypeAliases(eventSpec.context.typeVariables))

    const extra: FieldGenerator[] = branchTracking ? [metaField, lastUpField] : [metaField]

    for (const event of eventSpec.events) {
        namespace.add(eventToProtoBufType(event, extra))
    }

    namespace.add(topLevelEvent(eventSpec.events))
    return root
}

// Generate the overall message type that includes the different event types as variants
const topLevelEvent = (events: Event[]): protobuf.Type => {
    const sealedValue = new protobuf.Type(PROTOBUF_NAMES.TOP_LEVEL_EVENT_NAME)
    for (const [index, event] of events.entries()) {
        sealedValue.add(new protobuf.Field(snakeCase(event.eventTypeName), FieldNumbeHandler.nextFieldNumber(index), event.eventTypeName)) // Field numbers start at 1
    }

    sealedValue.add(new protobuf.OneOf(PROTOBUF_NAMES.SEALED_VALUE, events.map(e => snakeCase(e.eventTypeName))));
    return sealedValue
}

// Transform type aliases denoting object types as message types
const encodeTypeAliases = (typeVariables: TypeVariables): protobuf.Type[] => {
    const mapper = (typeName: string, typeInfo: PayloadType) => {
        return eventToProtoBufType({ eventTypeName: typeName, eventKind: TYPEINFO_NAMES.WITH_PAYLOAD, payloadType: typeInfo })
    }

    return Array.from(typeVariables)
        .filter(([_, typeInfo]) => typeInfo.type === TYPEINFO_TYPES.OBJECT || typeInfo.type === TYPEINFO_TYPES.UNION)
        .map(([typeName, typeInfo]) => mapper(typeName, typeInfo as PayloadType))
}

const unionTypeToOneOf = (
    unionType: UnionType,
    validUnionMember: (member: TypeInfo) => boolean,
    toField: (member: TypeInfo, fieldName: string, fieldNumber: number) => protobuf.Field,
    fieldNumberOffset = 0,
    oneOfFieldName?: string
): protobuf.OneOf => {
    const violator = unionType.members.find(member => !validUnionMember(member))
    if (violator) {
        throw Error(`Invalid union member type: ${violator?.type}`)
    }
    const oneOfName = oneOfFieldName ?? FieldNumbeHandler.nextOneOfId()
    const oneOf = new protobuf.OneOf(oneOfName)

    unionType.members.forEach((member, index) => {
        oneOf.add(toField(member, `${oneOfName}_${index}`, index + fieldNumberOffset))
    })

    return oneOf
}

// Assign a number to each property. Use to generate field numbers in a message type.
// Generally, associate with each property its index in the list of properties.
// Special care needs to be taken when we encounter unions. Unions do not themselves have a field number, but their members do
// these are at the same level as rest of fields (field number wise) --> counter the number of members
// --> next property after union is associated with n = number of members in previous union + index of property with union type.
const enumerateProperties = (objectType: ObjectType): [number, PropertyInfo][] => {
    type EnumerateAccumulator = { currentId: number, numbersAndProperties: [number, PropertyInfo][] }
    const folder = (acc: EnumerateAccumulator, propertyInfo: PropertyInfo): EnumerateAccumulator => {
        acc.numbersAndProperties.push([acc.currentId, propertyInfo])
        const nextId = propertyInfo.propertyType.type === TYPEINFO_TYPES.UNION
            ? acc.currentId + propertyInfo.propertyType.members.length
            : acc.currentId + 1

        return { currentId: nextId, numbersAndProperties: acc.numbersAndProperties }

    }

    return objectType
        .properties
        .reduce(folder, { currentId: 0, numbersAndProperties: [] })
        .numbersAndProperties
}

// Transform the fields of an object type used as payload type to an array of 'ReflectionObject'
// which is a type we use to represent the fields of a message type. A field can itself be a message type.
// Unions of object types supported as Actyx payload type, but currently not supported here.
const payloadTypeToFields = (payloadType: PayloadType): protobuf.ReflectionObject[] => {
    switch (payloadType.type) {
        case TYPEINFO_TYPES.OBJECT:
            return enumerateProperties(payloadType).map(([id, { propertyName, propertyType }]) => typeInfoToField(propertyType, propertyName, id))
        case TYPEINFO_TYPES.UNION:
            // The 'as' thing looks dangerous -- but we've checked that things are ok in eventSpecToProtoBuf.
            // Not nice that we do not check top level unions -- only refernces to objects ok here.
            return [unionTypeToOneOf(payloadType, isOkUnionMember, (typeInfoToField as (member: TypeInfo, fieldName: string, fieldNumber: number) => protobuf.Field))]
        default:
            throw Error(`Invalid payload type: ${typeNameForErrorMessage(payloadType)}`)
    }
}

// Primitive TypeInfo type or reference to ProtoBufFieldType. Consider of Option show is necessary
const resolveSimpleType = (typeInfo: TypeInfo): Option<ProtobufFieldType> => {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.BOOLEAN:
            return some(PROTOBUF_FIELD_TYPES.BOOL)
        case TYPEINFO_TYPES.NUMBER:
            return some(PROTOBUF_FIELD_TYPES.DOUBLE)
        case TYPEINFO_TYPES.STRING:
            return some(PROTOBUF_FIELD_TYPES.STRING)
        case TYPEINFO_TYPES.REFERENCE:
            return some({ userDefined: typeInfo.asString })
        default:
            return none
    }
}
// We can not have inlined objects as members of a oneof
const isOkUnionMember = (unionTypeMember: TypeInfo): boolean => {
    return unionTypeMember.type !== TYPEINFO_TYPES.OBJECT
}

// Transform a TypeInfo to a ReflectionObject. Used to create the fields of a message type.
const typeInfoToField = (typeInfo: TypeInfo, fieldName: string, fieldNumber: number): protobuf.ReflectionObject => {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.BOOLEAN:
        case TYPEINFO_TYPES.NUMBER:
        case TYPEINFO_TYPES.STRING:
        case TYPEINFO_TYPES.REFERENCE:
            const protoBufType = resolveSimpleType(typeInfo)
            if (isSome(protoBufType)) {
                return generateField(fieldName, fieldNumber, protoBufType.value)
            }
            break
        // Right now only arrays of bools, numbers, strings or typealiases are allowed as element types of arrays.
        case TYPEINFO_TYPES.ARRAY:
            const elementProtoBufType = resolveSimpleType(typeInfo.elementType)
            if (isSome(elementProtoBufType)) {
                return generateField(fieldName, fieldNumber, elementProtoBufType.value, PROTOBUF_NAMES.REPEATED)
            }
            break
        case TYPEINFO_TYPES.UNION:
            return unionTypeToOneOf(typeInfo, isOkUnionMember, (typeInfoToField as (member: TypeInfo, fieldName: string, fieldNumber: number) => protobuf.Field), fieldNumber, fieldName) // as not good
        case TYPEINFO_TYPES.OBJECT:
            const msgType = new protobuf.Type(fieldName)
            const encodedObject = payloadTypeToFields(typeInfo)
            addFields(msgType, encodedObject)
            return msgType
    }

    throw Error(`Support for ${typeNameForErrorMessage(typeInfo)} not implemented`)
}

// Consider this
//function makeMsgType()

// Transform an Event to a protobuf message type
const eventToProtoBufType = (event: Event, extra: FieldGenerator[] = []): protobuf.Type => {
    const msgType = new protobuf.Type(event.eventTypeName)
    const fields = event.eventKind === TYPEINFO_NAMES.WITH_PAYLOAD ? payloadTypeToFields(event.payloadType) : []
    addFields(msgType, fields.concat(extra.map((generateField, index) => generateField(fields.length + index))))
    return msgType
}

const addFields = (msgType: protobuf.Type, fields: protobuf.ReflectionObject[]): void => {
    for (const field of fields) {
        msgType.add(field)
    }
}

const generateField = (fieldName: string, fieldNumber: number, fieldType: ProtobufFieldType, rule?: (string | { [k: string]: any })): protobuf.Field => {
    return new protobuf.Field(fieldName, FieldNumbeHandler.nextFieldNumber(fieldNumber), getFieldType(fieldType), rule)
}

const addMessagesToNamespace = (namespace: protobuf.Namespace, msgTypes: protobuf.Type[]): void => {
    for (const msgType of msgTypes) {
        namespace.add(msgType)
    }
}

/*
    Generate the Meta message type. Always included in actyx events at runtime.
    Always part of the corresponding protobuf version of the event.

    Always has the shape:
    message Meta {
        bool is_local_event = 1;
        repeated string tags = 2;
        uint64 timestamp_micros = 3;
        uint32 lamport = 4;
        string app_id = 5;
        string event_id = 6;
        string stream = 7;
        uint32 offset = 8;
    }
*/
export const metaMsgType = (): protobuf.Type => {
    const msgType = new protobuf.Type(PROTOBUF_FIELD_TYPES.META)
    msgType.add(generateField(META_NAMES.IS_LOCAL_EVENT, 0, PROTOBUF_FIELD_TYPES.BOOL))
    msgType.add(generateField(META_NAMES.TAGS, 1, PROTOBUF_FIELD_TYPES.STRING, PROTOBUF_NAMES.REPEATED))
    msgType.add(generateField(META_NAMES.TIMESTAMP_MICROS, 2, PROTOBUF_FIELD_TYPES.UINT64))
    msgType.add(generateField(META_NAMES.LAMPORT, 3, PROTOBUF_FIELD_TYPES.UINT32))
    msgType.add(generateField(META_NAMES.APP_ID, 4, PROTOBUF_FIELD_TYPES.STRING))
    msgType.add(generateField(META_NAMES.EVENT_ID, 5, PROTOBUF_FIELD_TYPES.STRING))
    msgType.add(generateField(META_NAMES.STREAM, 6, PROTOBUF_FIELD_TYPES.STRING))
    msgType.add(generateField(META_NAMES.OFFSET, 7, PROTOBUF_FIELD_TYPES.UINT32))
    return msgType
}

// Generate the Meta field. Always a field of a message type.
export const metaField = (): protobuf.Field => {
    return new protobuf.Field(META_NAMES.META_NAME_FIELD, META_FIELD_NUMBER, PROTOBUF_FIELD_TYPES.META)
}

// Generate the last updating event field.
export const lastUpField = (): protobuf.Field => {
    return new protobuf.Field(PROTOBUF_NAMES.LAST_UP, LASTUP_FIELD_NUMBER, PROTOBUF_FIELD_TYPES.STRING)
}

export const typeNameForErrorMessage = (typeInfo: TypeInfo): string => {
    switch (typeInfo.type) {
        case TYPEINFO_TYPES.BOOLEAN:
        case TYPEINFO_TYPES.NUMBER:
        case TYPEINFO_TYPES.STRING:
            return typeInfo.type
        case TYPEINFO_TYPES.REFERENCE:
            return typeInfo.asString
        case TYPEINFO_TYPES.ARRAY:
            const elementTypeName = typeNameForErrorMessage(typeInfo.elementType)
            return `${elementTypeName}[]`
        case TYPEINFO_TYPES.UNION:
            return typeInfo.members.map(typeNameForErrorMessage).join(" | ")
        case TYPEINFO_TYPES.OBJECT:
            const propertyNames = typeInfo.properties.map(p => `${p.propertyName} : ${typeNameForErrorMessage(p.propertyType)}`)
            return `{ ${propertyNames.join(", ")} }`
    }
}