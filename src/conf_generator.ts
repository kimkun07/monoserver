import { mkdir, rm, writeFile } from "fs/promises";
import { type Service } from "./service_schema";
import { readServices } from "./util_service_read";

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

/**Generate nginx configuration files from service files.
 * @param servicesDirectory Directory (recursively) containing service files
 * @param configsDirectory Directory to save the configuration files (flattened)
 * @example await renew_config_files_by_yaml("./services", "./nginx/conf.d");
 *          ./services/service1.yaml     -> ./nginx/conf.d/service1.conf
 *          ./services/.../service1.yaml -> ./nginx/conf.d/service1.conf
 */
async function renew_config_files_by_yaml(
  servicesDirectory: string,
  configsDirectory: string,
) {
  const services: { path: string; service: Service }[] =
    await readServices(servicesDirectory);

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
  for (const { service } of services) {
    await generateConfigFile(service, configsDirectory);
  }
}

export async function main(
  servicesDirectory: string,
  configsDirectory: string,
) {
  await renew_config_files_by_yaml(servicesDirectory, configsDirectory);
}
