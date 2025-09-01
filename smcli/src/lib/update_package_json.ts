import { readFileSync, writeFileSync } from "fs"

export type KeyValue = { key: string, value: string }
export type PackageJsonEntries = { dependencies?: KeyValue[], devDependencies?: KeyValue[], scripts?: KeyValue[] }

const addToField = (obj: any, field: string, dependencies: KeyValue[]): any => {
    const updatedField = obj[field] ? obj[field] : {}
    for (const dependency of dependencies) {
        updatedField[dependency.key] = dependency.value
    }
    obj[field] = updatedField
    return obj
}

export function updatePackageJson(path: string, packageJsonEntries: PackageJsonEntries) {
    const packageJson: string = readFileSync(path, 'utf8');
    try {

        var jsonObject = JSON.parse(packageJson)
        if (packageJsonEntries.dependencies) {
           jsonObject = addToField(jsonObject, "dependencies", packageJsonEntries.dependencies)
        }
        if (packageJsonEntries.devDependencies) {
           jsonObject = addToField(jsonObject, "devDependencies", packageJsonEntries.devDependencies)
        }
        if (packageJsonEntries.scripts) {
           jsonObject = addToField(jsonObject, "scripts", packageJsonEntries.scripts)
        }

        writeFileSync(path, JSON.stringify(jsonObject, null, 2))
    } catch (error) {
        throw error
    }
}
//npx protoc --ts_out src/generated/ --ts_opt long_type_string --proto_path protos protos/*.proto
//    "@protobuf-ts/plugin": "^2.11.1",
// "@protobuf-ts/runtime": "^2.11.1"