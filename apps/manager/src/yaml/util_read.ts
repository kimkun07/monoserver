import { Dirent } from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { load } from "js-yaml";
import pathModule from "path";

/** Read all yaml files in a directory to objects */
export async function readYAMLJSONs(
  path: string,
): Promise<{ path: string; obj: unknown }[]> {
  const stats = await stat(path);
  if (stats.isDirectory()) {
    let targets: { path: string; obj: unknown }[] = [];
    const entries: Dirent[] = await readdir(path, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = pathModule.join(path, entry.name);
      if (entry.isDirectory()) {
        // recursive search
        targets.concat(await readYAMLJSONs(fullPath));
      } else if (entry.isFile()) {
        if (/\.(yml|yaml|json)$/i.test(entry.name)) {
          const content = await readYAMLJSON(fullPath);
          targets.push({ path: fullPath, obj: content });
        }
      }
    }
    return targets;
  } else {
    // targetPath is a single file
    const content = await readYAMLJSON(path);
    return [{ path: path, obj: content }];
  }
}

/** Read single YAML/JSON file to object */
export async function readYAMLJSON(path: string): Promise<unknown> {
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
