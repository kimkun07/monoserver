import { writeFile } from "fs/promises";
import { readService, type Service } from "./src/service-schema";

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

async function test() {
  const aigenService = await readService("./services/aigen.yaml");
  await generateConfigFile(aigenService, "./nginx/conf.d");
}

test();
