#!/bin/bash
set -e

# Docker Rootless Installation Script for Ubuntu/Debian
# This script automates the installation of Docker in rootless mode
# Designed for Google Compute Engine Ubuntu instances

echo "========================================="
echo "Docker Rootless Installation Script"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run with sudo."
    log_error "Usage: sudo ./install-docker-rootless.sh"
    exit 1
fi

# Get the actual user who ran sudo
ACTUAL_USER="${SUDO_USER:-$USER}"
if [ "$ACTUAL_USER" = "root" ]; then
    log_error "Cannot determine the actual user. Please run with sudo as a regular user."
    exit 1
fi

log_info "Running as root, will configure Docker for user: $ACTUAL_USER"

# Check OS
if [ ! -f /etc/os-release ]; then
    log_error "Cannot detect OS. This script is designed for Ubuntu/Debian."
    exit 1
fi

source /etc/os-release
if [[ ! "$ID" =~ ^(ubuntu|debian)$ ]]; then
    log_warn "This script is designed for Ubuntu/Debian. Your OS: $ID"
    log_warn "Continuing anyway, but some steps may fail."
fi

log_info "OS detected: $PRETTY_NAME"

# Step 1: Install prerequisites
log_info "Installing prerequisites..."

apt-get update
apt-get install -y uidmap

log_info "Prerequisites installed successfully."

# Step 2: Check subordinate UID/GID configuration
log_info "Checking subordinate UID/GID configuration..."

USERNAME="$ACTUAL_USER"
USERID=$(id -u "$ACTUAL_USER")

if ! grep -q "^${USERNAME}:" /etc/subuid; then
    log_warn "/etc/subuid does not contain entry for $USERNAME"
    log_info "Adding subordinate UID range..."
    echo "${USERNAME}:100000:65536" | tee -a /etc/subuid > /dev/null
fi

if ! grep -q "^${USERNAME}:" /etc/subgid; then
    log_warn "/etc/subgid does not contain entry for $USERNAME"
    log_info "Adding subordinate GID range..."
    echo "${USERNAME}:100000:65536" | tee -a /etc/subgid > /dev/null
fi

log_info "Subordinate UID/GID configuration verified."
log_info "  UID range: $(grep "^${USERNAME}:" /etc/subuid)"
log_info "  GID range: $(grep "^${USERNAME}:" /etc/subgid)"

# Step 3: Install Docker Engine (if not already installed)
if ! command -v docker &> /dev/null; then
    log_info "Docker is not installed. Installing Docker Engine..."

    # Add Docker's official GPG key
    apt-get install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/${ID}/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add the repository to Apt sources
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update

    # Install Docker packages including rootless extras
    apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin \
        docker-ce-rootless-extras

    log_info "Docker Engine installed successfully."
else
    log_info "Docker is already installed."

    # Check if rootless extras are installed
    if ! command -v dockerd-rootless-setuptool.sh &> /dev/null; then
        log_info "Installing docker-ce-rootless-extras..."
        apt-get install -y docker-ce-rootless-extras
    fi
fi

# Step 4: Disable system-wide Docker service (optional but recommended)
if systemctl is-active --quiet docker.service; then
    log_warn "System-wide Docker service is running."
    log_info "Disabling system-wide Docker service..."
    systemctl disable --now docker.service docker.socket
    rm -f /var/run/docker.sock
    log_info "System-wide Docker service disabled."
fi

# Step 5: Install rootless Docker
log_info "Setting up rootless Docker as user $USERNAME..."

# Run rootless setup as the actual user
su - "$USERNAME" -c "dockerd-rootless-setuptool.sh check" || {
    log_error "Prerequisites check failed. Please review the errors above."
    exit 1
}

su - "$USERNAME" -c "dockerd-rootless-setuptool.sh install"

log_info "Rootless Docker installation completed."

# Step 5.5: Configure CAP_NET_BIND_SERVICE for privileged ports
log_info "Configuring CAP_NET_BIND_SERVICE for privileged port binding..."

