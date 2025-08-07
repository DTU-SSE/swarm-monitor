import * as protobuf from 'protobufjs'
import { writeFileSync, unlink } from 'fs';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';


function removeTemporaryFile(filePath: string): void {
    unlink(filePath, (err) => {
        if (err) throw err;
    })
}

// Write a .proto file by converting a protobuf Root to JSON and using `pbjs`.
function writeProtoWithPbjs(root: protobuf.Root, outputPath: string): void {
  const tempJsonPath = `proto-${randomUUID()}.json`;
  const json = root.toJSON();

  writeFileSync(tempJsonPath, JSON.stringify(json, null, 2));

  const result = spawnSync(
    'npx',
    ['pbjs', '-t', 'proto', '-o', outputPath, tempJsonPath],
    { stdio: 'inherit' }
  );

  if (result.error) {
    throw result.error;
  }

  removeTemporaryFile(tempJsonPath);

  console.log(`.proto file written to ${outputPath}`);
}


const root = new protobuf.Root()
const myPackage = root.define('warehouse-eevents')

const message = new protobuf.Type("MyMessage")
  .add(new protobuf.Field("id", 1, "int32"))
  .add(new protobuf.Field("name", 2, "string"))
  .add(new protobuf.Field("timestamp", 3, "int64"));

const sealedValue = new protobuf.Type("Event")
    .add(new protobuf.Field("partReq", 2, "string"));
sealedValue
    .add(new protobuf.Field("partOK", 3, "string"))
    .add(new protobuf.Field("pos", 4, "string"))
    .add(new protobuf.Field("closingTime", 5, "string"));
sealedValue.add(new protobuf.OneOf("sealed_value", ["partReq", "partOK", "pos", "closingTime"]));

myPackage.add(message);
myPackage.add(sealedValue);

//const protoSource = root.toString()
//console.log(JSON.stringify(root.toJSON(), null, 2))


writeFileSync('example.json', JSON.stringify(root.toJSON(), null, 2))
writeProtoWithPbjs(root, 'warehouseeee2.proto')
//console.log(myPackage.toString())

//console.log(JSON.stringify(e, null, 2))
