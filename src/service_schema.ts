import schemaJson from "../service-schema.json";
import { FromSchema } from "json-schema-to-ts";
import assert from "assert";
import { readYAMLJSONs } from "./yaml/util_read";
import { assert_valid } from "./yaml/yaml_validator";

/** Read a single yaml file to a service object */
export async function readService(yamlPath: string): Promise<Service> {
  const { obj } = (await readYAMLJSONs(yamlPath))[0];
  if (!validateService(obj)) {
    throw new Error(`YAML file ${yamlPath} does not match the schema`);
  }
  return obj;
}

export const schemaObject = {
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
assert.deepEqual(
  /**actual=*/ schemaObject,
  /**expected=*/ schemaJson,
  "Schema defined in .json and .ts files must be identical",
);

function validateService(service: unknown): service is Service {
  try {
    assert_valid(schemaObject, service);
    return true;
  } catch (error) {
    if (Array.isArray(error)) {
      for (const err of error) {
        console.error(err);
      }
    } else {
      console.error(error);
    }
    return false;
  }
}
