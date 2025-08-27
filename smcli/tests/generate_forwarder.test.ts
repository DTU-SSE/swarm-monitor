import { describe, it, expect } from "@jest/globals";
import { getText, generateForwarder } from "../src/gen_forwarder.js"
import { readFileSync } from "fs" // Is actually fine, it runs


describe("test forwarder generateion", () => {
  it("compare output to an example forwarder", () => {
    const expected: string = readFileSync("tests/expected_forwarder.ts", 'utf8');
    const forwarder = getText(generateForwarder("tests/forwarder.config.json", "forwarder.ts"), "forwarder.ts")
    expect(forwarder).toEqual(expected)
  });
});
