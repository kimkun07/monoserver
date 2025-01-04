import { readFileSync } from "fs";
import { load } from "js-yaml";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const yamlPath = process.argv[2];
if (!yamlPath) {
  console.error("Please provide a YAML file path");
  process.exit(1);
}

async function stopAndRemoveContainer() {
  try {
    // Read and parse YAML
    const yamlContent = readFileSync(yamlPath, "utf8");
    const config = load(yamlContent);

    const { name } = config.localhost;

    // Find container ID using name (including stopped containers)
    const { stdout: containerId } = await execPromise(
      `docker ps -aq --filter name=^/${name}$`
    );

    if (!containerId.trim()) {
      console.log("No container found with name:", name);
      return;
    }

    try {
      // Try to stop container (might fail if already stopped)
      await execPromise(`docker stop ${containerId}`);
      console.log("Container stopped:", containerId);
    } catch (err) {
      // Ignore error if container is already stopped
      console.log("Container was already stopped");
    }

    // Remove container
    await execPromise(`docker rm ${containerId}`);
    console.log("Container removed:", containerId);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

stopAndRemoveContainer();
