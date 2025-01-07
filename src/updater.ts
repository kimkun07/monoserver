import {
  get_all_containers,
  start_container,
  stop_remove_container,
} from "./container/util_docker";
import { type Service } from "./service_schema";
import deep_equal from "deep-equal";
import { readServices } from "./util_service_read";

type ServiceFile = { path: string; service: Service };

/** Result: all container will match desired services */
async function update_containers(
  existing_containers: string[],
  desired_services: ServiceFile[],
  old_services: ServiceFile[],
) {
  let running_desired_containers: Map<string, ServiceFile> = new Map();

  // 1. Delete not-desired running containers
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

async function test(servicesDirectory: string, oldServicesDirectory: string) {
  // Get running/stopped containers, exclude nginx container
  const existing_containers = (await get_all_containers()).filter(
    (name) => !(name === "nginx"),
  );

  let desired_services: ServiceFile[] = await readServices(servicesDirectory);
  let old_services: ServiceFile[] = await readServices(oldServicesDirectory);

  await update_containers(existing_containers, desired_services, old_services);
}

test("./services", "./services");
