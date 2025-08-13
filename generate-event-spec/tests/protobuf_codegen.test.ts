import { describe, it, expect } from "@jest/globals";
import { generateProtoBufMsgDefs } from "../src/protobuf_codegen.js";
import {readFileSync, unlinkSync } from "fs" // Is actually fine, it runs
import protobuf from "protobufjs";

describe("test dummy message", () => {
    it("generated .proto should be equal to expected", async () => {
        const expected: string = readFileSync('tests/expected_message_1.proto', 'utf8');
        const root = new protobuf.Root()
        const msg = new protobuf.Type("TestMessage")
            .add(new protobuf.Field("field1", 1, "int32"))
            .add(new protobuf.Field("field2", 2, "string"));

        root.define("test.namespace").add(msg);
        const outputPath = "tests/output_1.proto"
        await generateProtoBufMsgDefs(root, outputPath)
        const generated = readFileSync(outputPath, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(outputPath)
    })
});
