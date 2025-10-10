import * as fs from "fs";
import path from "path";
import { spawn } from "child_process";
async function runProtoc(args) {
    const proc = spawn("npx", ["protoc", ...args]);
    await new Promise((resolve, reject) => {
        proc.once("error", reject);
        proc.once("close", (code) => code === 0 ? resolve() : reject(new Error(`protoc ended with code ${code}`)));
    });
}
async function main() {
    try {
        const protoBufFile = process.argv[2];
        const typeScriptFile = process.argv[3];
        if (!fs.existsSync(path.dirname(typeScriptFile))) {
            fs.mkdirSync(path.dirname(typeScriptFile), { recursive: true });
        }
        const protoBufFileTime = fs.statSync(protoBufFile).mtimeMs;
        if (!fs.existsSync(typeScriptFile) || protoBufFileTime > fs.statSync(typeScriptFile).mtimeMs) {
            runProtoc([
                `--ts_out`, `${path.dirname(typeScriptFile)}`,
                `--ts_opt`, `long_type_string`,
                `--proto_path`, `protos`, `${protoBufFile}`
            ]);
        }
    }
    catch (err) {
        throw err;
    }
}
main();
//# sourceMappingURL=compile_protobuf.js.map