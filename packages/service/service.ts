import schema_from_json from "./service-schema.json";
import { FromSchema } from "json-schema-to-ts";
import assert from "assert";

export const schema = {
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

export type Service = FromSchema<typeof schema>;

// Assure that two sources of truth are in sync:
// 1. service-schema.json file
// 2. service-schema.ts file
assert.deepEqual(
  /**actual=*/ schema,
  /**expected=*/ schema_from_json,
  "Schema defined in .json and .ts files must be identical",
);
