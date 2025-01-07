import { mkdir, rm, writeFile } from "fs/promises";
import { type Service } from "./service_schema";
import { readYAMLJSONs } from "./yaml/util_read";
import { validate_all_services } from "./service_validator";

function generateServerBlock(service: Service): string {
  return `server {
  listen       80;
  server_name  ${service.nginx.subdomain}.localhost;
  
  location / {
    # Docker network bridge in linux
    proxy_pass http://172.17.0.1:${service.container.port}/;
  }
}
`;
}

/**
 * Generate nginx configuration file.
 * @param service Service object
 * @param createAt Directory to save the configuration file
 */
async function generateConfigFile(service: Service, createAt: string) {
  if (createAt.endsWith("/")) {
    createAt = createAt.slice(0, -1);
  }
  const fullPath = `${createAt}/${service.nginx.subdomain}.conf`;
  const serverBlock = generateServerBlock(service);

  await writeFile(fullPath, serverBlock);
}

async function renew_config_files_by_yaml(
  servicesDirectory: string,
  configsDirectory: string,
) {
  const services: { path: string; obj: unknown }[] =
    await readYAMLJSONs(servicesDirectory);
  if (!validate_all_services(services, false)) {
    throw new Error(
      "There are invalid service files. Try 'pnpm validate-services' first.",
    );
  }

  // 1. Delete all configuration files
  try {
    await rm(configsDirectory, { recursive: true });
  } catch (error) {
    if (error instanceof Object && "code" in error && error.code === "ENOENT") {
      // Ignore error if directory does not exist
    } else {
      throw error;
    }
  }

  // 2. Create all configuration files
  await mkdir(configsDirectory);
  for (const { obj } of services) {
    await generateConfigFile(obj, configsDirectory);
  }
}

export async function main(
  servicesDirectory: string,
  configsDirectory: string,
) {
  await renew_config_files_by_yaml(servicesDirectory, configsDirectory);
}
