import { executeCommand } from "./util";
import { readService, type Service } from "./service-schema";

async function startContainer(path: string): Promise<void> {
  try {
    const service: Service = readService(path);

    // Replace placeholder to value
    let script = service.container.script;
    for (const [key, value] of Object.entries(service.container)) {
      const placeholder = `{{${key}}}`;
      // replace all occurrences of placeholder with value
      script = script.replace(new RegExp(placeholder, "g"), String(value));
    }

    await executeCommand(script);
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

startContainer(process.argv[2]);
