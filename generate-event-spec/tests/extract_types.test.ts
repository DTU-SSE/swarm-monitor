import { describe, it, expect } from "@jest/globals";
import { extractTypesFromFile } from "../src/extract_types.js";
import { eventSpecToString } from "../src/types.js";
import { readFileSync } from "fs" // Is actually fine, it runs

describe("test warehouse demo with extra events", () => {
  const expected_1: string = readFileSync('tests/expected_event_spec_1.json', 'utf8');
  const json_1 = extractTypesFromFile("tests/protocol.ts");
  it("compare outputs protocol.ts", () =>
    expect(eventSpecToString(json_1, null, 2)).toEqual(expected_1)
  );
  const expected_2: string = readFileSync('tests/expected_event_spec_2.json', 'utf8');
  const json_2 = extractTypesFromFile("tests/protocol_2.ts");
  it("compare outputs protocol_2.ts", () =>
    expect(eventSpecToString(json_2, null, 2)).toEqual(expected_2)
  );
  /* it("extracts variables correctly", () => {
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
  }); */
});
