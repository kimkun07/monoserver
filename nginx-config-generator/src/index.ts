import { readFile, writeFile, mkdir, rm, access } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';
import yaml from 'js-yaml';


interface ComposeService {
  image?: string;
  'x-monoserver-default-port'?: string | number;
  'x-monoserver-listen-ports'?: number[];
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
  nginxServiceName: string;
}

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
    } else if (arg === '--nginx-service' && nextArg) {
      options.nginxServiceName = nextArg;
      i++;
    }
  }

  // Validate all required parameters are provided
  const missing: string[] = [];
  if (!options.composePath) missing.push('--compose-path');
  if (!options.outputDir) missing.push('--output-dir');
  if (!options.nginxServiceName) missing.push('--nginx-service');

  if (missing.length > 0) {
    console.error('❌ Error: Missing required parameters:', missing.join(', '));
    console.error('\nUsage:');
    console.error('  tsx src/index.ts \\');
    console.error('    --compose-path <path-to-compose.yaml> \\');
    console.error('    --output-dir <output-directory> \\');
    console.error('    --nginx-service <nginx-service-name>');
    console.error('\nExample:');
    console.error('  tsx src/index.ts \\');
    console.error('    --compose-path ../compose.yaml \\');
    console.error('    --output-dir ../nginx/conf.d \\');
    console.error('    --nginx-service monoserver-nginx-main');
    process.exit(1);
  }

  return {
    composePath: options.composePath!,
    outputDir: options.outputDir!,
    nginxServiceName: options.nginxServiceName!,
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
    console.log(`  Nginx service: ${options.nginxServiceName}`);
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

    // Clean up existing conf.d directory
    // This is safe because we validated that nginx/nginx.conf exists
    console.log('Cleaning up existing output directory...');
    try {
      await rm(options.outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's ok
    }
    await mkdir(options.outputDir, { recursive: true });

    // Generate configs for each service
    console.log(`\nNow generating config files...`);
    const services = Object.entries(composeData.services);
    let generatedCount = 0;

    for (const [serviceName, serviceConfig] of services) {
      // Skip nginx service itself
      if (serviceName === options.nginxServiceName) {
        console.log(`Skipping ${serviceName} (nginx proxy container itself)`);
        continue;
      }

      // Generate nginx config (even if no default port is specified)
      const nginxConfig = generateNginxConfig(serviceName, serviceConfig);
      const confFilePath = join(options.outputDir, `${serviceName}.conf`);

      const portInfo = serviceConfig['x-monoserver-default-port']
        ? `default port: ${serviceConfig['x-monoserver-default-port']}`
        : 'using $server_port';
      const listenPorts = serviceConfig['x-monoserver-listen-ports'] || [80];

      console.log(`Generating ${serviceName}.conf (${portInfo}, listen: ${listenPorts.join(', ')})...`);
      await writeFile(confFilePath, nginxConfig, 'utf-8');
      generatedCount++;
    }

    console.log(`\n✅ Successfully generated ${generatedCount} nginx config file(s) in ${options.outputDir}`);
  } catch (error) {
    console.error('❌ Error generating nginx configs:', error);
    process.exit(1);
  }
}

function generateNginxConfig(serviceName: string, serviceConfig: ComposeService): string {
  const defaultPort = serviceConfig['x-monoserver-default-port'];
  const listenPorts = serviceConfig['x-monoserver-listen-ports'] || [80];

  // Build proxy_pass URL using variables for dynamic DNS resolution
  // Using variables forces nginx to resolve DNS at request time, not at startup
  // This prevents "host not found" errors when containers start in any order
  const port = defaultPort || '$server_port';
  const upstreamVar = `upstream_${serviceName.replace(/-/g, '_')}`;

  // Build listen directives
  const listenDirectives = listenPorts
    .map(port => `  listen       ${port};`)
    .join('\n');

  return `# This file is auto-generated by nginx-config-generator
# DO NOT EDIT MANUALLY - changes will be overwritten
# Generated from compose.yaml service: ${serviceName}

server {
${listenDirectives}
  server_name  ${serviceName}.localhost;

  location / {
    # Using a variable forces nginx to resolve DNS at request time
    # This prevents startup failures when upstream containers aren't ready yet
    set $${upstreamVar} ${serviceName};
    proxy_pass http://$${upstreamVar}:${port}/;
  }
}
`;
}

// Run the generator
generateNginxConfigs();
