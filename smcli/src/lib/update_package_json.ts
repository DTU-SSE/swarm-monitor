import { readFileSync, writeFileSync } from "fs"
import { CommentArray, parse, stringify, type CommentObject } from "comment-json"
import type { PackageJson } from "package-json";
import path from "path";

export type KeyValue = { key: string, value: string }
export type PackageJsonEntries = { dependencies?: KeyValue[], devDependencies?: KeyValue[], scripts?: KeyValue[] }

const addToField = (obj: any, field: string, dependencies: KeyValue[]): any => {
    const updatedField = obj[field] ? obj[field] : {}
    for (const dependency of dependencies) {
        if (!(dependency.key in updatedField)) {
            updatedField[dependency.key] = dependency.value
        }
    }
    obj[field] = updatedField
    return obj
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
           packageJson = addToField(packageJson, "scripts", packageJsonEntries.scripts)
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