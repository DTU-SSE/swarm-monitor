import { readFileSync } from "fs"

export function updatePackageJson(path: string) {
    console.log(`${JSON.stringify(path)}`)
    const packageJson: string = readFileSync(path, 'utf8');
    //console.log(packageJson)
    try {
        const jsonObject = JSON.parse(packageJson)

    } catch (error) {
        throw error
    }
}