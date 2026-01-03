import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';
import yaml from 'js-yaml';


interface ComposeService {
  image?: string;
  'x-caddy-port'?: string | number;
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
  domain?: string;  // Optional domain (default: localhost)
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
    } else if (arg === '--domain' && nextArg) {
      options.domain = nextArg;
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
    console.error('    --output-dir <output-directory> \\');
    console.error('    [--domain <domain>]  # Optional, defaults to localhost');
    console.error('\nExample:');
    console.error('  tsx src/index.ts \\');
    console.error('    --compose-path ../compose.yaml \\');
    console.error('    --output-dir . \\');
    console.error('    --domain example.com');
    process.exit(1);
  }

  return {
    composePath: options.composePath!,
    outputDir: options.outputDir!,
    domain: options.domain || 'localhost',  // Default to localhost if not provided
  };
}

async function validatePaths(composePath: string): Promise<void> {
  // Check if compose.yaml exists
  try {
    await access(composePath, constants.R_OK);
  } catch {
    throw new Error(`compose.yaml not found at: ${composePath}`);
  }
}

async function generateCaddyfile(): Promise<void> {
  try {
    const options = parseArgs();

    console.log('Configuration:');
    console.log(`  compose.yaml: ${options.composePath}`);
    console.log(`  Output dir:   ${options.outputDir}`);
    console.log(`  Domain:       ${options.domain}`);
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

    // Ensure output directory exists
    console.log('Ensuring output directory exists...');
    await mkdir(options.outputDir, { recursive: true });

    // Prepare output file path
    // IMPORTANT: Do NOT delete the file before writing!
    // Deleting creates a new inode, which breaks Docker bind mounts.
    // The container would still see the old (deleted) file until restart.
    // Simply overwriting preserves the inode and updates the content immediately.
    const caddyfilePath = join(options.outputDir, 'Caddyfile');

    // Generate server blocks for each service
    console.log(`\nNow generating Caddyfile...`);
    const services = Object.entries(composeData.services);
    const serverBlocks: string[] = [];
    let serviceCount = 0;

    for (const [serviceName, serviceConfig] of services) {
      // Skip services without x-caddy-port (not exposed via caddy)
      if (!serviceConfig['x-caddy-port']) {
        console.log(`Skipping ${serviceName} (no x-caddy-port specified)`);
        continue;
      }

      // Generate server block for this service
      const serverBlock = generateServerBlock(serviceName, serviceConfig, options.domain!);
      serverBlocks.push(serverBlock);

      console.log(`Adding ${serviceName}.${options.domain} route (port: ${serviceConfig['x-caddy-port']})`);
      serviceCount++;
    }

    // Combine all server blocks into Caddyfile
    const caddyfileContent = generateCaddyfileContent(serverBlocks, options.domain!);

    console.log(`\nWriting Caddyfile...`);
    await writeFile(caddyfilePath, caddyfileContent, 'utf-8');

    console.log(`\n✅ Successfully generated Caddyfile with ${serviceCount} service(s) in ${options.outputDir}`);
  } catch (error) {
    console.error('❌ Error generating Caddyfile:', error);
    process.exit(1);
  }
}

function generateServerBlock(serviceName: string, serviceConfig: ComposeService, domain: string): string {
  const port = serviceConfig['x-caddy-port'];

  // x-caddy-port is required - this function should only be called for services with it
  if (!port) {
    throw new Error(`Service ${serviceName} missing required x-caddy-port`);
  }

  // Subdomain-based routing: servicename.domain -> http://servicename:port
  return `${serviceName}.${domain} {
\treverse_proxy ${serviceName}:${port}
}`;
}

function generateCaddyfileContent(serverBlocks: string[], domain: string): string {
  const header = `# This file is auto-generated by caddyfile-generator
# DO NOT EDIT MANUALLY - changes will be overwritten
# Subdomain-based routing for services`;

  // Always include default domain response
  const defaultBlock = `${domain} {
\trespond "Hello, Caddy!"
}`;

  if (serverBlocks.length === 0) {
    return `${header}

${defaultBlock}
`;
  }

  return `${header}

${defaultBlock}

${serverBlocks.join('\n\n')}
`;
}

// Run the generator
generateCaddyfile();
