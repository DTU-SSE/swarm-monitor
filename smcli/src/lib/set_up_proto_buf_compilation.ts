import path from "path";
import { updatePackageJson, type PackageJsonEntries } from "./update_package_json.js";
import * as fs from "fs"
import {
  Project,
  QuoteKind,
  VariableDeclarationKind,
  SourceFile,
} from "ts-morph";

//const isOlder()

const getDir = (somePath: string): string => {
    const resolvedPath = path.resolve(somePath)
    try {
        const stats = fs.statSync(resolvedPath)
        return stats.isFile() ? path.dirname(resolvedPath) : resolvedPath
    } catch (error) {
        throw error
    }
}

const containsFile = (dir: string, fileName: string): boolean => {
    const filePath = path.join(dir, fileName)
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
}

// Find nearest ancestral directory with a file called package.json.
// Consider this directory the project root and return it.
// If no success we stop at /. Sketchy.
const findProjectRoot = (aPath: string): string => {
    let dir = getDir(aPath)
    const isPackageRoot = (dir: string): boolean => containsFile(dir, "package.json")
    while (!isPackageRoot(dir)) {
        const parent = path.dirname(dir)
        if (parent === dir) {
            throw Error("No project root found")
        }
        dir = parent
    }

    return dir
}

const compileProtoBufScript = (filename: string, protoBufFile: string) => {
    const project = new Project({
      manipulationSettings: { quoteKind: QuoteKind.Double },
    });
    const sourceFile = project.createSourceFile(filename, "", { overwrite: true });
    sourceFile.addImportDeclaration( { moduleSpecifier: "fs", namespaceImport: "fs"})
    console.log(sourceFile.getText())

}


export async function setUpAutoCompile(somePath: string) {
    const updates: PackageJsonEntries = {
        devDependencies: [
            { key: "@protobuf-ts/plugin", value: "^2.11.1" },
            { key: "@protobuf-ts/runtime", value: "^2.11.1" },
            { key: "protoc", value: "^32.0.0" }
        ],
        scripts: [{ key: "compile-proto", value: "npx protoc --ts_out src/generated/ --ts_opt long_type_string --proto_path protos protos/*.proto" }]
    }

    const projectRoot = findProjectRoot(somePath)
    console.log(projectRoot)
    updatePackageJson(path.join(projectRoot, "package.json"), updates)

    fs.mkdirSync(path.join(projectRoot, "generated"), { recursive: true })
    fs.mkdirSync(path.join(projectRoot, "scripts"), { recursive: true })
    compileProtoBufScript("lala", "dklsajasdl")

}