# Cloudflared Overlay

Cloudflare Tunnel for securely exposing local services to the internet — no port forwarding or firewall configuration required.

## Features

- **cloudflared** - Cloudflare's tunneling daemon
- **No account required** - Anonymous tunnels work immediately
- **Free** - Generous free tier with no connection limits
- **Named tunnels** - Persistent URLs with a Cloudflare account (optional)
- **HTTPS by default** - All tunnels use TLS automatically

## How It Works

`cloudflared` creates an outbound-only connection from your dev container to Cloudflare's edge network. Incoming requests are routed through Cloudflare to your local service — no inbound firewall rules needed.

## Quick Start

```bash
# Expose your local web server (no account required)
cloudflared tunnel --url http://localhost:3000

# Output:
# +--------------------------------------------------------------------------------------------+
# |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
# |  https://random-words-here.trycloudflare.com                                              |
# +--------------------------------------------------------------------------------------------+
```

## Common Commands

### Anonymous Tunnel (No Account)

```bash
# HTTP service
cloudflared tunnel --url http://localhost:3000

# HTTPS service (pass through TLS)
cloudflared tunnel --url https://localhost:8443

# Custom local port
cloudflared tunnel --url http://localhost:8080
```

### Named Tunnel (Requires Cloudflare Account)

```bash
# 1. Log in to Cloudflare
cloudflared login

# 2. Create a named tunnel
cloudflared tunnel create my-dev-tunnel

# 3. Route traffic to a domain you own
cloudflared tunnel route dns my-dev-tunnel dev.yourdomain.com

# 4. Run the tunnel
cloudflared tunnel run my-dev-tunnel

# Run with a specific URL
cloudflared tunnel --url http://localhost:3000 run my-dev-tunnel
```

### Configuration File

Create `~/.cloudflared/config.yml` for persistent configuration:

```yaml
tunnel: my-dev-tunnel
credentials-file: /home/user/.cloudflared/<tunnel-id>.json

ingress:
    - hostname: dev.yourdomain.com
      service: http://localhost:3000
    - hostname: api.yourdomain.com
      service: http://localhost:8080
    - service: http_status:404
```

```bash
# Run using config file
cloudflared tunnel run
```

### Status and Diagnostics

```bash
# Check version
cloudflared --version

# List your tunnels (requires login)
cloudflared tunnel list

# Get tunnel info
cloudflared tunnel info my-dev-tunnel
```

## Use Cases

- **Webhook testing** - Receive webhooks from GitHub, Stripe, Twilio, etc.
- **Mobile device testing** - Test your app on real devices without complex setup
- **Demo sharing** - Share work-in-progress with clients or colleagues
- **OAuth callbacks** - Test OAuth flows that require a public redirect URI
- **Long-running tunnels** - More stable than temporary ngrok tunnels

## Webhook Testing Examples

### GitHub Webhooks

```bash
# 1. Start tunnel
cloudflared tunnel --url http://localhost:3000

# 2. Copy the *.trycloudflare.com URL
# 3. Add webhook in GitHub: Settings → Webhooks → Add webhook
#    Payload URL: https://random-words.trycloudflare.com/webhook
```

### Stripe Webhooks

```bash
# Start tunnel
cloudflared tunnel --url http://localhost:4242

# Configure Stripe webhook:
# Dashboard → Developers → Webhooks → Add endpoint
# URL: https://random-words.trycloudflare.com/stripe/webhook
```

## Benefits vs ngrok

| Feature                    | Cloudflared (this overlay) | ngrok                 |
| -------------------------- | -------------------------- | --------------------- |
| **Account required**       | No (anonymous tunnels)     | Yes                   |
| **Free tier limits**       | No limits (anonymous)      | 40 connections/minute |
| **Persistent URL (free)**  | No (random per session)    | No                    |
| **Named tunnels**          | Yes (with account)         | Yes (paid)            |
| **Traffic inspector UI**   | No                         | Yes (port 4040)       |
| **Cloudflare integration** | ✅ Native                  | No                    |
| **Connection stability**   | Very stable                | Good                  |

## Security Considerations

⚠️ When exposing local services to the internet:

- Cloudflared exposes your local service to public internet traffic
- Use HTTPS endpoints when possible
- Do not expose services with sensitive data without authentication
- Anonymous tunnels are not persistent — URL changes each session

## Troubleshooting

### Tunnel not starting

```bash
# Check cloudflared version
cloudflared --version

# Run with verbose logging
cloudflared tunnel --url http://localhost:3000 --loglevel debug
```

### Connection refused

Ensure your local service is running and listening on the specified port:

```bash
# Check if service is listening
curl http://localhost:3000
```

### Named tunnel errors

```bash
# Re-authenticate
cloudflared login

# List tunnels to verify it exists
cloudflared tunnel list
```

## References

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [cloudflared GitHub](https://github.com/cloudflare/cloudflared)
- [Cloudflare Free Tunnel Guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)

**Related Overlays:**

- `ngrok` - Alternative tunneling tool (conflicts with this overlay)
