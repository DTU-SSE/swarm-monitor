import {
  Project,
  QuoteKind,
  VariableDeclarationKind,
  SourceFile,
  ts
} from "ts-morph";

import fs, { type PathLike } from 'fs';
import { z } from "zod";
import { FORWARDER_CONSTANTS } from "./constants.js";
import { findProjectRoot, updatePackageJson } from "./update_config_files.js";
import type { PackageJsonEntries } from "./update_config_files.js";
import path from "path";

const ImportInfoSchema = z.object({
  item: z.string(),
  file: z.string()
})
const ManifestSchema = z.object({
  appId: z.string(),
  displayName: z.string(),
  version: z.string()
})
const ManifestFieldSchema = z.union([
  z.object({
    type: z.literal("literal"),
    manifest: ManifestSchema
  }),
  z.object({
    type: z.literal("import"),
    manifest: ImportInfoSchema
  })
])

// Imports are a little sketchy. Their exact syntax depends on ts configurations etc.
const ConfigSchema = z.object({
  manifest: ManifestFieldSchema,
  swarmProtocolImport: ImportInfoSchema,
  eventDefinitionImport: ImportInfoSchema,
  tsProtoBufTypes: ImportInfoSchema,
  entityId: z.string(),
  tsConfigPath: z.string(),
})

export type ImportInfo = z.infer<typeof ImportInfoSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type ManifestField = z.infer<typeof ManifestFieldSchema>;
export type Config = z.infer<typeof ConfigSchema>; // Better type for config? Or other solution all together.

function addToImportMap(imports: Map<string, Set<string>>, theImport: ImportInfo): Map<string, Set<string>> {
  if (imports.has(theImport.file) && !imports.get(theImport.file)!.has(theImport.item)) {
    const items = imports.get(theImport.file)!.add(theImport.item)
    imports.set(theImport.file, items)
  } else {
    imports.set(theImport.file, new Set([theImport.item]))
  }
  return imports
}

function addImports(sourceFile: SourceFile, config: Config) {
  var imports: Map<string, Set<string>> = new Map()

  if (config.manifest.type === "import") {
    imports = addToImportMap(imports, config.manifest.manifest as ImportInfo)
  }

  addToImportMap(imports, config.swarmProtocolImport)
  addToImportMap(imports, config.eventDefinitionImport)
  addToImportMap(imports, config.tsProtoBufTypes)

  for (const [file, items] of imports) {
    const itemsArr = Array.from(items)
    sourceFile.addImportDeclaration( { namedImports: itemsArr, moduleSpecifier: file} )
  }

  sourceFile.addImportDeclarations([
    { namedImports: ["Actyx", "ActyxEvent"], moduleSpecifier: "@actyx/sdk" },
    { moduleSpecifier: "@actyx/sdk", isTypeOnly: true, namedImports: [{name: "EventSubscription"}]},
    { namespaceImport: "dgram", moduleSpecifier: "dgram" },
    { defaultImport: "yargs", moduleSpecifier: "yargs"},
    { namedImports: ["hideBin"], moduleSpecifier: "yargs/helpers"},
    { defaultImport: "camelCase", moduleSpecifier: "lodash.camelcase"}
  ])
}

// manifest and entityID are values used to set up connection to Actyx
function genMainFuncion(sourceFile: SourceFile, config: Config) {
  // async function main() { ... }
  const mainFunction = sourceFile.addFunction({
    name: "main",
    isAsync: true,
  });

  // Accept command line args
  // const argv = await yargs(hideBin(process.argv))...
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "argv",
        initializer: writer =>
          writer.write(`await yargs(hideBin(process.argv))
    .option("address", {
      alias: "a",
      type: "string",
      description: "Address to send to",
      default: "localhost",
    })
    .option("port", {
      alias: "p",
      type: "number",
      description: "Port to send to",
      default: 9999,
    })
    .parseAsync()`),
      },
    ],
  });

  // const app = await Actyx.of(manifest)
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "app",
        initializer: writer =>
          writer.write(`await Actyx.of(${config.manifest.type === "literal" ? getManifest(JSON.stringify(config.manifest.manifest)) : config.manifest.manifest.item})`),
      },
    ],
  });

  // const tags = Composition.tagWithEntityId("warehouse")
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "tags",
        initializer: `${config.swarmProtocolImport.item}.tagWithEntityId("${config.entityId}")`,
      },
    ],
  });
  // const eventSubscrptions: EventSubscription = { query: tags }
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "eventSubscriptions",
        type: "EventSubscription",
        initializer: "{ query: tags }",
      },
    ],
  });
  // const HOST = `${argv.address}`
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "HOST",
        initializer: "`" + "${argv.address}" + "`",
      },
    ],
  });
  // const PORT = argv.port
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "PORT",
        initializer: "argv.port",
      },
    ],
  });
  // const socket = dgram.createSocket("udp4")
  const socketDecl = mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "socket",
        initializer: writer => writer.write(`dgram.createSocket("udp4")`),
      },
    ],
  });
  // IMPROVE THIS
  const socketVar = socketDecl.getDeclarations()[0]!.getName();
  // socket.connect(PORT, HOST, () => { console.log(`Connected to ${HOST}:${PORT}`); })
  // socket.on("close", () => { console.log("Connection closed"); })
  // socket.on("error", (err) => { console.error("Socket error:", err.message); })
  // app.subscribe(eventSubscrptions, (e: AE) => { forward(e, socket) })
  mainFunction.addStatements([
    writer => {
      writer.write(`${socketVar}.connect(PORT, HOST, () => `)
        .inlineBlock(() => {
          writer.writeLine('console.log(\`Connected to \${HOST}:\${PORT}\`);');
        })
      .write(");");
    },
    writer => {
      writer.write(`${socketVar}.on(`)
      .quote("close")
      .write(`, () => `)
        .inlineBlock(() => {
          writer.writeLine('console.log("Connection closed");');
        })
      .write(");");
    },
    writer => {
      writer.write(`${socketVar}.on(`)
      .quote("error")
      .write(`, (err) => `)
        .inlineBlock(() => {
          writer.writeLine('console.error(\`Socket error: ${err.message}\`);');
        })
      .write(");");
    },
    writer => {
      writer.write("app.subscribe(eventSubscriptions, (e: ActyxEvent) => ")
        .inlineBlock(() => {
          writer.writeLine(`forward(e as ActyxEvent<{type: string}>, ${socketVar});`);
        })
      .write(");");
    },
  ]);
}

