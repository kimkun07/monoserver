import { ErrorObject } from "ajv";
import { FromSchema } from "json-schema-to-ts";
import assert from "assert";
import schemaJson from "./service-schema.json" assert { type: "json" };
import { readYAML } from "./util";
import { assert_valid } from "./validate-yaml";

// #region Defining the schema
const schemaObject = {
  type: "object",
  properties: {
    container: {
      type: "object",
      properties: {
        name: { type: "string" },
        image: { type: "string" },
        tag: {
          type: ["string", "number"],
          description: "Container image tag (e.g., latest, 1.3.0)",
        },
        port: { type: "integer" },
        script: { type: "string" },
      },
      additionalProperties: false,
      required: ["name", "image", "tag", "port", "script"],
    },
    nginx: {
      type: "object",
      properties: {
        subdomain: { type: "string" },
        additionalConfig: { type: "string" },
      },
      additionalProperties: false,
      required: ["subdomain"],
    },
    display: {
      type: "object",
      properties: {
        state: {
          enum: ["operating", "terminated"],
        },
        detail: { type: "string" },
      },
      additionalProperties: false,
      required: ["state"],
    },
  },
  additionalProperties: false,
  required: ["container", "nginx", "display"],
} as const;

export type Service = FromSchema<typeof schemaObject>;

// Assure that two sources of truth are in sync:
// 1. service-schema.json file
// 2. service-schema.ts file
assert.deepStrictEqual(
  /**actual=*/ schemaObject,
  /**expected=*/ schemaJson,
  "Schema defined in .json and .ts files must be identical"
);
//#endregion

export function validateService(service: unknown): service is Service {
  try {
    assert_valid(schemaObject, service);
    return true;
  } catch (error) {
    error = error as ErrorObject[];
    for (const err of error) {
      console.error(err);
    }
    return false;
  }
}

export async function readService(yamlPath: string): Promise<Service> {
  const service: unknown = await readYAML(yamlPath);
  if (!validateService(service)) {
    throw new Error(`YAML FILE ${yamlPath} does not match the schema`);
  }
  return service;
}
