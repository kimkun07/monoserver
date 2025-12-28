import { readFile, writeFile, mkdir, rm, access } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';
import yaml from 'js-yaml';


interface ComposeService {
  image?: string;
  'x-monoserver-default-port'?: string | number;
  [key: string]: any;
}

interface ComposeFile {
  services: {
    [serviceName: string]: ComposeService;
  };
}

interface GeneratorOptions {
  composePath: string;
  outputDir: string;
}

// NOTE: deploy.yml will use hardcoded 'monoserver-nginx-main'
const NGINX_SERVICE_NAME = 'monoserver-nginx-main';

function parseArgs(): GeneratorOptions {
  const args = process.argv.slice(2);
  const options: Partial<GeneratorOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--compose-path' && nextArg) {
      options.composePath = nextArg;
      i++;
    } else if (arg === '--output-dir' && nextArg) {
      options.outputDir = nextArg;
      i++;
    }
  }

  // Validate all required parameters are provided
  const missing: string[] = [];
  if (!options.composePath) missing.push('--compose-path');
  if (!options.outputDir) missing.push('--output-dir');

  if (missing.length > 0) {
    console.error('❌ Error: Missing required parameters:', missing.join(', '));
    console.error('\nUsage:');
    console.error('  tsx src/index.ts \\');
    console.error('    --compose-path <path-to-compose.yaml> \\');
    console.error('    --output-dir <output-directory>');
    console.error('\nExample:');
    console.error('  tsx src/index.ts \\');
    console.error('    --compose-path ../compose.yaml \\');
    console.error('    --output-dir ../nginx');
    process.exit(1);
  }

  return {
    composePath: options.composePath!,
    outputDir: options.outputDir!,
  };
}

async function validatePaths(composePath: string): Promise<void> {
  // Check if compose.yaml exists
  try {
    await access(composePath, constants.R_OK);
  } catch {
    throw new Error(`compose.yaml not found at: ${composePath}`);
  }

  // Get the directory containing compose.yaml
  const composeDir = dirname(composePath);

  // Verify nginx directory exists in the same location as compose.yaml
  // This prevents accidental force removal of wrong directories
  const nginxDir = join(composeDir, 'nginx');
  try {
    await access(nginxDir, constants.R_OK);
  } catch {
    throw new Error(
      `nginx directory not found at: ${nginxDir}\n` +
      `For safety, nginx directory must exist in the same location as compose.yaml`
    );
  }

  // Verify nginx.conf exists
  const nginxConf = join(nginxDir, 'nginx.conf');
  try {
    await access(nginxConf, constants.R_OK);
  } catch {
    throw new Error(
      `nginx.conf not found at: ${nginxConf}\n` +
      `For safety, nginx.conf must exist to confirm this is a valid nginx directory`
    );
  }
}

async function generateNginxConfigs(): Promise<void> {
  try {
    const options = parseArgs();

    console.log('Configuration:');
    console.log(`  compose.yaml: ${options.composePath}`);
    console.log(`  Output dir:   ${options.outputDir}`);
    console.log(`  Nginx service: ${NGINX_SERVICE_NAME}`);
    console.log();

    // Validate paths before proceeding
    console.log('Validating paths...');
    await validatePaths(options.composePath);

    console.log('Reading compose.yaml...');
    const composeContent = await readFile(options.composePath, 'utf-8');

    console.log('Parsing compose.yaml...');
    const composeData = yaml.load(composeContent) as ComposeFile;

    if (!composeData.services) {
      throw new Error('No services found in compose.yaml');
    }

    // Validate that the nginx service exists
    if (!composeData.services[NGINX_SERVICE_NAME]) {
      throw new Error(
        `Required nginx service "${NGINX_SERVICE_NAME}" not found in compose.yaml.\n` +
        `The nginx service must be named exactly "${NGINX_SERVICE_NAME}" to work with the deployment system.`
      );
    }

    // Ensure output directory exists
    // This is safe because we validated that nginx/nginx.conf exists
    console.log('Ensuring output directory exists...');
    await mkdir(options.outputDir, { recursive: true });

    // Remove old routes.conf if it exists
    const confFilePath = join(options.outputDir, 'routes.conf');
    try {
      await rm(confFilePath, { force: true });
    } catch (error) {
      // File might not exist, that's ok
    }

    // Generate location blocks for each service
    console.log(`\nNow generating config file...`);
    const services = Object.entries(composeData.services);
    const locationBlocks: string[] = [];
    let serviceCount = 0;

    for (const [serviceName, serviceConfig] of services) {
      // Skip nginx service itself
      if (serviceName === NGINX_SERVICE_NAME) {
        console.log(`Skipping ${serviceName} (nginx proxy container itself)`);
        continue;
      }

      // Generate location block for this service
      const locationBlock = generateLocationBlock(serviceName, serviceConfig);
      locationBlocks.push(locationBlock);

      const portInfo = serviceConfig['x-monoserver-default-port']
        ? `port: ${serviceConfig['x-monoserver-default-port']}`
        : 'port: $server_port';

      console.log(`Adding /${serviceName}/ route (${portInfo})`);
      serviceCount++;
    }

    // Combine all location blocks into a single server block
    const nginxConfig = generateServerConfig(locationBlocks);

    console.log(`\nWriting routes.conf...`);
    await writeFile(confFilePath, nginxConfig, 'utf-8');

    console.log(`\n✅ Successfully generated nginx config with ${serviceCount} route(s) in ${options.outputDir}`);
  } catch (error) {
    console.error('❌ Error generating nginx configs:', error);
    process.exit(1);
  }
}

function generateLocationBlock(serviceName: string, serviceConfig: ComposeService): string {
  const defaultPort = serviceConfig['x-monoserver-default-port'];

  // Build proxy_pass URL using variables for dynamic DNS resolution
  // Using variables forces nginx to resolve DNS at request time, not at startup
  // This prevents "host not found" errors when containers start in any order
  const port = defaultPort || '$server_port';
  const upstreamVar = `upstream_${serviceName.replace(/-/g, '_')}`;

  // Path-based routing: /servicename/ -> http://servicename:port/
  // The trailing slash in proxy_pass is critical: it removes the /servicename prefix
  // Example: /hello/abc -> http://hello:5678/abc (not /hello/abc)
  return `  # Route for service: ${serviceName}
  location /${serviceName}/ {
    # Using a variable forces nginx to resolve DNS at request time
    # This prevents startup failures when upstream containers aren't ready yet
    set $${upstreamVar} ${serviceName};
    proxy_pass http://$${upstreamVar}:${port}/;
  }`;
}

function generateServerConfig(locationBlocks: string[]): string {
  const listenPorts = [80]; // Default to port 80
  const listenDirectives = listenPorts
    .map(port => `  listen       ${port};`)
    .join('\n');

  return `# This file is auto-generated by nginx-config-generator
# DO NOT EDIT MANUALLY - changes will be overwritten
# Path-based routing for all services

server {
${listenDirectives}
  server_name  _;  # Accept all hostnames/IPs

${locationBlocks.join('\n\n')}
}
`;
}

// Run the generator
generateNginxConfigs();