// Does not chech whether 'type' is actually one of the known event types... Not good.
// Also camelCase() seems sketchy, but ... works
function genForward(sourceFile: SourceFile) {
  sourceFile.addFunction({
    name: "forward",
    parameters: [
      { name: "e", type: "ActyxEvent<{type: string}>" },
      { name: "socket", type: "dgram.Socket"}
    ],
    statements: [
      `const {type, ...ePayload} = e.payload`,
      `const msg = JSON.parse(\`{"sealedValue": { "oneofKind": "\${camelCase(type)}", "\${camelCase(type)}": \${JSON.stringify({...ePayload, meta: e.meta})}}}\`)`,
      `console.log("Sending: ", msg)`,
      `socket.send(Event.toBinary(msg))`
    ]
  });
}

// This works but consider a cleaner way of doing it.
function getManifest(manifestStr: string): string {
    return manifestStr
      .replace("\"appId\"", "appId")
      .replace("\"displayName\"", "displayName")
      .replace("\"version\"", "version")
      .replace("\"signature\"", "signature")
}

export function getConfig(path: string): Config {
  try {
    return ConfigSchema.parse(JSON.parse(fs.readFileSync(path, 'utf8')))
  } catch(error) {
    throw error
  }

}

export function writeSourceFile(project: Project, file: string) {
  try {
    project.getSourceFileOrThrow(file).saveSync()
  } catch (error) {
    throw error
  }
}

export function getText(project: Project, file: string): string {
    try {
      return project.getSourceFileOrThrow(file).getFullText()
    } catch (error) {
    throw error
  }
}

// Add imports to package.json and add a script for starting forwarder.
export function updatePackageJsonFwd(filePath: string, compilerOptions: ts.CompilerOptions) {
  const projectRoot = findProjectRoot(filePath) // Not the same as compilerOptions.rootDir which is the root folder within the source files.
  const outDir = compilerOptions.outDir ?? "dist" // Guess on 'dist' if outDir is not set in tsconfig.

  // Sketchy. Unstable if rootDir is not defined.
  const executablePath = compilerOptions.rootDir && path.dirname(path.resolve(filePath)).startsWith(compilerOptions.rootDir) ?
    path.join(path.basename(outDir), path.dirname(path.resolve(filePath)).substring(compilerOptions.rootDir.length + 1), `${path.basename(filePath, ".ts")}.js`)
    : path.join(path.basename(outDir), path.dirname(filePath), `${path.basename(filePath, ".ts")}.js`)

  const updates: PackageJsonEntries = {
    devDependencies: [
        { key: "@types/lodash.camelcase", value: "^4.3.9" },
        { key: "@types/yargs", value: "^17.0.33" }
    ],
    dependencies: [
      { key: "lodash.camelcase", value: "^4.3.0" },
      { key: "yargs", value: "^18.0.0" },

    ],
    scripts: [
      { key: "start-forwarder", value: `node ${executablePath}`, preScript: false}]
    }

  updatePackageJson(path.join(projectRoot, "package.json"), updates)
}

export function generateForwarderProject(config: Config, outputFile: string): Project {
  try {
    const project = new Project({
      manipulationSettings: { quoteKind: QuoteKind.Double },
      tsConfigFilePath: config.tsConfigPath
    });

    const sourceFile = project.createSourceFile(outputFile, "", { overwrite: true });
    addImports(sourceFile, config)
    genForward(sourceFile)
    genMainFuncion(sourceFile, config)
    // main()
    sourceFile.addStatements(FORWARDER_CONSTANTS.MAIN_FUNCTION_CALL);

    return project

  } catch (error) {
    throw error
  }
}

export function generateForwarder(configFile: string, outputFile: string) {
  try {
    const config = getConfig(path.resolve(process.cwd(), configFile))
    const generated = generateForwarderProject(config, outputFile)
    writeSourceFile(generated, outputFile)
    updatePackageJsonFwd(outputFile, generated.getCompilerOptions())

  } catch (error) {
    throw error
  }
}