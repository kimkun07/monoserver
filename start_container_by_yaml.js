// Usage: node start_container_by_yaml.js <yaml_file_path>

import { readFileSync } from "fs";
import { load } from "js-yaml";
import { exec } from "child_process";

// 1. Read YAML file path from command line arguments
const yamlPath = process.argv[2];
if (!yamlPath) {
  console.error("Please provide a YAML file path");
  process.exit(1);
}
const yamlContent = readFileSync(yamlPath, "utf8");
const config = load(yamlContent);

// 2. Replace placeholders to values in script
let script = config.localhost.script;
for (const [key, value] of Object.entries(config.localhost)) {
  const placeholder = `{{${key}}}`;
  script = script.replaceAll(placeholder, value);
}

// 3. Execute the script
exec(script, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  if (stdout) {
    console.log(`stdout: ${stdout}`);
  }
});
