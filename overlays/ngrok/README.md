# ngrok Overlay

Secure tunneling to localhost for webhook testing and external access.

## What's Included

- **ngrok** - Secure tunneling service
- **Sample configuration** - Pre-configured ngrok.yml
- **Helper scripts** - Quick access scripts
- **Web inspector** - Traffic inspection UI

## What is ngrok?

ngrok creates secure tunnels from public internet to localhost, allowing:

- **Webhook testing** - Test webhooks locally (GitHub, Stripe, Twilio, etc.)
- **Remote access** - Access your local dev server from anywhere
- **Mobile testing** - Test on real devices
- **API demos** - Share work-in-progress with clients
- **SSH access** - Secure remote access to container

## Quick Start

### 1. Authenticate (Required)

```bash
# Sign up at https://dashboard.ngrok.com/signup
# Get token from https://dashboard.ngrok.com/get-started/your-authtoken

ngrok config add-authtoken YOUR_AUTHTOKEN
```

### 2. Start a Tunnel

```bash
# Expose local web server on port 3000
ngrok http 3000
```

Output:

```
Session Status                online
Account                       your@email.com
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abc123.ngrok.io -> localhost:3000
Web Interface                 http://127.0.0.1:4040

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### 3. Access Your App

- Public URL: `https://abc123.ngrok.io`
- Web Inspector: `http://localhost:4040`

## Common Usage

### HTTP Tunnel

```bash
# Basic HTTP tunnel
ngrok http 3000

# Custom subdomain (requires paid plan)
ngrok http 3000 --subdomain myapp

# Custom domain (requires paid plan)
ngrok http 3000 --hostname myapp.example.com

# Basic authentication
ngrok http 3000 --basic-auth "user:password"

# Custom region
ngrok http 3000 --region eu
```

### TCP Tunnel

```bash
# PostgreSQL
ngrok tcp 5432

# MySQL
ngrok tcp 3306

# SSH
ngrok tcp 22

# Custom port binding
ngrok tcp 5432 --remote-addr 1.tcp.ngrok.io:12345
```

### TLS Tunnel

```bash
# TLS termination at ngrok
ngrok tls 443

# With custom domain
ngrok tls 443 --hostname secure.example.com
```

### Configuration File

```bash
# Start named tunnel from ngrok.yml
ngrok start web

# Start multiple tunnels
ngrok start web api

# Start all tunnels
ngrok start --all
```

## Configuration (ngrok.yml)

Located at `~/.config/ngrok/ngrok.yml`:

### Basic Configuration

```yaml
version: '2'
authtoken: YOUR_AUTHTOKEN
region: us
console_ui: true
log_level: info
```

### Tunnel Definitions

```yaml
tunnels:
    web:
        proto: http
        addr: 3000
        inspect: true

    api:
        proto: http
        addr: 8080
        subdomain: myapi # Paid feature
        auth: 'user:pass' # Basic auth

    database:
        proto: tcp
        addr: 5432
```

### Advanced Options

```yaml
tunnels:
    web:
        proto: http
        addr: 3000

        # Request/response modification
        request_header:
            add:
                - 'X-Custom-Header: value'
            remove:
                - 'X-Unwanted-Header'

        response_header:
            add:
                - 'X-Response-Header: value'

        # IP restrictions (paid feature)
        ip_restriction:
            allow_cidrs:
                - '1.2.3.4/32'
                - '10.0.0.0/8'

        # Circuit breaker (paid feature)
        circuit_breaker: 0.5 # Open if >50% errors

        # Compression
        compression: true

        # Mutual TLS (paid feature)
        mutual_tls_cas: /path/to/ca.crt
```

## Web Interface

Access at `http://localhost:4040` while tunnel is active.

Features:

- **Request history** - All HTTP requests/responses
- **Request replay** - Replay requests for testing
- **Metrics** - Connection stats, latency
- **Status** - Tunnel information

### Replay Requests

```bash
# Via web UI - click "Replay" on any request

# Via API
curl -X POST http://localhost:4040/api/requests/http/[request-id]/replay
```

## Webhook Testing

### GitHub Webhooks

1. Start tunnel:

    ```bash
    ngrok http 3000
    ```

2. Configure webhook in GitHub:
    - Go to repository Settings → Webhooks
    - URL: `https://abc123.ngrok.io/webhook`
    - Events: Push, Pull Request, etc.

3. Test locally:
    ```bash
    # Your webhook handler runs on localhost:3000
    # GitHub POSTs to https://abc123.ngrok.io/webhook
    ```

### Stripe Webhooks

```bash
# Start tunnel
ngrok http 4242

# Configure in Stripe Dashboard
# URL: https://abc123.ngrok.io/stripe-webhook

# Test with Stripe CLI
stripe listen --forward-to localhost:4242/stripe-webhook
```

### Twilio Webhooks

```bash
# Start tunnel
ngrok http 3000

# Configure in Twilio Console
# Voice URL: https://abc123.ngrok.io/voice
# SMS URL: https://abc123.ngrok.io/sms
```

## Mobile Testing

```bash
# Start tunnel
ngrok http 3000

# Access from mobile device
# URL: https://abc123.ngrok.io
```

Benefits:

