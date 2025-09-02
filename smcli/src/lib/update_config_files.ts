import { readFileSync, writeFileSync } from "fs"
import { CommentArray, parse, stringify, type CommentObject } from "comment-json"
import type { PackageJson } from "package-json";
import path from "path";
import * as fs from "fs"

export type KeyValue = { key: string, value: string }
export type Script = { key: string, value: string, preScript: boolean }
export type PackageJsonEntries = { dependencies?: KeyValue[], devDependencies?: KeyValue[], scripts?: Script[] }

const addToField = (obj: any, field: string, keyValuePairs: KeyValue[]): any => {
    const updatedField = obj[field] ? obj[field] : {}
    for (const keyValuePair of keyValuePairs) {
        if (!(keyValuePair.key in updatedField)) {
            updatedField[keyValuePair.key] = keyValuePair.value
        }
    }
    obj[field] = updatedField
    return obj
}

// Add 'prescripts' https://docs.npmjs.com/cli/v7/using-npm/scripts. Called before every other pre-existing script.
// Then add all scripts.
const addScripts = (obj: PackageJson, scripts: Script[]): any => {
    const preScript = `${scripts.filter(script => script.preScript).map(script => `npm run ${script.key}`).join(" && ")}`
    if (obj.scripts && preScript.length != 0) {
        for (const scriptName in obj.scripts) {
            // These two conditions are a little redundant, but nice when we test things and run the command many times.
            if (scriptName !== "compile-proto" && !scriptName.startsWith("pre")) {
                obj.scripts[`pre${scriptName}`] = preScript
            }
        }
    }
    return addToField(obj, "scripts", scripts)
}


export function updatePackageJson(filePath: string, packageJsonEntries: PackageJsonEntries) {
    try {
        const text: string = readFileSync(path.resolve(filePath), "utf8");
        var packageJson: PackageJson = JSON.parse(text)
        if (packageJsonEntries.dependencies) {
           packageJson = addToField(packageJson, "dependencies", packageJsonEntries.dependencies)
        }
        if (packageJsonEntries.devDependencies) {
           packageJson = addToField(packageJson, "devDependencies", packageJsonEntries.devDependencies)
        }
        if (packageJsonEntries.scripts) {
           packageJson = addScripts(packageJson, packageJsonEntries.scripts)
        }

        writeFileSync(path.resolve(filePath), JSON.stringify(packageJson, null, 2), "utf-8")
    } catch (error) {
        throw error
    }
}

export function updateTsConfig(filePath: string, include: string[]) {
    try {
        const text: string = readFileSync(path.resolve(filePath), "utf8");
        const tsConfig = parse(text) as CommentObject
        if (tsConfig.include) {
            const includes: Set<string> = new Set<string>(tsConfig.include as CommentArray<string>);
            (tsConfig.include as CommentArray<string>).push(...include.filter(element => !includes.has(element)))
        }
        // Necessary to be able to use the ts files generated from .proto files.
        if ((tsConfig.compilerOptions as any)?.noUncheckedIndexedAccess) {
            (tsConfig.compilerOptions as any).noUncheckedIndexedAccess = false
        }
        if ((tsConfig.compilerOptions as any)?.noImplicitOverride) {
            (tsConfig.compilerOptions as any).noImplicitOverride = false
        }
        writeFileSync(path.resolve(filePath), stringify(tsConfig, null, 2), "utf-8")
    } catch (error) {
        throw error
    }
}

/* Functions working on directories. Not conceptually close to other functions here, but, used in mulitple places. */
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
export const findProjectRoot = (aPath: string): string => {
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