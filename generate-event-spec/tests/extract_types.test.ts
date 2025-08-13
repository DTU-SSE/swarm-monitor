import { describe, it, expect } from "@jest/globals";
import { extractTypesFromFile } from "../src/extract_types.js";
import { eventSpecToString } from "../src/types.js";
import { readFileSync } from "fs" // Is actually fine, it runs

describe("test warehouse demo with extra events", () => {
  const expected: string = readFileSync('tests/expected_ASTData_1.json', 'utf8');
  const data = extractTypesFromFile("tests/protocol.ts");
  it("compare outputs", () =>
    expect(eventSpecToString(data, null, 2)).toEqual(expected)
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