- Test on real devices
- Test over cellular networks
- No need for complex network setup
- Works with any framework (React, Vue, Angular, etc.)

## SSH Access

```bash
# Start TCP tunnel
ngrok tcp 22

# Output shows:
# Forwarding: tcp://0.tcp.ngrok.io:12345 -> localhost:22

# Connect from remote machine
ssh -p 12345 user@0.tcp.ngrok.io
```

## Database Access

```bash
# PostgreSQL tunnel
ngrok tcp 5432

# Connect from remote machine
psql -h 0.tcp.ngrok.io -p [NGROK_PORT] -U user dbname

# MySQL tunnel
ngrok tcp 3306

# Connect from remote machine
mysql -h 0.tcp.ngrok.io -P [NGROK_PORT] -u user -p
```

## API Usage

ngrok provides a local API for automation:

```bash
# List tunnels
curl http://localhost:4040/api/tunnels

# Get tunnel details
curl http://localhost:4040/api/tunnels/web

# Request history
curl http://localhost:4040/api/requests/http

# Metrics
curl http://localhost:4040/api/metrics
```

## Advanced Features

### Reserved Domains (Paid)

```bash
# Use reserved domain
ngrok http 3000 --hostname myapp.ngrok.io

# Configure in ngrok.yml
tunnels:
  web:
    proto: http
    addr: 3000
    hostname: myapp.ngrok.io
```

### IP Whitelisting (Paid)

```yaml
tunnels:
    api:
        proto: http
        addr: 8080
        ip_restriction:
            allow_cidrs:
                - '1.2.3.4/32' # Single IP
                - '10.0.0.0/8' # Private network
```

### OAuth Protection (Paid)

```yaml
tunnels:
    web:
        proto: http
        addr: 3000
        oauth:
            provider: google
            allow_emails:
                - user@example.com
```

### Mutual TLS (Paid)

```yaml
tunnels:
    secure:
        proto: tls
        addr: 443
        mutual_tls_cas: /path/to/ca-certificates.crt
```

## Automation

### Start on Container Launch

Add to `.bashrc` or startup script:

```bash
# Auto-start ngrok on container start
if [ -z "$NGROK_RUNNING" ]; then
    export NGROK_RUNNING=1
    ngrok http 3000 > /tmp/ngrok.log 2>&1 &
fi
```

### Get Public URL Programmatically

```bash
#!/bin/bash
# get-ngrok-url.sh

curl -s http://localhost:4040/api/tunnels | \
  jq -r '.tunnels[0].public_url'
```

### Integration with CI/CD

```yaml
# .github/workflows/test.yml
- name: Start ngrok
  run: |
      ngrok http 3000 &
      sleep 5
      PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
      echo "NGROK_URL=$PUBLIC_URL" >> $GITHUB_ENV
```

## Regions

Available regions:

- `us` - United States (default)
- `eu` - Europe
- `ap` - Asia/Pacific
- `au` - Australia
- `sa` - South America
- `jp` - Japan
- `in` - India

```bash
ngrok http 3000 --region eu
```

## Security Best Practices

1. **Keep authtoken secret** - Never commit to version control
2. **Use authentication** - Add `--basic-auth` for sensitive endpoints
3. **IP restrictions** - Whitelist known IPs (paid feature)
4. **Monitor usage** - Check dashboard for unexpected traffic
5. **Rotate tokens** - Regenerate tokens periodically
6. **Use HTTPS** - Free tunnels use HTTPS by default
7. **Limit exposure** - Close tunnels when not in use
8. **Inspect traffic** - Review requests in web interface

## Free vs Paid Plans

### Free Plan

- 1 online ngrok agent
- 4 tunnels per agent
- 40 connections/minute
- Random URLs
- HTTP/TCP tunnels

### Paid Plans

- Reserved domains
- Custom subdomains
- IP whitelisting
- OAuth protection
- More tunnels
- Higher limits
- Priority support

## Troubleshooting

### Authentication Failed

```bash
# Re-add authtoken
ngrok config add-authtoken YOUR_TOKEN

# Verify in config
cat ~/.config/ngrok/ngrok.yml | grep authtoken
```

### Tunnel Connection Failed

Check logs:

```bash
tail -f /tmp/ngrok.log
```

### Port Already in Use

```bash
# Check what's using the port
lsof -i :4040

# Use different web interface port
ngrok http 3000 --web-addr localhost:4041
```

### Too Many Connections

Free plan limits to 40 connections/minute. Upgrade or wait.

### Domain Not Found

Ensure you're using the correct public URL from ngrok output.

## Alternatives

- **cloudflared** - Cloudflare Tunnel (free, unlimited)
- **localhost.run** - SSH-based tunneling (free, no signup)
- **serveo.net** - SSH-based tunneling (free)
- **Tailscale** - Private network tunneling (free for personal use)

## Additional Resources

- [ngrok Documentation](https://ngrok.com/docs)
- [ngrok Dashboard](https://dashboard.ngrok.com)
- [ngrok Pricing](https://ngrok.com/pricing)
- [ngrok API Reference](https://ngrok.com/docs/api)
- [Webhook Testing Guide](https://ngrok.com/docs/guides/webhook-testing)
