import { executeCommand } from "./src/container/util_exec";
import { readService, type Service } from "./src/service-schema";

async function startContainer(service: Service): Promise<void> {
  try {
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
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

async function test() {
  const service = await readService(process.argv[2]);
  startContainer(service);
}

test();
