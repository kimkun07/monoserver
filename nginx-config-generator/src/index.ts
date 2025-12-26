import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ComposeService {
  image?: string;
  'x-monoserver-port'?: string | number;
  [key: string]: any;
}

interface ComposeFile {
  services: {
    [serviceName: string]: ComposeService;
  };
}

async function generateNginxConfigs(): Promise<void> {
  try {
    // Paths
    const projectRoot = join(__dirname, '../..');
    const composeFilePath = join(projectRoot, 'compose.yaml');
    const nginxConfDir = join(projectRoot, 'nginx/conf.d');

    console.log('Reading compose.yaml...');
    const composeContent = await readFile(composeFilePath, 'utf-8');

    console.log('Parsing compose.yaml...');
    const composeData = yaml.load(composeContent) as ComposeFile;

    if (!composeData.services) {
      throw new Error('No services found in compose.yaml');
    }

    // Clean up existing conf.d directory
    console.log('Cleaning up existing nginx/conf.d directory...');
    try {
      await rm(nginxConfDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's ok
    }
    await mkdir(nginxConfDir, { recursive: true });

    // Generate configs for each service
    const services = Object.entries(composeData.services);
    let generatedCount = 0;

    for (const [serviceName, serviceConfig] of services) {
      // Skip nginx service itself
      if (serviceName === 'monoserver-nginx-main') {
        console.log(`Skipping ${serviceName} (nginx proxy itself)`);
        continue;
      }

      // Get port from x-monoserver-port field
      const port = serviceConfig['x-monoserver-port'];

      if (!port) {
        console.warn(`Warning: ${serviceName} has no x-monoserver-port field, skipping`);
        continue;
      }

      // Generate nginx config
      const nginxConfig = generateNginxConfig(serviceName, String(port));
      const confFilePath = join(nginxConfDir, `${serviceName}.conf`);

      console.log(`Generating ${serviceName}.conf (port: ${port})...`);
      await writeFile(confFilePath, nginxConfig, 'utf-8');
      generatedCount++;
    }

    console.log(`\n✅ Successfully generated ${generatedCount} nginx config file(s) in ${nginxConfDir}`);
  } catch (error) {
    console.error('❌ Error generating nginx configs:', error);
    process.exit(1);
  }
}

function generateNginxConfig(serviceName: string, port: string): string {
  return `server {
  listen       80;
  server_name  ${serviceName}.localhost;

  location / {
    proxy_pass http://${serviceName}:${port}/;
  }
}
`;
}

// Run the generator
generateNginxConfigs();
