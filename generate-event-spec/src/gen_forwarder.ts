import {
  Project,
  QuoteKind,
  VariableDeclarationKind,
  SyntaxKind,
  SourceFile,
} from "ts-morph";

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { z } from "zod";

const ConfigSchema = z.object({
  manifest: z.object({
    appId: z.string(),
    displayName: z.string(),
    version: z.string()
  }),
  swarmProtocol: z.string(),
  entityId: z.string(),
  eventDefinitionFile: z.string(),
  typeScriptProtoBufTypes: z.string()
})

export type Config = z.infer<typeof ConfigSchema>;

function addImports(sourceFile: SourceFile, config: Config) {
  sourceFile.addImportDeclarations([
    { namedImports: ["Actyx", "ActyxEvent", "EventSubscription"], moduleSpecifier: "@actyx/sdk" },
    { namedImports: ["Events", config.swarmProtocol], moduleSpecifier: config.eventDefinitionFile}, // Better type for config, embed these requirements (that these things are defined there) there. Or other solution all together.
    { namedImports: ["Event"],  moduleSpecifier: config.typeScriptProtoBufTypes }, // Also find a better solution here. Events/Event...
    { namespaceImport: "dgram", moduleSpecifier: "dgram" },
    { defaultImport: "yargs", moduleSpecifier: "yargs"},
    { namedImports: ["hideBin"], moduleSpecifier: "yargs/helpers"}
  ])
}

// manifest and entityID are values used to set up connection to Actyx
function genMainFuncion(sourceFile: SourceFile, config: Config) { //, manifest: string, swarmProtocol: string, entityID: string) {
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
          writer.write(`await Actyx.of(${getManifest(JSON.stringify(config.manifest))})`),
      },
    ],
  });

  // const tags = Composition.tagWithEntityId("warehouse")
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "tags",
        initializer: `${config.swarmProtocol}.tagWithEntityId("${config.entityId}")`,
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
    `${socketVar}.connect(PORT, HOST, () => { console.log(\`Connected to \${HOST}:\${PORT}\`); })`,
    `${socketVar}.on("close", () => { console.log("Connection closed"); })`,
    `${socketVar}.on("error", (err) => { console.error("Socket error:", err.message); })`,
    `app.subscribe(eventSubscriptions, (e: ActyxEvent) => { forward(e, socket) })`
  ]);
}

// This works but consider a cleaner way of doing it.
function getManifest(manifestStr: string): string {
    return manifestStr
      .replace("\"appId\"", "appId")
      .replace("\"displayName\"", "displayName")
      .replace("\"version\"", "version")
      .replace("\"signature\"", "signature")
}

function getConfig(path: string): Config {
  try {
    return ConfigSchema.parse(JSON.parse(fs.readFileSync(path, 'utf8')))
  } catch(error) {
    throw Error /// return to this. Improve
  }

}

async function main() {
    // Command line arguments
  const argv = await yargs(hideBin(process.argv))
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'File containing containing forwrder configuration information.',
    })
    .demandOption("config") // configuration must be passed
    .parseAsync();

  if (!fs.existsSync(argv.config)) {
    throw new Error(`File not found: ${argv.config}.`);
  }
  const config = getConfig(argv.config)

  const project = new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: { quoteKind: QuoteKind.Double },
  });

  const sourceFile = project.createSourceFile("main.ts", "", { overwrite: true });
  addImports(sourceFile, config)
  genMainFuncion(sourceFile, config)
  // main()
  sourceFile.addStatements("main()");

  // Print program
  console.log(sourceFile.getFullText());
}

main().catch((err: Error) => {
  console.error(`${err.name}: ${err.message}`);
  process.exit(1);
})


