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


// manifest and entityID are values used to set up connection to Actyx
function genMainFuncion(sourceFile: SourceFile, manifest: string, swarmProtocol: string, entityID: string) {
  // async function main() { ... }
  const mainFunction = sourceFile.addFunction({
    name: "main",
    isAsync: true,
  });

  // const app = await Actyx.of(manifest)
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "app",
        initializer: writer =>
          writer.write(`await Actyx.of(${manifest})`),
      },
    ],
  });

  // const tags = Composition.tagWithEntityId("warehouse")
  mainFunction.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "tags",
        initializer: `${swarmProtocol}.tagWithEntityId("${entityID}")`,
      },
    ],
  });
}

// This works but consider a cleaner way of doing it.
function getManifest(path: string): string {
    return fs.readFileSync(path, 'utf8')
      .replace("\"appId\"", "appId")
      .replace("\"displayName\"", "displayName")
      .replace("\"version\"", "version")
      .replace("\"signature\"", "signature")
}

async function main() {
    // Command line arguments
  const argv = await yargs(hideBin(process.argv))
    .option('manifest', {
      alias: 'm',
      type: 'string',
      description: 'File containing manifest used to set up sdk.',
    })
    .option('swarm-protocol', {
      alias: 's',
      type: 'string',
      description: 'Name of swarm protocol instance used to design machines of the swarm we want to forward from.',
    })
    .option('entity-id', {
      alias: 'i',
      type: 'string',
      description: 'Entity id -- something like id of session.',
    })
    .demandOption("manifest") // manifest file must be passed
    .demandOption("swarm-protocol") // swarm-protocol file must be passed
    .demandOption("entity-id") // entity-id must be passed
    .parseAsync();

  if (!argv.manifest) {
    throw new Error(`No file manifest given.`);
  }
  if (!fs.existsSync(argv.manifest)) {
    throw new Error(`File not found: ${argv.input}.`);
  }

  const project = new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: { quoteKind: QuoteKind.Double },
  });

  const sourceFile = project.createSourceFile("main.ts", "", { overwrite: true });
  const manifest = getManifest(argv.manifest)

  genMainFuncion(sourceFile, manifest, argv.swarmProtocol, argv.entityId )
  // main()
  sourceFile.addStatements("main()");

  // Print program
  console.log(sourceFile.getFullText());
}

main().catch((err: Error) => {
  console.error(`${err.name}: ${err.message}`);
  process.exit(1);
})



/* // const app = await Boing.of({ "1": 2 })
body.addVariableStatement({
  declarationKind: VariableDeclarationKind.Const,
  declarations: [
    {
      name: "app",
      initializer: writer =>
        writer.write("await Boing.of({ \"1\": 2 })"),
    },
  ],
});

// const tags = Composition.tagWithEntityId("warehouse")
body.addVariableStatement({
  declarationKind: VariableDeclarationKind.Const,
  declarations: [
    {
      name: "tags",
      initializer: "Composition.tagWithEntityId(\"warehouse\")",
    },
  ],
});

// const eventSubscrptions: EventSubscription = { query: tags }
body.addVariableStatement({
  declarationKind: VariableDeclarationKind.Const,
  declarations: [
    {
      name: "eventSubscrptions",
      type: "EventSubscription",
      initializer: "{ query: tags }",
    },
  ],
});

// const argv = await yargs(hideBin(process.argv))...
body.addVariableStatement({
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

// const HOST = `${argv.address}`
body.addVariableStatement({
  declarationKind: VariableDeclarationKind.Const,
  declarations: [
    {
      name: "HOST",
      initializer: "`" + "${argv.address}" + "`",
    },
  ],
});

// const PORT = argv.port
body.addVariableStatement({
  declarationKind: VariableDeclarationKind.Const,
  declarations: [
    {
      name: "PORT",
      initializer: "argv.port",
    },
  ],
});

// const socket = dgram.createSocket("udp4")
const socketDecl = body.addVariableStatement({
  declarationKind: VariableDeclarationKind.Const,
  declarations: [
    {
      name: "socket",
      initializer: writer => writer.write(`dgram.createSocket("udp4")`),
    },
  ],
});
const socketVar = socketDecl.getDeclarations()[0].getName();

// socket.connect(PORT, HOST, () => { console.log(`Connected to ${HOST}:${PORT}`); })
body.addExpressionStatement(
  body
    .addExpression({
      expression: `${socketVar}.connect(PORT, HOST, () => { console.log(\`Connected to \${HOST}:\${PORT}\`); })`,
    })
    .getExpression()
);

// socket.on("close", () => { console.log("Connection closed"); })
body.addExpressionStatement(
  body
    .addExpression({
      expression: `${socketVar}.on("close", () => { console.log("Connection closed"); })`,
    })
    .getExpression()
);

// socket.on("error", (err) => { console.error("Socket error:", err.message); })
body.addExpressionStatement(
  body
    .addExpression({
      expression: `${socketVar}.on("error", (err) => { console.error("Socket error:", err.message); })`,
    })
    .getExpression()
);

// app.subscribe(eventSubscrptions, (e: AE) => { forward(e, socket) })
body.addExpressionStatement(
  body
    .addExpression({
      expression: `app.subscribe(eventSubscrptions, (e: AE) => { forward(e, socket) })`,
    })
    .getExpression()
); */


