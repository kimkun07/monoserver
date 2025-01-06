import { readFile } from "fs/promises";
import Ajv, { ValidateFunction } from "ajv";
import { load } from "js-yaml";
import { FromSchema } from "json-schema-to-ts";
import assert from "assert";
import schemaJson from "./service-schema.json";

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
// #endregion

async function readYAML(yamlPath: string): Promise<unknown> {
  if (!yamlPath) {
    throw new Error("Please provide a YAML file path");
  }

  try {
    const yamlContent = await readFile(yamlPath, "utf8");
    return load(yamlContent);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read YAML file ${yamlPath}: ${error.message}`);
    }
    throw new Error(`Failed to read YAML file ${yamlPath}: ${error}`);
  }
}

export function validateService(service: unknown): service is Service {
  const ajv = new Ajv();
  const validate: ValidateFunction = ajv.compile(schemaObject);
  const valid: boolean = validate(service);
  if (!valid) {
    console.error(validate.errors);
  }
  return valid;
}

export async function readService(yamlPath: string): Promise<Service> {
  try {
    const service: unknown = await readYAML(yamlPath);
    if (!validateService(service)) {
      throw new Error(`YAML FILE ${yamlPath} does not match the schema`);
    }
    return service;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid service schema: ${error.message}`);
    }
    throw new Error("Failed to parse service configuration");
  }
}
