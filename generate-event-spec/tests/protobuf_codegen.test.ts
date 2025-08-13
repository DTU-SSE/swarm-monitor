import { describe, it, expect } from "@jest/globals";
import { generateProtoBufMsgDefs } from "../src/protobuf_codegen.js";
import { encodeMeta } from "../src/encode_protobuf.js";
import {readFileSync, unlinkSync } from "fs" // Is actually fine, it runs
import protobuf from "protobufjs";

// We test encodeMeta() by generating a whole package out of it.
// Also testing codegen while doing that.
function generateMetaWithNamespace(): protobuf.Root {
    const root = new protobuf.Root()
    const namespace = root.define("Meta")
    const meta = encodeMeta()
    namespace.add(meta)
    return root
}

describe("test dummy messages", () => {
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

    it("generated meta.proto should be equal to expected meta information message format", async () => {
        const expected: string = readFileSync('tests/expected_meta_w_package.proto', 'utf8');
        const root = generateMetaWithNamespace()
        const outputPath = "tests/output_meta.proto"
        await generateProtoBufMsgDefs(root, outputPath)
        const generated = readFileSync(outputPath, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(outputPath)
    })

});