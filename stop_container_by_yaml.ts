import { executeCommand } from "./src/container/util_exec";
import { readService } from "./src/service-schema";

async function stopAndRemoveContainer(path: string): Promise<void> {
  try {
    const service = await readService(path);
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

stopAndRemoveContainer(process.argv[2]);
