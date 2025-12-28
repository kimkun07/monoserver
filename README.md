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

Follow these steps **on your GCE instance** after SSH-ing in.

#### 1. Install Git

```bash
# Update package list and install Git
sudo apt-get update
sudo apt-get install -y git
```

#### 2. Connect to GitHub

```bash
# Configure Git (replace with your info)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Generate SSH key for GitHub
ssh-keygen -t ed25519 -C "your.email@example.com" -f ~/.ssh/id_ed25519_github
# Press Enter for all prompts (no passphrase recommended for automation)

# Start ssh-agent in the background
eval "$(ssh-agent -s)"

# Add SSH private key to ssh-agent
ssh-add ~/.ssh/id_ed25519_github

# Display the public key (for adding to GitHub)
cat ~/.ssh/id_ed25519_github.pub
```

**Add the public key to GitHub (via web browser):**
1. Copy the entire output from `cat ~/.ssh/id_ed25519_github.pub` command
2. Open https://github.com in your **web browser**
3. Click your profile picture (top right) → **Settings**
4. In the left sidebar, click **SSH and GPG keys**
5. Click **New SSH key** button
6. Give it a title (e.g., "GCE monoserver")
7. Paste the public key into the "Key" field
8. Click **Add SSH key**

**Test GitHub connection:**
```bash
# Test SSH connection to GitHub
ssh -T git@github.com

# First time connecting: You'll see a fingerprint verification message
# Verify the fingerprint matches GitHub's (SHA256:+...)
# Type: yes

# You should see: "Hi username! You've successfully authenticated..."
```

#### 3. Clone Repository

```bash
# Clone your forked repository using SSH
git clone git@github.com:YOUR_USERNAME/monoserver.git
cd monoserver
```

#### 4. Install Docker (Rootless Mode)

Use the automated installation script included in the repository:

```bash
# Run the Docker rootless installation script with sudo
sudo bash scripts/install-docker-rootless.sh
```

The script will:
- Install prerequisites (uidmap)
- Install Docker in rootless mode
- Configure PATH and environment variables
- Enable Docker service to start on boot
- Set up privileged port binding (80, 443)
- Verify installation

Expected output looks like:
```
Docker Info:
Client:
 Version:           29.0.3
 Context:           rootless
 Plugins:
  compose:          v2.40.3

Server:
 Containers:        3 (Running: 0, Stopped: 3)
 Server Version:    29.0.3
 Security Options:  name=seccomp,profile=builtin name=rootless name=cgroupns 
```

**After installation completes, log out and log back in** for changes to take effect:
[TODO] logout 스텝이 필요한가?
```bash
exit
# SSH back into the instance
```

**Verify Docker is working:**
```bash
docker ps
docker compose version
```

#### 5. Set Up GitHub Actions SSH Access

Generate a dedicated SSH key for GitHub Actions to use:

```bash
# Generate SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
# Press Enter for all prompts (no passphrase)

# Add public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Display private key (you'll add this to GitHub Secrets)
cat ~/.ssh/github_actions
```

**Copy the entire private key output** (including `-----BEGIN` and `-----END` lines).

### Step 3: Configure GitHub Repository Settings

#### Add GitHub Secrets

1. Go to your forked repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of the following:

| Secret Name | Value | How to get |
|------------|-------|------------|
| `GCE_HOST` | Your Compute Engine external IP | Check GCE console or run `curl ifconfig.me` on the instance |
| `GCE_USER` | Your server username | Usually your GCP username, check with `whoami` on the instance |
| `GCE_SSH_KEY` | Private key for GitHub Actions | Output from `cat ~/.ssh/github_actions` (see Step 2.5) |

**Important:** Make sure to copy the **entire** private key including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines.

### Step 4: Test Automatic Deployment

Now test the GitHub Actions workflow:

#### 4.1. Make a test change

On your **local machine** (or directly on GitHub):

```bash
# Add a new service to compose.yaml
# For example, add whoami service if not present
git add compose.yaml
git commit -m "test: add new service"
git push origin main
```

#### 4.2. Monitor GitHub Actions

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. You should see a workflow run starting
4. Click on it to see detailed logs

**What the workflow does:**
1. ✅ Generates nginx config files from `compose.yaml`
2. ✅ Commits changes to `nginx/conf.d/` (if any)
3. ✅ SSHs into your GCE instance
4. ✅ Pulls latest code
5. ✅ Runs `docker compose up -d` (updates only changed services)
6. ✅ Reloads nginx configuration

#### 4.3. Verify deployment

```bash
# First, SSH into your server

# Check container status
cd monoserver
docker compose ps

# Verify nginx picked up new configs
docker compose exec monoserver-nginx-main ls -la /etc/nginx/conf.d/

# Test the services
curl http://localhost/
curl -H "Host: hello.localhost" http://localhost/
curl -H "Host: whoami.localhost" http://localhost/
```

### Step 5: Access Your Services

If you configured DNS:
- `http://hello.yourdomain.com` → hello service
- `http://yourdomain.com` → nginx default page


## How Automatic Updates Work

### When you change `compose.yaml`

1. **Trigger**: GitHub Actions detects changes to `compose.yaml`
2. **Generate**: Nginx configs are automatically regenerated
3. **Commit**: Changes to `nginx/conf.d/` are committed back to the repo
4. **Deploy**: Server pulls changes and updates containers
5. **Reload**: Nginx reloads configuration **without downtime**

**Key point:** `docker compose up -d` only restarts containers that changed. Unchanged containers keep running.

### When `nginx/conf.d/` files change

The workflow automatically runs:
```bash
docker compose exec monoserver-nginx-main nginx -s reload
```

This tells nginx to:
- ✅ Read new configuration files
- ✅ Start new worker processes with new config
- ✅ Gracefully shut down old worker processes
- ✅ **Zero downtime** - no dropped connections

### When services are added/removed

**Adding a service:**
1. Add to `compose.yaml` with `x-monoserver-default-port`
2. Push to GitHub
3. GitHub Actions generates new `.conf` file
4. Server starts the new container
5. Nginx adds the new route

**Removing a service:**
1. Remove from `compose.yaml`
2. Push to GitHub
3. GitHub Actions removes old `.conf` file
4. Server stops the container
5. Nginx removes the route

**No manual intervention needed!**

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
