# Nginx Config Generator

Automatically generates Nginx reverse proxy configuration files from `compose.yaml`.

## Overview

This tool reads your `compose.yaml` file and creates individual Nginx `.conf` files for each service in the `nginx/conf.d/` directory. Each service gets its own subdomain-based proxy configuration with customizable listen ports and proxy destinations.

## Features

- **Auto-generated configs**: Creates Nginx configs from Docker Compose services
- **Flexible port configuration**: Support for both default ports and multiple listen ports
- **Dynamic proxy routing**: Use fixed ports or `$server_port` for dynamic routing
- **Safety validation**: Validates paths before removing directories
- **Fixed nginx service name**: Always uses `monoserver-nginx-main` as the nginx service name (hardcoded)
- **Comprehensive tests**: Full test suite with expected output validation

## How It Works

1. Reads `compose.yaml` from the specified path (or project root)
2. Validates that nginx directory and nginx.conf exist (safety check)
3. **Validates that `monoserver-nginx-main` service exists** (required for deployment)
4. Extracts all services (except `monoserver-nginx-main` which is the nginx proxy itself)
5. For each service:
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
  --output-dir <output-directory>
```

**Example:**
```bash
tsx src/index.ts \
  --compose-path ../compose.yaml \
  --output-dir ../nginx/conf.d
```

**Running without parameters will fail:**
```bash
$ tsx src/index.ts
❌ Error: Missing required parameters: --compose-path, --output-dir

Usage:
  tsx src/index.ts \
    --compose-path <path-to-compose.yaml> \
    --output-dir <output-directory>
```

### CLI Options

All parameters are **required**:

- `--compose-path`: Path to compose.yaml file
- `--output-dir`: Output directory for .conf files

**Note**: The nginx service name is hardcoded as `monoserver-nginx-main` and will always be skipped during config generation.

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

### Service Validation

The generator validates that the required nginx service exists:

1. **monoserver-nginx-main must exist**: The compose.yaml file must contain a service named exactly `monoserver-nginx-main`
2. **Deployment compatibility**: This ensures compatibility with the GitHub Actions deployment workflow which hardcodes this service name
3. **Clear error messages**: If the service is missing or misnamed, the generator will fail with a descriptive error message

This prevents deployment failures by catching configuration errors early.

## Testing

The project includes a comprehensive data-driven test suite with 6 test cases:

```bash
# Run all tests
npm test

# Clean test output files
npm run test:clean
```

**Note**: The test runner automatically cleans up output files before each test case, so old outputs don't interfere with new test runs. Generated `.conf` files remain after tests for inspection.

### Test Cases

The test suite automatically discovers and runs all tests in `test/`:

1. **01-missing-params**: Tests that all required CLI parameters must be provided
2. **02-no-listen-ports**: Tests default listen port [80] when `x-monoserver-listen-ports` is omitted
3. **03-with-listen-ports**: Tests multiple listen ports configuration
4. **04-no-default-port**: Tests dynamic routing with `$server_port` when `x-monoserver-default-port` is omitted
5. **05-with-default-port**: Tests fixed port routing when `x-monoserver-default-port` is specified
6. **06-wrong-nginx-service**: Tests that the generator fails when nginx service is not named `monoserver-nginx-main`

### Test Structure

Each test case is a directory under `test/` containing:
- `test.json`: Test metadata (description, expected behavior, CLI parameters)
- `compose.yaml`: Test input file
- `expected/`: Directory with expected output `.conf` files
- `nginx/nginx.conf`: Required for path validation (except for failure tests)

Example `test.json`:
```json
{
  "description": "Should use default listen port [80] when not specified",
  "shouldFail": false,
  "params": {
    "composePath": "./compose.yaml",
    "outputDir": "./nginx/conf.d"
  }
}
```

For tests that should fail:
```json
{
  "description": "Should fail when required parameters are missing",
  "shouldFail": true,
  "expectedError": "Missing required parameters",
  "params": {
    "outputDir": "./nginx/conf.d"
  }
}
```

### Test Output

After running tests, generated configuration files are preserved in each test case's `nginx/conf.d/` directory:
- Files are automatically cleaned before each test run
- Output files remain after tests for manual inspection
- Use `npm run test:clean` to remove all test outputs manually

Example output locations:
- `test/02-no-listen-ports/nginx/conf.d/hello.conf`
- `test/03-with-listen-ports/nginx/conf.d/hello.conf`
- `test/03-with-listen-ports/nginx/conf.d/admin.conf`

## Project Structure

```
nginx-config-generator/
├── src/
│   ├── index.ts                   # Main generator script
│   └── test-runner.ts             # Test suite orchestrator
├── test/                          # Test cases (data-driven)
│   ├── 01-missing-params/
│   │   ├── test.json
│   │   └── compose.yaml
│   ├── 02-no-listen-ports/
│   │   ├── test.json
│   │   ├── compose.yaml
│   │   ├── expected/
│   │   │   └── hello.conf
│   │   └── nginx/nginx.conf
│   ├── 03-with-listen-ports/
│   │   ├── test.json
│   │   ├── compose.yaml
│   │   ├── expected/
│   │   │   ├── hello.conf
│   │   │   └── admin.conf
│   │   └── nginx/nginx.conf
│   ├── 04-no-default-port/
│   ├── 05-with-default-port/
│   └── 06-wrong-nginx-service/
├── dist/                          # Compiled output (after build)
├── package.json
├── tsconfig.json
├── .gitignore
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
  --output-dir ../nginx/conf.d

# Run with test files
tsx src/index.ts \
  --compose-path ./test/02-no-listen-ports/compose.yaml \
  --output-dir ./test/02-no-listen-ports/nginx/conf.d
```

**Note**: The nginx service `monoserver-nginx-main` is hardcoded and will always be excluded from config generation.
