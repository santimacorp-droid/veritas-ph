#!/usr/bin/env bash
#
# Veritas EC2 Automated Provisioning Script
# Designed for Ubuntu 24.04 LTS (x86_64 or ARM64)
#

set -eo pipefail

# Ensure script is run with root permissions
if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run with sudo privileges." >&2
  exit 1
fi

echo "=================================================="
echo " Veritas: Beginning EC2 Automated Provisioning"
echo "=================================================="

echo "--> Step 1: Updating system packages..."
apt-get update -y

echo "--> Step 2: Installing system dependencies..."
apt-get install -y python3-pip python3-venv nginx git curl make

echo "--> Step 3: Setting up repository paths..."
REPO_DIR="/home/ubuntu/veritas-ph"

if [ ! -d "$REPO_DIR" ]; then
  echo "Error: Veritas repository not found at $REPO_DIR" >&2
  echo "Please clone the repository to /home/ubuntu/veritas-ph before running this script." >&2
  exit 1
fi

cd "$REPO_DIR"

echo "--> Step 4: Creating python virtual environment..."
python3 -m venv .venv_linux
chown -R ubuntu:ubuntu .venv_linux

echo "--> Step 5: Installing Python dependencies..."
sudo -u ubuntu .venv_linux/bin/pip install --upgrade pip
sudo -u ubuntu .venv_linux/bin/pip install -r requirements.txt

echo "--> Step 6: Installing PocketBase binary..."
# Run make pb-install as ubuntu user
sudo -u ubuntu make pb-install

echo "--> Step 7: Configuring systemd services..."
cp deploy/ec2/veritas-api.service /etc/systemd/system/
cp deploy/ec2/veritas-worker.service /etc/systemd/system/
cp deploy/ec2/veritas-pocketbase.service /etc/systemd/system/

# Reload systemd and enable services to start on boot
systemctl daemon-reload
systemctl enable veritas-pocketbase.service
systemctl enable veritas-api.service
systemctl enable veritas-worker.service

echo "--> Step 8: Configuring Nginx Reverse Proxy..."
cp deploy/ec2/nginx.conf /etc/nginx/sites-available/veritas
ln -sf /etc/nginx/sites-available/veritas /etc/nginx/sites-enabled/

# Remove default nginx site config to prevent conflict
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl restart nginx

echo "=================================================="
echo " Veritas: EC2 Provisioning Finished Successfully!"
echo "=================================================="
echo "To complete deployment, please do the following:"
echo "1. Create your environment configuration file:"
echo "   File path: /home/ubuntu/veritas-ph/apps/api/.env"
echo "   Add these variables:"
echo "     DATABASE_URL=postgresql://your-supabase-db-url"
echo "     DEEPSEEK_API_KEY=your-deepseek-api-key"
echo ""
echo "2. Start the Veritas services:"
echo "   sudo systemctl start veritas-pocketbase"
echo "   sudo systemctl start veritas-api"
echo "   sudo systemctl start veritas-worker"
echo ""
echo "3. Check service statuses to verify health:"
echo "   sudo systemctl status veritas-api"
echo "   sudo systemctl status veritas-worker"
echo "=================================================="
