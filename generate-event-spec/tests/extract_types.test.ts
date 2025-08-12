import { describe, it, expect } from "@jest/globals";
import { extractTypesFromFile } from "../src/extract_types.js";
import type { ASTData } from "../src/extract_types.js";
describe("test warehouse demo with extra events", () => {
  const variables: ASTData['variables'] = new Map([
    ['var1', 'pos'],
    ['posName', 'pos'],
    ['partReqName', 'partReq']
  ]);

  const types: ASTData['types'] = new Map([
    ['ClosingTypeNested', '{ number: number }'],
    ['ClosingTimePayload', '{ timeOfDay: string, nested: ClosingTypeNested, closing: ClosingTimePayload }'],
    ['PartReqPayload', '{partName: string}'],
    ['PosPayload', '{position: string, partName: string}'],
    ['PartOKPayload', '{partName: string}'],
    ['CarPayload', '{partName: string, modelName: string}']
  ]);

  const events: ASTData['events'] = [
    { name: 'partReq', eventKind: 'withPayload', payloadType: { typeAsString: 'PartReqPayload', kind: 'typeReference' }},
    { name: 'partOK', eventKind: 'withPayload', payloadType: { typeAsString: 'PartOKPayload', kind: 'typeReference' }},
    { name: 'pos', eventKind: 'withPayload', payloadType: { typeAsString: 'PosPayload', kind: 'typeReference' }},
    { name: 'closingTime', eventKind: 'withPayload', payloadType: { typeAsString: 'ClosingTimePayload', kind: 'typeReference' }},
    { name: 'car', eventKind: 'withPayload', payloadType: { typeAsString: 'CarPayload', kind: 'typeReference' }},
    { name: 'thing', eventKind: 'withPayload', payloadType: { typeAsString: '{name: string}', kind: 'typeLiteral' }},
    { name: 'noPayload', eventKind: 'withoutPayload' },
    { name: 'noPayload1', eventKind: 'withoutPayload' }
  ];

  const data = extractTypesFromFile("tests/protocol.ts");
  it("extracts variables correctly", () => {
    expect(data.variables).toEqual(variables);
  });
  it("extracts types correctly", () => {
    expect(data.types).toEqual(types);
  });
  it("extracts events correctly", () => {
    expect(data.events).toEqual(events);
  });
  it("extracts all data correctly", () => {
    expect(data).toEqual({ variables, types, events });
  });
});
