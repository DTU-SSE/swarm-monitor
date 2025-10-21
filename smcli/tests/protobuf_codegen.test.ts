import { describe, it, expect } from "@jest/globals";
import { generateProtoBufMsgDefs } from "../src/lib/protobuf_codegen.js";
import { metaMsgType, eventSpecToProtoBuf } from "../src/lib/encode_protobuf.js";
import {readFileSync, unlinkSync } from "fs" // Is actually fine, it runs
import protobuf from "protobufjs";
import { eventSpecificationCleaned } from "../src/lib/extract_types.js";

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
        const outputFile = `${OUTDIR}/output_1.proto`
        await generateProtoBufMsgDefs(root, outputFile)
        const generated = readFileSync(outputFile, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(outputFile)
    })

    it("generated meta.proto should be equal to expected meta information message format", async () => {
        const expected: string = readFileSync('tests/expected_meta_w_package.proto', 'utf8');
        const root = generateMetaWithNamespace()
        const outputFile = `${OUTDIR}/output_meta.proto`
        await generateProtoBufMsgDefs(root, outputFile)
        const generated = readFileSync(outputFile, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(outputFile)
    })
    it("generate .proto from tests/warehouse-demo-events.ts", async () => {
        const expected: string = readFileSync('tests/expected_output_3_lbj.proto', 'utf8');
        const eventSpec = eventSpecificationCleaned("tests/warehouse-demo-events.ts");
        const root = eventSpecToProtoBuf("test", eventSpec, true)
        const outputFile = `${OUTDIR}/output_3.proto`
        await generateProtoBufMsgDefs(root, outputFile)
        const generated = readFileSync(outputFile, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(outputFile)
    })
    it("generate .proto with nested messages as separate message types", async () => {
        const expected: string = readFileSync('tests/expected_output_protocol_4.proto', 'utf8');
        const eventSpec = eventSpecificationCleaned("tests/protocol_4.ts");
        const root = eventSpecToProtoBuf("test", eventSpec, true)
        const outputFile = `${OUTDIR}/output_4.proto`
        await generateProtoBufMsgDefs(root, outputFile)
        const generated = readFileSync(outputFile, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(outputFile)
    })
    it("generate .proto with nested messages", async () => {
        const expected: string = readFileSync('tests/expected_output_protocol_5.proto', 'utf8');
        const eventSpec = eventSpecificationCleaned("tests/protocol_5.ts");
        const root = eventSpecToProtoBuf("test", eventSpec, true)
        const outputFile = `${OUTDIR}/output_5.proto`
        await generateProtoBufMsgDefs(root, outputFile)
        const generated = readFileSync(outputFile, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(outputFile)
    })
    it("car-factory example", async () => {
        const expected: string = readFileSync('tests/expected_car_factory.proto', 'utf8');
        const eventSpec = eventSpecificationCleaned("tests/car_factory_protocol.ts");
        const root = eventSpecToProtoBuf("car_factory_messages", eventSpec, true)
        const outputFile = `${OUTDIR}/car_factory.proto`
        await generateProtoBufMsgDefs(root, outputFile)
        const generated = readFileSync(outputFile, 'utf8')
        expect(generated).toEqual(expected)
        unlinkSync(outputFile)
    })
});