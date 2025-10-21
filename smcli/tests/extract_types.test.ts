import { describe, it, expect } from "@jest/globals";
import { eventSpecification, eventSpecificationCleaned } from "../src/lib/extract_types.js";
import { eventSpecToString } from "../src/lib/types.js";
import { usedNames } from "../src/lib/utils.js"
import { readFileSync } from "fs" // Is actually fine, it runs
import isEqual from 'lodash.isequal'
// TODO: Test clean event spec
describe("test warehouse demo with extra events", () => {
  it("compare outputs protocol.ts", () => {
    const expected: string = readFileSync('tests/expected_event_spec_1_1.json', 'utf8');
    const expectedCleaned: string = readFileSync('tests/expected_event_spec_1_cleaned.json', 'utf8');
    const eventSpec = eventSpecification("tests/protocol_1.ts");
    expect(eventSpecToString(eventSpec, null, 2)).toEqual(expected)
    const cleanedEventSpec = eventSpecificationCleaned("tests/protocol_1.ts");
    expect(eventSpecToString(cleanedEventSpec, null, 2)).toEqual(expectedCleaned)
  });

  /* it("compare outputs protocol_2.ts", () => {
    const expected: string = readFileSync('tests/expected_event_spec_2_new.json', 'utf8');
    const event_spec = eventSpecification("tests/protocol_2.ts");
    expect(eventSpecToString(event_spec, null, 2)).toEqual(expected)
  });

  it("check used names are identified correctly union and recursive types", () => {
    // ClosingTimePayload and PartReqPayload appears because PartReq has the payload type PartReqPayload | ClosingTimePayload
    // Also ClosingTypePayload recursively in terms of itself, has a field of type ClosingTypePayload
    // Other type aliases used for event payload types are inlined
    const event_spec = eventSpecification("tests/protocol_2.ts");
    // Haha is not included -- resolved as string. Boing not included -- resovled as Laquo
    const expected = new Set(["ClosingTypeNested", "ClosingTimePayload", "Laquo", "PartReqPayload"])
    expect(isEqual(usedNames(event_spec), expected)).toEqual(true)
  });

  it("check used names are identified correctly recursive types", () => {
    const event_spec = eventSpecification("tests/protocol_4.ts");
    // ClosingTypePayload recursively in terms of itself, has a field of type ClosingTypePayload
    // Other type aliases used for event payload types are inlined
    // Boing is resolved to Lars
    const expected = new Set(["ClosingTypeNested", "ClosingTimePayload", "Lars"])
    expect(isEqual(usedNames(event_spec), expected)).toEqual(true)
  }) */

});
