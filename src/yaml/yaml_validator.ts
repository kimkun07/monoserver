// General yaml validator
import Ajv, { ValidateFunction, AnySchema } from "ajv";
import { readYAMLJSONs } from "./util_read";

const ajv = new Ajv({
  allowUnionTypes: true,
});

/** throw Error(schema is invalid) or ErrorObject[](data is invalid) */
export function assert_valid(schema: unknown, data: unknown): boolean {
  const validate: ValidateFunction = ajv.compile(schema as AnySchema);
  const valid: boolean = validate(data);
  if (!valid) {
    throw validate.errors;
  }
  return valid;
}

/** Validate and print the result */
export function validate_and_print(
  schema: unknown,
  targets: { path: string; obj: unknown }[],
) {
  let allValid = true;

  for (const target of targets) {
    try {
      assert_valid(schema, target.obj);
      console.log(`${target.path} ✅`);
    } catch (error) {
      console.error(`${target.path} ❌`);
      if (Array.isArray(error)) {
        for (const err of error) {
          console.error(err);
        }
      } else {
        console.error(error);
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
  let isValid = validate_and_print(schema, targets);

  process.exit(isValid ? 0 : 1);
}
