import { loadYamlConfig, executeCommand } from "./util.js";

async function stopAndRemoveContainer(path) {
  try {
    const config = loadYamlConfig(path);
    const { name } = config.localhost;

    // Find container id by name
    const { stdout: containerId } = await executeCommand(
      `docker ps -aq --filter name=^/${name}$`
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
    console.error("Error:", error.message);
  }
}

stopAndRemoveContainer(process.argv[2]);
