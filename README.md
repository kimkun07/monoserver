> [!CAUTION]
> AI Generated README. May be wrong.

# monoserver

Declarative Docker container orchestration with automatic deployment via Git commits. Simply update `compose.yaml` in GitHub, commit, and your services automatically deploy to your server with Nginx reverse proxy configured.

## Overview

**monoserver** automates the deployment of Docker containers with subdomain-based routing. Define your services in `compose.yaml`, push to GitHub, and let GitHub Actions handle the rest.

### Key Features

- **Git-based deployment**: Push to GitHub triggers automatic container updates
- **Declarative configuration**: Services defined in standard `compose.yaml`
- **Automatic reverse proxy**: Nginx configs generated from service definitions
- **Subdomain routing**: Access services via `service.yourdomain.com`
- **Zero-downtime updates**: Nginx reload without service interruption

## Architecture

```
GitHub Repository (compose.yaml)
        ↓
  [Git Push/Commit]
        ↓
  GitHub Actions Workflow
        ↓
  SSH to Compute Engine
        ↓
  Pull & Deploy Containers
        ↓
  Update Nginx Configs
        ↓
  Services Running with Proxy
```

## Installation

### Prerequisites

- Google Compute Engine instance (or any Linux server with SSH access)
- GitHub account
- Domain with DNS access (optional, can use `.localhost` for local testing)

### Step 1: Fork Repository

1. Go to the monoserver repository on GitHub
2. Click "Fork" to create your own copy
3. Clone your forked repository locally (optional for testing)

### Step 2: Server Setup (Compute Engine)

SSH into your Compute Engine instance and set up the environment:

#### Install Docker (Rootless Mode)

Rootless Docker provides better security by running Docker daemon as a non-root user.

```bash
# Update system packages
sudo apt-get update
sudo apt-get install -y uidmap dbus-user-session

# Install Docker rootless
curl -fsSL https://get.docker.com/rootless | sh

# Add Docker to PATH
echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock' >> ~/.bashrc
source ~/.bashrc

# Enable Docker service to start on boot
systemctl --user enable docker
loginctl enable-linger $(whoami)

# Verify installation
docker ps
docker compose version
```

#### Clone Your Repository

```bash
# Install Git if not already installed
sudo apt-get install -y git

# Clone your forked repository
git clone https://github.com/YOUR_USERNAME/monoserver.git
cd monoserver

# Test docker compose locally
docker compose up -d
docker compose ps
```

### Step 3: GitHub Actions Setup

#### Generate SSH Key on Compute Engine

```bash
# Generate SSH key (press Enter for all prompts)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Display public key and add it to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Display private key (you'll add this to GitHub)
cat ~/.ssh/github_actions
```

#### Configure GitHub Secrets

1. Go to your forked repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

| Secret Name | Value |
|------------|-------|
| `SERVER_HOST` | Your Compute Engine external IP address |
| `SERVER_USER` | Your server username (usually your GCP username) |
| `SERVER_SSH_KEY` | Private key content from `~/.ssh/github_actions` |

#### Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to Server

on:
  push:
    branches: [ main ]
    paths:
      - 'compose.yaml'
      - 'nginx/**'
      - '.github/workflows/deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SERVER_SSH_KEY }}
        script: |
          cd monoserver
          git pull origin main
          docker compose down
          docker compose up -d
          docker compose ps
```

### Step 4: Test Deployment

1. Make a change to `compose.yaml` in your repository
2. Commit and push:
   ```bash
   git add compose.yaml
   git commit -m "test: update service configuration"
   git push origin main
   ```
3. Go to **Actions** tab in GitHub to monitor the workflow
4. Once complete, verify services are running:
   ```bash
   ssh YOUR_SERVER
   cd monoserver
   docker compose ps
   ```

### Step 5: Access Your Services

If you configured DNS:
- `http://hello.yourdomain.com` → hello service
- `http://yourdomain.com` → nginx default page

For local testing:
- Edit `/etc/hosts` to add: `SERVER_IP hello.localhost`
- Access `http://hello.localhost`

## Usage

### Adding a New Service

1. Edit `compose.yaml`:
   ```yaml
   services:
     nginx-main:
       image: nginx:1.27.3
       ports:
       - "80:80"
       volumes:
       - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
       - ./nginx/conf.d:/etc/nginx/conf.d:ro

     myapp:
       image: myapp:latest
       labels:
       - "service-title=My Application"
   ```

2. Create Nginx config `nginx/conf.d/myapp.conf`:
   ```nginx
   server {
     listen       80;
     server_name  myapp.localhost;

     location / {
       proxy_pass http://myapp:8080/;
     }
   }
   ```

3. Commit and push:
   ```bash
   git add compose.yaml nginx/conf.d/myapp.conf
   git commit -m "feat: add myapp service"
   git push origin main
   ```

GitHub Actions will automatically deploy your changes.

## Project Structure

```
monoserver/
├── compose.yaml              # Docker Compose service definitions
├── nginx/
│   ├── nginx.conf           # Main Nginx configuration
│   └── conf.d/              # Service-specific proxy configs
│       └── *.conf
├── apps/
│   ├── manager/             # CLI tool for local management
│   └── landing/             # Example Express.js app
├── packages/
│   └── service/             # Shared service schema & types
└── .github/
    └── workflows/
        └── deploy.yml       # Deployment automation
```

## Local Development

For local development and testing without deploying to server:

```bash
# Install dependencies
pnpm install

# Validate service configurations
pnpm --filter manager validate-services

# Generate Nginx configs
pnpm --filter manager update-conf-files

# Test locally with Docker Compose
docker compose up

# Check service status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Troubleshooting

### Docker permission denied
If using rootless Docker, ensure:
```bash
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
```

### GitHub Actions fails to connect
- Verify `SERVER_HOST` is the external IP, not internal
- Check SSH key is correctly formatted (including `-----BEGIN` and `-----END` lines)
- Ensure firewall allows SSH (port 22)

### Services not accessible
- Check Nginx is running: `docker compose ps nginx-main`
- Verify Nginx configs: `docker compose exec nginx-main nginx -t`
- Check DNS or `/etc/hosts` configuration

### Port conflicts
- Ensure only one service binds to port 80 (nginx-main)
- Backend services should use internal ports only (no `ports:` mapping needed)

## Security Considerations

- **Rootless Docker**: Runs without root privileges, reducing attack surface
- **Read-only configs**: Nginx configs mounted as `:ro` prevent tampering
- **SSH key rotation**: Regularly rotate GitHub Actions SSH keys
- **Firewall**: Configure UFW or Cloud Firewall to allow only ports 80, 443, 22

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm format:check && pnpm build`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Create a Pull Request

## License

MIT License - See LICENSE file for details

## Links

- [Docker Rootless Mode Documentation](https://docs.docker.com/engine/security/rootless/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Proxy Configuration](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
