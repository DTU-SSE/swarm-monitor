#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the protocol.ts file
const protocolPath = path.join(__dirname, 'src', 'protocol.ts');
const protocolContent = fs.readFileSync(protocolPath, 'utf8');

// Extract event definitions by analyzing MachineEvent.design() calls and their payload types
function extractEventDefinitions(content) {
  const events = [];
  
  // First, build a map of all type definitions (not just *Payload types)
  const typeDefinitions = new Map();
  const typeRegex = /type\s+(\w+)\s*=\s*\{([^}]+)\}/g;
  
  let match;
  while ((match = typeRegex.exec(content)) !== null) {
    const typeName = match[1];
    const fields = match[2];
    
    // Parse fields from the type definition
    const fieldMatches = fields.match(/(\w+):\s*(\w+)/g) || [];
    const parsedFields = fieldMatches.map(field => {
      const [name, type] = field.split(':').map(s => s.trim());
      return { name, type };
    });
    
    typeDefinitions.set(typeName, {
      typeName,
      fields: parsedFields
    });
  }
  
  // Match any MachineEvent.design() call with withPayload<T>()
  const eventRegex = /export\s+const\s+(\w+)\s*=\s*MachineEvent\.design\('(\w+)'\)\.withPayload<([^>]+)>\(\)/g;
  
  while ((match = eventRegex.exec(content)) !== null) {
    const eventVarName = match[1]; // e.g., "partReq"
    const eventName = match[2];     // e.g., "partReq" 
    const payloadType = match[3];   // e.g., "PartReqPayload" or any other type
    
    // Look up the payload type definition
    const payloadInfo = typeDefinitions.get(payloadType);
    if (payloadInfo) {
      events.push({
        eventName,
        messageName: capitalize(eventName),
        fields: payloadInfo.fields,
        payloadType
      });
    } else {
      console.warn(`Warning: Could not find type definition for ${payloadType} used in ${eventName}`);
      // Still add the event but with no payload fields
      events.push({
        eventName,
        messageName: capitalize(eventName),
        fields: [],
        payloadType
      });
    }
  }
  
  return events;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function convertTypeScriptTypeToProto(tsType) {
  switch (tsType.toLowerCase()) {
    case 'string': return 'string';
    case 'number': return 'int32';
    case 'boolean': return 'bool';
    default: return 'string'; // fallback
  }
}

function generateProtoFile(events) {
  let proto = `syntax = "proto3";

package warehouse_messages;

/*"meta": {
    "isLocalEvent": false,
    "tags": [
      "Composition",
      "Composition:warehouse-factory"
    ],
    "timestampMicros": 1747990971813688,
    "lamport": 11,
    "appId": "com.example.car-factory",
    "eventId": "0000000000000011/e0/rCannphYiaOQW4aQFeqE.SbHbplsf3mzyQP6DYkk-0",
    "stream": "e0/rCannphYiaOQW4aQFeqE.SbHbplsf3mzyQP6DYkk-0",
    "offset": 11
}*/

/*
https://github.com/timostamm/protobuf-ts/blob/main/MANUAL.md#the-protoc-plugin
npm install @protobuf-ts/plugin
  To compile:
   npx protoc \\
  --ts_out src/generated/ \\
  --ts_opt long_type_string \\
  --proto_path protos \\
  protos/warehouse.proto

  for oneof remember to set strictNullChecks to true in tsconfig.json
*/


message Msg {
  oneof kind {
`;

  // Generate the oneof fields in the Msg
  events.forEach((event, index) => {
    proto += `    ${event.messageName} ${event.eventName} = ${index + 1};\n`;
  });

  proto += `  }
}

message Meta {
  bool isLocalEvent = 1;
  repeated string tags = 2;
  uint64 timestampMicros = 3;
  uint32 lamport = 4;
  string appId = 5;
  string eventId = 6;
  string stream = 7;
  uint32 offset = 8;
}

`;

  // Generate individual message types
  events.forEach(event => {
    proto += `message ${event.messageName} {\n`;
    
    let fieldNumber = 1;
    
    // Add payload fields first
    event.fields.forEach(field => {
      const protoType = convertTypeScriptTypeToProto(field.type);
      proto += `  ${protoType} ${field.name} = ${fieldNumber};\n`;
      fieldNumber++;
    });
    
    // Add lbj field
    proto += `  string lbj = ${fieldNumber};\n`;
    fieldNumber++;
    
    // Add meta field
    proto += `  Meta meta = ${fieldNumber};\n`;
    
    proto += `}\n\n`;
  });

  return proto;
}

// Main execution
try {
  console.log('Extracting event definitions from protocol.ts...');
  const events = extractEventDefinitions(protocolContent);
  
  console.log('Found events:');
  events.forEach(event => {
    console.log(`  - ${event.eventName} (${event.payloadType}) -> ${event.messageName}`);
    if (event.fields.length > 0) {
      event.fields.forEach(field => {
        console.log(`    ${field.name}: ${field.type}`);
      });
    } else {
      console.log(`    (no payload fields)`);
    }
  });
  
  console.log('\nGenerating protobuf file...');
  const protoContent = generateProtoFile(events);
  
  // Write to warehouse.proto
  const protoPath = path.join(__dirname, 'protos', 'warehouse.proto');
  fs.writeFileSync(protoPath, protoContent);
  
  console.log('✓ Generated warehouse.proto successfully!');
  console.log('  Location:', protoPath);
  console.log('  Events included:', events.map(e => e.eventName).join(', '));
  
} catch (error) {
  console.error('Error generating proto file:', error.message);
  process.exit(1);
}
