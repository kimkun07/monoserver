import { executeCommand } from "./src/container/util_exec";
import { readService, type Service } from "./src/service_schema";

async function stopAndRemoveContainer(service: Service): Promise<void> {
  try {
    const name = service.container.name;

    const { stdout: containerId } = await executeCommand(
      `docker ps -aq --filter name=^/${name}$`,
    );
    if (!containerId.trim()) {
      console.log("No container found with name:", name);
      return;
    }

    // Stop and remove container
    try {
      await executeCommand(`docker stop ${containerId}`);
    } catch (err) {
      // Container was already stopped
    }

    await executeCommand(`docker rm ${containerId}`);
    console.log("Container removed:", containerId);
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function test() {
  const service = await readService(process.argv[2]);
  stopAndRemoveContainer(service);
}

test();
