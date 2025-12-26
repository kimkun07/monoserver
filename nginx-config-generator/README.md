# Nginx Config Generator

Automatically generates Nginx reverse proxy configuration files from `compose.yaml`.

## Overview

This tool reads your `compose.yaml` file and creates individual Nginx `.conf` files for each service in the `nginx/conf.d/` directory. Each service gets its own subdomain-based proxy configuration.

## How It Works

1. Reads `compose.yaml` from the project root
2. Extracts all services (except `monoserver-nginx-main`)
3. For each service with an `x-monoserver-port` field:
   - Creates a `{service-name}.conf` file in `nginx/conf.d/`
   - Configures subdomain routing: `{service-name}.localhost`
   - Sets up reverse proxy to `http://{service-name}:{port}/`

## Usage

### Install Dependencies

```bash
npm install
```

### Generate Configs

```bash
npm run generate
```

### Test (Generate + Display)

```bash
npm run test
```

### Build TypeScript

```bash
npm run build
```

## compose.yaml Format

Services must include the `x-monoserver-port` field:

```yaml
services:
  my-service:
    image: my-image
    x-monoserver-port: "8080"  # Port number for browser access without port
```

## Generated Config Example

For a service named `hello` with port `5678`:

```nginx
server {
  listen       80;
  server_name  hello.localhost;

  location / {
    proxy_pass http://hello:5678/;
  }
}
```

## Requirements

- Node.js 18+
- TypeScript
- compose.yaml in parent directory

## Project Structure

```
nginx-config-generator/
├── src/
│   └── index.ts          # Main generator script
├── dist/                 # Compiled output (after build)
├── package.json
├── tsconfig.json
└── README.md
```

## Notes

- The `monoserver-nginx-main` service is automatically excluded
- Existing files in `nginx/conf.d/` are cleaned up before generation
- Services without `x-monoserver-port` are skipped with a warning
