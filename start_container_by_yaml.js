import { readYAML, executeCommand } from "./util.js";

async function startContainer(path) {
  try {
    const config = readYAML(path);

    // Replace Placeholder to value
    let script = config.localhost.script;
    for (const [key, value] of Object.entries(config.localhost)) {
      const placeholder = `{{${key}}}`;
      script = script.replaceAll(placeholder, value);
    }

    await executeCommand(script);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

startContainer(process.argv[2]);
