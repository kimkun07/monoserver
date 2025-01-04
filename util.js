import { readFileSync } from "fs";
import { load } from "js-yaml";
import { exec } from "child_process";
import { promisify } from "util";

// return { stdout, stderr }
export const executeCommand = promisify(exec);

// Return a config object from YAML file
export function readYAML(yamlPath) {
  if (!yamlPath) {
    throw new Error("Please provide a YAML file path");
  }
  const yamlContent = readFileSync(yamlPath, "utf8");
  return load(yamlContent);
}
