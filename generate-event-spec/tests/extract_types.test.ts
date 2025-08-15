import { describe, it, expect } from "@jest/globals";
import { extractTypesFromFile } from "../src/extract_types.js";
import { eventSpecToString } from "../src/types.js";
import { usedNames } from "../src/utils.js"
import { readFileSync } from "fs" // Is actually fine, it runs
import isEqual from 'lodash.isequal'

describe("test warehouse demo with extra events", () => {
  it("compare outputs protocol.ts", () => {
    const expected: string = readFileSync('tests/expected_event_spec_1.json', 'utf8');
    const event_spec = extractTypesFromFile("tests/protocol_1.ts");
    expect(eventSpecToString(event_spec, null, 2)).toEqual(expected)
  });

  it("compare outputs protocol_2.ts", () => {
    const expected: string = readFileSync('tests/expected_event_spec_2.json', 'utf8');
    const event_spec = extractTypesFromFile("tests/protocol_2.ts");
    expect(eventSpecToString(event_spec, null, 2)).toEqual(expected)
  });

  it("check used names are identified correctly union and recursive types", () => {
    // ClosingTimePayload and PartReqPayload appears because PartReq has the payload type PartReqPayload | ClosingTimePayload
    // Also ClosingTypePayload recursively in terms of itself, has a field of type ClosingTypePayload
    // Other type aliases used for event payload types are inlined
    const event_spec = extractTypesFromFile("tests/protocol_2.ts");
    const expected = new Set(["Haha", "ClosingTypeNested", "ClosingTimePayload", "Boing", "Laquo", "PartReqPayload"])
    expect(isEqual(usedNames(event_spec), expected)).toEqual(true)
  });

  it("check used names are identified correctly recursive types", () => {
    const event_spec = extractTypesFromFile("tests/protocol_4.ts");
    //console.log(eventSpecToString(event_spec, null, 2))
    // ClosingTypePayload recursively in terms of itself, has a field of type ClosingTypePayload
    // Other type aliases used for event payload types are inlined
    const expected = new Set(["Haha", "ClosingTypeNested", "ClosingTimePayload", "Boing", "Laquo"])
    expect(isEqual(usedNames(event_spec), expected)).toEqual(true)
  })

});
