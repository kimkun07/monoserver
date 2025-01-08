import { type Service } from "@repo/service/service";
import { executeCommand } from "./util_exec";

type Container = Service["container"];

export async function start_container(container: Container): Promise<void> {
  try {
    // Replace placeholder to value
    let script = container.script;
    for (const [key, value] of Object.entries(container)) {
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

export async function stop_remove_container(name: string): Promise<void> {
  try {
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
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** Returns names of containers (including stopped) */
export async function get_all_containers(): Promise<string[]> {
  const { stdout } = await executeCommand("docker ps -a --format '{{.Names}}'");
  let names = stdout.split("\n");
  names = names.filter((name) => name !== "");
  return names;
}

export enum ContainerStatus {
  created = "created",
  restarting = "restarting",
  running = "running",
  paused = "paused",
  exited = "exited",
  dead = "dead",
  not_found = "not found",
}

export async function get_container_status(
  name: string,
): Promise<ContainerStatus> {
  try {
    const { stdout } = await executeCommand(
      `docker inspect --format '{{.State.Status}}' ${name}`,
    );
    return stdout.trim() as ContainerStatus;
  } catch (error) {
    // template parsing error: executing "" at <.State.Status>
    // -> No such container
    return ContainerStatus.not_found;
  }
}