# What is CAP_NET_BIND_SERVICE?
# - A Linux capability that allows binding to privileged ports (< 1024)
# - Normally only root can use ports like 80, 443, but with this capability,
#   non-root processes can also bind to privileged ports
#
# Why is it needed for Rootless Docker?
# - Rootless Docker runs with regular user permissions
# - For containers like nginx to use ports 80, 443, rootlesskit needs this permission
# - Without it, you'll get "bind: permission denied" errors
#
# Security considerations:
# - Only grants CAP_NET_BIND_SERVICE, no other root privileges
# - Set only on the rootlesskit binary, so scope is limited

# Find rootlesskit binary
ROOTLESSKIT_PATH=$(which rootlesskit 2>/dev/null)

if [ -z "$ROOTLESSKIT_PATH" ]; then
    # Check default locations
    for path in /usr/bin/rootlesskit /usr/local/bin/rootlesskit "$USER_HOME/bin/rootlesskit"; do
        if [ -f "$path" ]; then
            ROOTLESSKIT_PATH="$path"
            break
        fi
    done
fi

if [ -n "$ROOTLESSKIT_PATH" ]; then
    log_info "Found rootlesskit at: $ROOTLESSKIT_PATH"

    # Set CAP_NET_BIND_SERVICE capability using setcap
    # Meaning of cap_net_bind_service=ep:
    #   - cap_net_bind_service: permission to bind to privileged ports
    #   - e (Effective): activated immediately when process runs
    #   - p (Permitted): process can use this permission
    setcap cap_net_bind_service=ep "$ROOTLESSKIT_PATH"

    # Verify configuration
    log_info "CAP_NET_BIND_SERVICE configured successfully"
    getcap "$ROOTLESSKIT_PATH"

    log_info "Now rootless Docker can bind to privileged ports (< 1024) like 80, 443"
else
    log_warn "rootlesskit binary not found. Privileged port binding may not work."
    log_warn "You can manually set it later with: sudo setcap cap_net_bind_service=ep /path/to/rootlesskit"
fi

# Step 6: Configure environment variables
log_info "Configuring environment variables..."

USER_HOME=$(eval echo ~"$USERNAME")
SHELL_RC="$USER_HOME/.bashrc"

# Check if already configured
if ! grep -q "DOCKER_HOST=unix:///run/user/${USERID}/docker.sock" "$SHELL_RC"; then
    cat >> "$SHELL_RC" << 'EOF'

# Docker rootless mode configuration
export PATH=/usr/bin:$PATH
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
EOF
    log_info "Environment variables added to $SHELL_RC"
else
    log_info "Environment variables already configured in $SHELL_RC"
fi

# Step 7: Enable systemd service
log_info "Enabling systemd service..."

# Enable lingering for the user (allows services to run without login)
loginctl enable-linger "$USERNAME"

# Start the service as the actual user
su - "$USERNAME" -c "systemctl --user enable docker.service"
su - "$USERNAME" -c "systemctl --user start docker.service"

log_info "Systemd service enabled and started."

# Step 8: Verification
log_info "Verifying installation..."

sleep 2  # Give Docker a moment to start

if su - "$USERNAME" -c "docker info > /dev/null 2>&1"; then
    log_info "${GREEN}Docker is running successfully!${NC}"

    echo ""
    echo "Docker Info:"
    su - "$USERNAME" -c "docker info | grep -E '(Server Version|Security Options|Rootless)'" || true

    echo ""
    log_info "Testing with hello-world container..."
    su - "$USERNAME" -c "docker run --rm hello-world"

    echo ""
    log_info "${GREEN}=========================================${NC}"
    log_info "${GREEN}Installation completed successfully!${NC}"
    log_info "${GREEN}=========================================${NC}"
    echo ""
    log_info "Next steps:"
    echo "  1. Log in as $USERNAME"
    echo "  2. Verify: docker info"
    echo "  3. Test: docker run --rm hello-world"
    echo ""
    log_info "Note: Your Docker daemon is running as user: $USERNAME"
    log_info "Docker socket: unix:///run/user/${USERID}/docker.sock"
else
    log_error "Docker verification failed. Please check the logs above."
    exit 1
fi
