import { exec, PromiseWithChild } from "child_process";
import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { promisify } from "util";

//#region Execute Shell Command
// exec is a callback-based function, so we promisify it
const exec_promised: (command: string) => PromiseWithChild<CommandResult> =
  promisify(exec);

export async function executeCommand(command: string): Promise<CommandResult> {
  return await exec_promised(command);
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}
// #endregion

export async function readYAML(yamlPath: string): Promise<unknown> {
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
