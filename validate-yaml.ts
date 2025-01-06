// usage: validate [schema file] [target]
//        target can be a directory or a file
//   e.g. validate ./service-schema.json ./services
import path from "path";
import { stat, readdir } from "fs/promises";
import Ajv, { ValidateFunction, ErrorObject } from "ajv";
import { readYAML } from "./util";

const ajv = new Ajv({
  allowUnionTypes: true,
});

export function assert_valid(schema: unknown, data: unknown): boolean {
  const validate: ValidateFunction = ajv.compile(schema);
  const valid: boolean = validate(data);
  if (!valid) {
    // throw ErrorObject[]
    throw validate.errors;
  }
  return valid;
}

// 1. Validate services/**/*.yaml files
async function validate_by_file(schemaPath: string, targetPath: string) {
  const schema = await readYAML(schemaPath);
  const stats = await stat(targetPath);

  if (stats.isDirectory()) {
    const entries = await readdir(targetPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        // recursive search
        await validate_by_file(schemaPath, fullPath);
      } else if (entry.isFile()) {
        if (/\.(yml|yaml|json)$/i.test(entry.name)) {
          // validate only yaml or json files
          const target = await readYAML(fullPath);
          try {
            assert_valid(schema, target);
            console.log(`${fullPath}: ✅`);
          } catch (error) {
            console.error(`${fullPath}: ❌`);

            error = error as ErrorObject[];
            for (const err of error) {
              console.error(err);
            }
          }
        }
      }
    }
    return true;
  } else {
    // targetPath is a single file
    const target = await readYAML(targetPath);
    const isValid = assert_valid(schema, target);
    console.log(`${targetPath}: ${isValid ? "✅" : "❌"}`);
    return isValid;
  }
}

// 2. Check for duplicate service names, subdomains, and ports

// 3. Make result simliar to eslint

validate_by_file(process.argv[2], process.argv[3]);
