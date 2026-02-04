#!/bin/bash
# ngrok setup script

set -e

echo "🌐 Setting up ngrok..."

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    NGROK_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    NGROK_ARCH="arm64"
else
    echo "⚠️  Unsupported architecture: $ARCH, defaulting to amd64"
    NGROK_ARCH="amd64"
fi

# Download and install ngrok
echo "📦 Downloading ngrok for ${NGROK_ARCH}..."
curl -sSL "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-${NGROK_ARCH}.tgz" \
    -o /tmp/ngrok.tgz

tar -xzf /tmp/ngrok.tgz -C /tmp
sudo mv /tmp/ngrok /usr/local/bin/
sudo chmod +x /usr/local/bin/ngrok
rm /tmp/ngrok.tgz

# Verify installation
if command -v ngrok &> /dev/null; then
    echo "✓ ngrok installed: $(ngrok version)"
else
    echo "✗ ngrok installation failed"
    exit 1
fi

# Create sample ngrok configuration
mkdir -p /home/vscode/.config/ngrok
if [ ! -f /home/vscode/.config/ngrok/ngrok.yml ]; then
    cat > /home/vscode/.config/ngrok/ngrok.yml << 'EOF'
# ngrok configuration file
# Visit https://dashboard.ngrok.com/get-started/your-authtoken to get your authtoken
# Then run: ngrok config add-authtoken YOUR_TOKEN

version: "2"

# Uncomment and set your authtoken
# authtoken: YOUR_AUTHTOKEN_HERE

# Region (us, eu, ap, au, sa, jp, in)
region: us

# Console UI settings
console_ui: true
console_ui_color: transparent

# Log settings
log_level: info
log_format: json
log: /tmp/ngrok.log

# Tunnel definitions
tunnels:
  # HTTP tunnel example
  web:
    proto: http
    addr: 3000
    # Optional: custom subdomain (requires paid plan)
    # subdomain: myapp
    # Optional: custom domain (requires paid plan)
    # hostname: myapp.example.com
    # Optional: basic auth
    # auth: "user:password"
    # Optional: inspect traffic
    inspect: true

  # HTTPS tunnel example
  api:
    proto: http
    addr: 8080
    inspect: true

  # TCP tunnel example (databases, SSH, etc.)
  database:
    proto: tcp
    addr: 5432

  # TLS tunnel example
  secure:
    proto: tls
    addr: 443

# Webhook endpoints for event notifications (requires paid plan)
# webhooks:
#   - name: "webhook-handler"
#     url: "https://example.com/ngrok-events"
#     events:
#       - "tunnel_started"
#       - "tunnel_stopped"
EOF
    echo "✓ Sample ngrok.yml created at ~/.config/ngrok/ngrok.yml"
fi

# Create sample helper scripts
mkdir -p /home/vscode/.local/bin 2>/dev/null || true

cat > /home/vscode/.local/bin/ngrok-web << 'EOF'
#!/bin/bash
# Quick script to expose local web server

PORT=${1:-3000}
echo "🌐 Exposing localhost:${PORT} via ngrok..."
ngrok http ${PORT}
EOF

chmod +x /home/vscode/.local/bin/ngrok-web 2>/dev/null || true

echo "✓ ngrok setup complete"
echo ""
echo "⚠️  IMPORTANT: Authenticate ngrok before use"
echo "   1. Sign up at https://dashboard.ngrok.com/signup"
echo "   2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken"
echo "   3. Run: ngrok config add-authtoken YOUR_TOKEN"
echo ""
echo "💡 Quick start:"
echo "   ngrok http 3000              # Expose localhost:3000"
echo "   ngrok http 8080 --subdomain myapp  # Custom subdomain (paid)"
echo "   ngrok tcp 22                 # Expose SSH"
echo "   ngrok start web              # Start named tunnel from config"
echo ""
echo "📚 Configuration: ~/.config/ngrok/ngrok.yml"
echo "🔍 Web interface: http://localhost:4040"
