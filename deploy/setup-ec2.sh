#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# OutboundAI — One-Shot AWS EC2 Setup Script
# Run as: bash setup-ec2.sh
# Tested on: Ubuntu 22.04 LTS (t3.small or larger)
# ═══════════════════════════════════════════════════════════════════
set -e

echo "🚀 OutboundAI EC2 Setup"
echo "========================"

# ── 1. System update ──────────────────────────────────────────────
echo "📦 Updating system..."
sudo apt-get update -q
sudo apt-get upgrade -y -q

# ── 2. Install Docker ─────────────────────────────────────────────
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# ── 3. Install docker-compose plugin ──────────────────────────────
echo "🔧 Installing docker compose..."
sudo apt-get install -y docker-compose-plugin

# ── 4. Clone / copy app (assumes you're in /home/ubuntu/outboundai) ──
APP_DIR="/home/ubuntu/outboundai"
mkdir -p "$APP_DIR"
echo "📁 App directory: $APP_DIR"

# ── 5. Create .env from template if it doesn't exist ─────────────
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
        cp "$APP_DIR/.env.example" "$APP_DIR/.env"
        echo "⚠️  Created .env from template. EDIT IT BEFORE STARTING:"
        echo "   nano $APP_DIR/.env"
    fi
fi

# ── 6. Create systemd service for auto-start ──────────────────────
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/outboundai.service > /dev/null <<EOF
[Unit]
Description=OutboundAI Voice Calling Platform
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose up
ExecStop=/usr/bin/docker compose down
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable outboundai

# ── 7. Configure UFW firewall ─────────────────────────────────────
echo "🔒 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 8000/tcp
sudo ufw --force enable

# ── 8. Done ───────────────────────────────────────────────────────
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd $APP_DIR"
echo "  2. nano .env          # Fill in all API keys"
echo "  3. sudo systemctl start outboundai"
echo "  4. Open http://$(curl -s ifconfig.me):8000 in your browser"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status outboundai    # Check status"
echo "  sudo journalctl -u outboundai -f    # Live logs"
echo "  docker compose logs -f              # Container logs"
echo "  sudo systemctl restart outboundai   # Restart"
