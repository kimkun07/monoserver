# Nginx Config Generator

Automatically generates Nginx reverse proxy configuration files from `compose.yaml`.

## Overview

This tool reads your `compose.yaml` file and creates individual Nginx `.conf` files for each service in the `nginx/conf.d/` directory. Each service gets its own subdomain-based proxy configuration with customizable listen ports and proxy destinations.

## Features

- **Auto-generated configs**: Creates Nginx configs from Docker Compose services
- **Flexible port configuration**: Support for both default ports and multiple listen ports
- **Dynamic proxy routing**: Use fixed ports or `$server_port` for dynamic routing
- **Safety validation**: Validates paths before removing directories
- **CLI parameters**: Customize paths and service names
- **Comprehensive tests**: Full test suite with expected output validation

## How It Works

1. Reads `compose.yaml` from the specified path (or project root)
2. Validates that nginx directory and nginx.conf exist (safety check)
3. Extracts all services (except the nginx proxy service itself)
4. For each service:
   - Creates a `{service-name}.conf` file
   - Configures subdomain routing: `{service-name}.localhost`
   - Sets up reverse proxy with appropriate ports

## Usage

### Basic Usage

```bash
# Install dependencies
npm install

# Generate configs (uses preconfigured parameters)
npm run generate

# Run tests
npm test
```

### CLI Usage

**All parameters are required.** There are no default values.

```bash
tsx src/index.ts \
  --compose-path <path-to-compose.yaml> \
  --output-dir <output-directory> \
  --nginx-service <nginx-service-name>
```

**Example:**
```bash
tsx src/index.ts \
  --compose-path ../compose.yaml \
  --output-dir ../nginx/conf.d \
  --nginx-service monoserver-nginx-main
```

**Running without parameters will fail:**
```bash
$ tsx src/index.ts
❌ Error: Missing required parameters: --compose-path, --output-dir, --nginx-service

Usage:
  tsx src/index.ts \
    --compose-path <path-to-compose.yaml> \
    --output-dir <output-directory> \
    --nginx-service <nginx-service-name>
```

### CLI Options

All parameters are **required**:

- `--compose-path`: Path to compose.yaml file
- `--output-dir`: Output directory for .conf files
- `--nginx-service`: Name of nginx service to skip (the proxy service itself)

## compose.yaml Configuration

### Service Fields

Services use custom `x-monoserver-*` fields for configuration:

```yaml
services:
  my-service:
    image: my-image
    x-monoserver-default-port: "8080"      # Optional: Default proxy port
    x-monoserver-listen-ports: [80, 8080]  # Optional: Ports to listen on
```

### Field Details

#### `x-monoserver-default-port` (optional)

Specifies the port to proxy to on the backend service.

- **If specified**: Uses `http://service-name:{port}/`
- **If omitted**: Uses `http://service-name:$server_port/` (dynamic routing based on client's connection port)

#### `x-monoserver-listen-ports` (optional)

Array of ports for Nginx to listen on.

- **If specified**: Nginx listens on all specified ports
- **If omitted**: Defaults to `[80]`

### Configuration Examples

#### Full Configuration
```yaml
my-service:
  image: my-app
  x-monoserver-default-port: "3000"
  x-monoserver-listen-ports: [80, 8080, 9000]
```

Generates:
```nginx
server {
  listen       80;
  listen       8080;
  listen       9000;
  server_name  my-service.localhost;

  location / {
    proxy_pass http://my-service:3000/;
  }
}
```

#### Default Port Only
```yaml
my-service:
  image: my-app
  x-monoserver-default-port: "5000"
```

Generates:
```nginx
server {
  listen       80;
  server_name  my-service.localhost;

  location / {
    proxy_pass http://my-service:5000/;
  }
}
```

#### Listen Ports Only (Dynamic Routing)
```yaml
my-service:
  image: my-app
  x-monoserver-listen-ports: [80, 443]
```

Generates:
```nginx
server {
  listen       80;
  listen       443;
  server_name  my-service.localhost;

  location / {
    proxy_pass http://my-service:$server_port/;
  }
}
```

#### Minimal (All Defaults)
```yaml
my-service:
  image: my-app
```

Generates:
```nginx
server {
  listen       80;
  server_name  my-service.localhost;

  location / {
    proxy_pass http://my-service:$server_port/;
  }
}
```

## Safety Features

### Path Validation

Before removing any directories, the generator validates:

1. **compose.yaml exists**: The specified compose file must be readable
2. **nginx directory exists**: Must be in the same location as compose.yaml
3. **nginx.conf exists**: Must be present in the nginx directory

This prevents accidental deletion of wrong directories and ensures you're working with a valid nginx setup.

## Testing

The project includes a comprehensive test suite:

```bash
npm test
```

The test suite:
- Uses a test compose.yaml with multiple service configurations
- Generates configs to a test output directory
- Compares generated files with expected output
- Reports any mismatches with detailed diffs

Test files are located in:
- `test/compose.yaml`: Test input file
- `test/expected/`: Expected output files
- `test/nginx/conf.d/`: Generated output (created during test)

## Project Structure

```
nginx-config-generator/
├── src/
│   ├── index.ts          # Main generator script
│   └── test-runner.ts    # Test suite runner
├── test/
│   ├── compose.yaml      # Test input
│   ├── nginx/
│   │   └── nginx.conf    # Required for validation
│   └── expected/         # Expected output files
├── dist/                 # Compiled output (after build)
├── package.json
├── tsconfig.json
└── README.md
```

## Generated File Format

All generated files include a header comment:

```nginx
# This file is auto-generated by nginx-config-generator
# DO NOT EDIT MANUALLY - changes will be overwritten
# Generated from compose.yaml service: {service-name}
```

## Requirements

- Node.js 18+
- TypeScript
- compose.yaml with nginx directory structure

## Development

```bash
# Build TypeScript
npm run build

# Run generator with explicit parameters (required)
tsx src/index.ts \
  --compose-path ../compose.yaml \
  --output-dir ../nginx/conf.d \
  --nginx-service monoserver-nginx-main

# Run with test files
tsx src/index.ts \
  --compose-path ./test/compose.yaml \
  --output-dir ./test/nginx/conf.d \
  --nginx-service test-nginx
```
