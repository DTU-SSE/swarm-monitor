import path from "path";
import { updateTsConfig, updatePackageJson, type PackageJsonEntries, findProjectRoot } from "./update_config_files.js";
import {
  Project,
  QuoteKind,
} from "ts-morph";

// typeScriptFile is the result of compiling protoBufFile to typescript.
// Recompile protoBufFile if it is younger than typeScriptFile
const compileProtoBufScript = (scriptFilename: string) => {
    const project = new Project({
      manipulationSettings: { quoteKind: QuoteKind.Double },
    });
    const sourceFile = project.createSourceFile(scriptFilename, "", { overwrite: true });

    // import * as fs from "fs"
    sourceFile.addImportDeclarations([
        { moduleSpecifier: "fs", namespaceImport: "fs" },
        { defaultImport: "path", moduleSpecifier: "path"},
        { namedImports: ["spawn"], moduleSpecifier: "child_process"}
    ])

    sourceFile.addFunction({
        name: "runProtoc",
        isAsync: true,
        parameters: [
        { name: "args", type: "string[]" }
        ],
        statements: writer => {
            writer.writeLine(`const proc = spawn("npx", ["protoc", ...args]);`)
            writer.write(`await new Promise<void>((resolve, reject) => `).inlineBlock(() => {
                writer.writeLine(`proc.once("error", reject);`)
                writer.writeLine(`proc.once("close", (code) => code === 0 ? resolve() : reject(new Error(\`protoc ended with code \${code}\`)));`)
            }).writeLine(");")
        }
    })

    const mainFunction = sourceFile.addFunction({
        name: "main",
        isAsync: true,
    });
    // try/catch block checking if typeScriptFile is younger than protoBufFile, compiling the latter if this is the case.
    mainFunction.addStatements(writer => {
        writer.write("try ").inlineBlock(() => {
            // Get files to check
            writer.writeLine("const protoBufFile = process.argv[2]!;")
            writer.writeLine("const typeScriptFile = process.argv[3]!;")

            writer.write("if (!fs.existsSync(path.dirname(typeScriptFile)))").inlineBlock(() => {
                writer.writeLine("fs.mkdirSync(path.dirname(typeScriptFile), {recursive: true});")
            })
            writer.writeLine("const protoBufFileTime = fs.statSync(protoBufFile).mtimeMs;")
            writer.write("if (!fs.existsSync(typeScriptFile) || protoBufFileTime > fs.statSync(typeScriptFile).mtimeMs)").inlineBlock(() => {
                writer.writeLine(`runProtoc([
            \`--ts_out\`, \`\${path.dirname(typeScriptFile)}\`,
            \`--ts_opt\`, \`long_type_string\`,
            \`--proto_path\`, \`protos\`, \`\${protoBufFile}\`
            ])`
                )
            })
        }).write(" catch (err)").inlineBlock(() => {
            writer.writeLine(`throw err`)
        })
    })

    sourceFile.addStatements(["main();"])

    sourceFile.saveSync()
}

export async function setUpAutoCompile(protoBufFile: string) {
    try {
        const updates: PackageJsonEntries = {
        devDependencies: [
            { key: "@protobuf-ts/plugin", value: "^2.11.1" }, // also installs protoc?
            { key: "@protobuf-ts/runtime", value: "^2.11.1" },
            { key: "typescript", value: "^5.9.2" },
            { key: "tsx", value: "^4.20.5" }
        ],
        scripts: [{ key: "compile-proto", value: `npx tsx scripts/compile_protobuf.ts ${protoBufFile} src/generated/${path.basename(protoBufFile, ".proto")}.ts`, preScript: true}]
        }

        const projectRoot = findProjectRoot(protoBufFile)
        updatePackageJson(path.join(projectRoot, "package.json"), updates)
        updateTsConfig(path.join(projectRoot, "tsconfig.json"), ["scripts/**/*.ts"])

        compileProtoBufScript(`${projectRoot}/scripts/compile_protobuf.ts`)
    } catch (err) {
        throw err
    }

}