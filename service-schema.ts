import { readFileSync } from "fs";
import { load } from "js-yaml";
import { FromSchema } from "json-schema-to-ts";

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
// #endregion

// export function validateService(service: unknown): service is Service {
// }

function readYAML(yamlPath: string): unknown {
  if (!yamlPath) {
    throw new Error("Please provide a YAML file path");
  }
  const yamlContent = readFileSync(yamlPath, "utf8");
  return load(yamlContent);
}

export function readService(yamlPath: string): Service {
  const service = readYAML(yamlPath) as Service;
  if (!service) {
    throw new Error("Invalid service schema");
  }
  return service;
}
