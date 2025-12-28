> [!CAUTION]
> AI Generated README. May be wrong.

# monoserver

Declarative Docker container orchestration with automatic deployment via Git commits. Simply update `compose.yaml` in GitHub, commit, and your services automatically deploy to your server with Nginx reverse proxy configured.

## Overview

**monoserver** automates the deployment of Docker containers with path-based routing. Define your services in `compose.yaml`, push to GitHub, and let GitHub Actions handle the rest.

### Key Features

- **Git-based deployment**: Push to GitHub triggers automatic container updates
- **Declarative configuration**: Services defined in standard `compose.yaml`
- **Automatic reverse proxy**: Nginx configs generated from service definitions
- **Path-based routing**: Access services via `/service/` paths (no DNS configuration needed)

## Architecture
![Image for architecture](images/architecture.png)

## Installation

### Prerequisites

- Google Compute Engine instance (or any Linux server with SSH access)
- GitHub account
- No domain or DNS configuration needed (uses path-based routing)

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
# Expected output: Agent pid ...

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

### Step 4: Deploy and Test

#### 4.1. Trigger Initial Deployment

Manually trigger the GitHub Actions workflow to deploy your containers:

1. Go to your forked repository on GitHub
2. Click the **Actions** tab
3. Click on **"Deploy to Google Compute Engine"** workflow (left sidebar)
4. Click the **"Run workflow"** button (right side)
5. Select the `main` branch
6. Click **"Run workflow"** to start deployment

#### 4.2. Monitor Deployment

Watch the workflow execution:

1. The workflow run will appear in the list
2. Click on it to see detailed logs
3. Wait for all steps to complete (usually takes 30-60 seconds)

**What the workflow does:**
1. ✅ Generates nginx routes config from `compose.yaml`
2. ✅ Commits changes to `nginx/routes.conf` (if any)
3. ✅ SSHs into your GCE instance
4. ✅ Pulls latest code
5. ✅ Runs `docker compose up -d` (starts all containers)
6. ✅ Reloads nginx configuration

#### 4.3. Access Your Services

Once deployment completes, access your services using the **server's IP address**:

**Get your server IP:**
```bash
# On your GCE instance
curl ifconfig.me
```

**Access via browser:**
- `http://YOUR_IP/` → Nginx welcome page
- `http://YOUR_IP/hello/` → Hello service
- `http://YOUR_IP/whoami/` → Whoami service

**Test from command line:**
```bash
# Replace YOUR_IP with your server's IP address
curl http://YOUR_IP/
curl http://YOUR_IP/hello/
curl http://YOUR_IP/whoami/
```

### Step 5: Make Changes and Auto-Deploy

Now test the automatic deployment by adding a new service:

#### 5.1. Add a New Service

Edit `compose.yaml` on GitHub or locally and add a new service:

```yaml
services:
  # ... existing services ...

  hello2:
    image: crccheck/hello-world:latest
    x-monoserver-default-port: "8000"
```

#### 5.2. Commit and Push

```bash
git add compose.yaml
git commit -m "feat: add hello2 service"
git push origin main
```

#### 5.3. Watch Auto-Deployment

1. Go to **Actions** tab on GitHub
2. You'll see a new workflow run triggered automatically
3. Wait for it to complete
4. Access the new service: `http://YOUR_IP/hello2/`

**No manual intervention needed!** Every time you push changes to `compose.yaml`, the deployment happens automatically.


## How Automatic Updates Work

### When you change `compose.yaml`

1. **Trigger**: GitHub Actions detects changes to `compose.yaml`
2. **Generate**: `nginx/routes.conf` is automatically regenerated with path-based routes
3. **Commit**: Changes to `nginx/routes.conf` are committed back to the repo
4. **Deploy**: Server pulls changes and updates containers
5. **Reload**: Nginx reloads configuration **without downtime**

**Key point:** `docker compose up -d` only restarts containers that changed. Unchanged containers keep running.

### When `nginx/routes.conf` changes

The workflow automatically runs:
```bash
docker compose exec monoserver-nginx-main nginx -s reload
```

This tells nginx to:
- ✅ Read new configuration file
- ✅ Start new worker processes with new config
- ✅ Gracefully shut down old worker processes
- ✅ **Zero downtime** - no dropped connections

### When services are added/removed

**Adding a service:**
1. Add to `compose.yaml` with `x-monoserver-default-port` (optional)
2. Push to GitHub
3. GitHub Actions regenerates `routes.conf` with new `/service/` path
4. Server starts the new container
5. Nginx adds the new route automatically

**Removing a service:**
1. Remove from `compose.yaml`
2. Push to GitHub
3. GitHub Actions regenerates `routes.conf` without that service
4. Server stops the container
5. Nginx removes the route automatically

**No manual intervention needed!** Path-based routing requires no DNS configuration.

## Usage

### Adding a New Service

1. Edit `compose.yaml` and add your service:
   ```yaml
   services:
     monoserver-nginx-main:
       image: nginx:1.27.3
       # ... nginx config ...

     hello:
       image: crccheck/hello-world:latest
       x-monoserver-default-port: "8000"

     myapp:
       image: myapp:latest
       x-monoserver-default-port: "8080"  # The port your app listens on
   ```

   **Note:** `x-monoserver-default-port` tells nginx which port to proxy to. If omitted, nginx uses the port the client connected to.

2. Commit and push:
   ```bash
   git add compose.yaml
   git commit -m "feat: add myapp service"
   git push origin main
   ```

3. Access your service:
   ```bash
   # After GitHub Actions completes deployment
   curl http://YOUR_IP/myapp/
   ```

**That's it!** No need to manually create nginx configs. The generator creates path-based routes automatically:
- `compose.yaml` service `myapp` → nginx route `/myapp/` → backend `http://myapp:8080/`

## Project Structure

```
monoserver/
├── compose.yaml                    # Docker Compose service definitions
├── nginx/
│   ├── nginx.conf                 # Main Nginx configuration
│   └── routes.conf                # Auto-generated path-based routes
├── nginx-config-generator/         # TypeScript generator for routes.conf
│   ├── src/
│   │   ├── index.ts               # Main generator logic
│   │   └── test-runner.ts         # Test suite
│   └── test/                      # Test cases
├── scripts/
│   └── install-docker-rootless.sh # Docker installation script
└── .github/
    └── workflows/
        └── deploy.yml             # Deployment automation
```

## Local Development

For local development and testing without deploying to server:

```bash
# Generate nginx routes configuration
cd nginx-config-generator
npm install
npm run generate

# Start all services locally
cd ..
docker compose up

# Check service status
docker compose ps

# Test services locally
curl http://localhost/
curl http://localhost/hello/
curl http://localhost/whoami/

# View logs
docker compose logs -f

# Stop services
docker compose down
```
