import {
  ContainerStatus,
  get_all_containers,
  get_container_status,
  start_container,
  stop_remove_container,
} from "./container/util_docker";
import { type Service } from "@repo/service/service";
import deep_equal from "deep-equal";
import { readServices } from "./service/util_service_read";
import { executeCommand } from "./container/util_exec";
import { cp } from "fs/promises";

type ServiceFile = { path: string; service: Service };

/** Result: all container will match desired services */
async function update_containers(
  existing_containers: string[],
  desired_services: ServiceFile[],
  old_services: ServiceFile[],
) {
  let running_desired_containers: Map<string, ServiceFile> = new Map();

  // TODO: parallelize
  // 1. Find desired_service for existing container
  //    Also, delete not-desired containers
  for (const container_name of existing_containers) {
    // Find services with same name
    const serviceFile = desired_services.find(
      (s) => s.service.container.name === container_name,
    );

    if (serviceFile === undefined) {
      // Container is not in desired_services
      await stop_remove_container(container_name);
    } else {
      running_desired_containers.set(container_name, serviceFile);
    }
  }

  // 2. Delete modified running containers
  const modified_containers: string[] = [];
  for (const [
    container_name,
    serviceFile,
  ] of running_desired_containers.entries()) {
    const oldServiceFile = old_services.find(
      (s) => s.service.container.name === container_name,
    );

    if (
      oldServiceFile === undefined ||
      !deep_equal(
        serviceFile.service.container,
        oldServiceFile.service.container,
      )
    ) {
      modified_containers.push(container_name);
      await stop_remove_container(container_name);
    }
  }

  // 3. Run modified containers
  for (const container_name of modified_containers) {
    const serviceFile = running_desired_containers.get(container_name);
    if (serviceFile === undefined) {
      throw new Error("Service file not found for modified container");
    }
    await start_container(serviceFile.service.container);
  }

  // 4. Run added containers
  //    containers that are not running but desired
  const added_containers: string[] = [];
  for (const { path, service } of desired_services) {
    const container_name = service.container.name;
    if (!running_desired_containers.has(container_name)) {
      added_containers.push(container_name);
      await start_container(service.container);
      running_desired_containers.set(container_name, { path, service });
    }
  }

  // 5. Print running containers (visualize directory structure)
  console.log("Running containers:");
  const containerEntries = Array.from(running_desired_containers.entries());
  const sortedContainers = containerEntries.sort(
    ([_, { path: pathA }], [__, { path: pathB }]) => pathA.localeCompare(pathB),
  );

  for (const [container_name, { path }] of sortedContainers) {
    const prefix = added_containers.includes(container_name)
      ? "A"
      : modified_containers.includes(container_name)
        ? "M"
        : " ";
    console.log(`  [${prefix}] ${container_name} (${path})`);
  }
}

export async function main(
  desired_services_dir: string,
  old_services_dir: string,
) {
  // 1. git pull -> ./services and ./nginx will be updated
  await executeCommand("git pull");

  // 2. update containers
  // existing_containers: running/stopped containers
  const existing_containers = await get_all_containers();

  let desired_services: ServiceFile[] =
    await readServices(desired_services_dir);
  let old_services: ServiceFile[] = [];
  try {
    old_services = await readServices(old_services_dir);
  } catch (error) {
    if (error instanceof Object && "code" in error && error.code === "ENOENT") {
      // Ignore "directory not found" error
      old_services = [];
    } else {
      throw error;
    }
  }
  await update_containers(existing_containers, desired_services, old_services);

  // 3. Preserve desired_services files as old_services
  await cp(desired_services_dir, old_services_dir, { recursive: true });

  // 4. signal nginx container to reload
  //    -> changes in ./nginx will be applied
  const nginx_status = await get_container_status("nginx");
  if (nginx_status === ContainerStatus.not_found) {
    console.warn("There is no 'nginx' container.");
  } else if (nginx_status === ContainerStatus.running) {
    try {
      await executeCommand("docker exec nginx nginx -s reload");
    } catch (error) {
      console.error("Error while reloading nginx:", error);
      throw error;
    }
  }
}
