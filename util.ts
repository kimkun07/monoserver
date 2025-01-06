import { exec, PromiseWithChild } from "child_process";
import { Dirent } from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { load } from "js-yaml";
import pathModule from "path";
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

/** Read single YAML/JSON file to object */
async function read_YAML_JSON_file(path: string): Promise<unknown> {
  if (!path) {
    throw new Error("Please provide a YAML/JSON file path");
  }

  try {
    const fileContent = await readFile(path, "utf8");

    if (path.endsWith(".json")) {
      return JSON.parse(fileContent);
    } else if (path.endsWith(".yaml") || path.endsWith(".yml")) {
      return load(fileContent);
    } else {
      throw new Error("File must be either YAML or JSON");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to read YAML/JSON file ${path}: ${error.message}`,
      );
    }
    throw new Error(`Failed to read YAML/JSON file ${path}: ${error}`);
  }
}

export type ReadResult = { path: string; obj: unknown };

/** Read all yaml files in a directory to objects */
export async function readYAMLs(path: string): Promise<ReadResult[]> {
  const stats = await stat(path);
  if (stats.isDirectory()) {
    let targets: ReadResult[] = [];
    const entries: Dirent[] = await readdir(path, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = pathModule.join(path, entry.name);
      if (entry.isDirectory()) {
        // recursive search
        targets.concat(await readYAMLs(fullPath));
      } else if (entry.isFile()) {
        if (/\.(yml|yaml|json)$/i.test(entry.name)) {
          const content = await read_YAML_JSON_file(fullPath);
          targets.push({ path: fullPath, obj: content });
        }
      }
    }
    return targets;
  } else {
    // targetPath is a single file
    const content = await read_YAML_JSON_file(path);
    return [{ path: path, obj: content }];
  }
}
