import { describe, it, expect } from "@jest/globals";
import { generateProtoBufMsgDefs } from "../src/protobuf_codegen.js";
import { metaMsgType, eventSpecToProtoBuf } from "../src/encode_protobuf.js";
import {readFileSync, unlinkSync } from "fs" // Is actually fine, it runs
import protobuf from "protobufjs";
import { extractTypesFromFile } from "../src/extract_types.js";

const OUTDIR = "tests"

// We test encodeMeta() by generating a whole package out of it.
// Also testing codegen while doing that.
function generateMetaWithNamespace(): protobuf.Root {
    const root = new protobuf.Root()
    const namespace = root.define("Meta")
    const meta = metaMsgType()
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
        const outputFile = "output_1.proto"
        await generateProtoBufMsgDefs(root, outputFile, OUTDIR)
        const generated = readFileSync(`${OUTDIR}/${outputFile}`, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(`${OUTDIR}/${outputFile}`)
    })

    it("generated meta.proto should be equal to expected meta information message format", async () => {
        const expected: string = readFileSync('tests/expected_meta_w_package.proto', 'utf8');
        const root = generateMetaWithNamespace()
        const outputFile = "output_meta.proto"
        await generateProtoBufMsgDefs(root, outputFile, OUTDIR)
        const generated = readFileSync(`${OUTDIR}/${outputFile}`, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(`${OUTDIR}/${outputFile}`)
    })
    it("generate .proto from tests/warehouse-demo-events.ts", async () => {
        const expected: string = readFileSync('tests/expected_output_3_lbj.proto', 'utf8');
        const eventSpec = extractTypesFromFile("tests/warehouse-demo-events.ts");
        const root = eventSpecToProtoBuf("test", eventSpec, true)
        const outputFile = "output_3.proto"
        await generateProtoBufMsgDefs(root, outputFile, OUTDIR)
        const generated = readFileSync(`${OUTDIR}/${outputFile}`, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(`${OUTDIR}/${outputFile}`)
    })


});