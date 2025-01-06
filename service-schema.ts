import { FromSchema } from "json-schema-to-ts";
import assert from "assert";
import schemaJson from "./service-schema.json";
import { readYAMLs } from "./util";
import { assert_valid } from "./yaml-validator";

// #region Defining the schema
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
assert.deepStrictEqual(
  /**actual=*/ schemaObject,
  /**expected=*/ schemaJson,
  "Schema defined in .json and .ts files must be identical",
);
//#endregion

export function validateService(service: unknown): service is Service {
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

/** Read a single yaml file to a service object */
export async function readService(yamlPath: string): Promise<Service> {
  const service: unknown = (await readYAMLs(yamlPath))[0];
  if (!validateService(service)) {
    throw new Error(`YAML FILE ${yamlPath} does not match the schema`);
  }
  return service;
}
