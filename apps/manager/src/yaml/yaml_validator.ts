// General yaml validator
import Ajv, { ValidateFunction, AnySchema } from "ajv";
import { readYAMLJSONs } from "./util_read";

const ajv = new Ajv({
  allowUnionTypes: true,
});

export function validate<T>(schema: unknown, data: unknown): data is T {
  try {
    // throw Error(schema is invalid) or ErrorObject[](data is invalid)
    const validate: ValidateFunction = ajv.compile(schema as AnySchema);
    const valid: boolean = validate(data);
    return valid;
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

/** Validate and print the result */
export function validate_all<T>(
  schema: unknown,
  data_array: { path: string; obj: unknown }[],
  print_errors: boolean = false,
): data_array is { path: string; obj: T }[] {
  let allValid = true;

  for (const target of data_array) {
    try {
      validate(schema, target.obj);
      if (print_errors) {
        console.log(`${target.path} ✅`);
      }
    } catch (error) {
      if (print_errors) {
        console.error(`${target.path} ❌`);
        if (Array.isArray(error)) {
          for (const err of error) {
            console.error(err);
          }
        } else {
          console.error(error);
        }
      }
      allValid = false;
    }
  }

  return allValid;
}

/** targetPath can be a directory or a file */
async function main() {
  let schemaPath = process.argv[2];
  let targetPath = process.argv[3];
  // 1. read schemaObject, read targetObject[]
  const schema: unknown = (await readYAMLJSONs(schemaPath))[0].obj;
  const targets: { path: string; obj: unknown }[] =
    await readYAMLJSONs(targetPath);

  // 2. General YAML validation
  let isValid = validate_all(schema, targets);

  process.exit(isValid ? 0 : 1);
}
