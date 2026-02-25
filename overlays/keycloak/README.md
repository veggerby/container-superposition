# Keycloak Overlay

Open-source identity and access management for developing apps with OAuth2/OIDC authentication.

## Features

- **Keycloak 26** - Latest stable version with OIDC/OAuth2 support
- **Admin console** - Web UI for managing realms, clients, and users (port 8180)
- **OIDC/OAuth2** - Full OpenID Connect and OAuth 2.0 support
- **PostgreSQL backend** - Uses the PostgreSQL overlay as database
- **Docker Compose service** - Runs as separate container
- **Development mode** - Pre-configured for local development (no TLS required)

## How It Works

This overlay adds Keycloak as a Docker Compose service alongside your development container. It requires the `postgres` overlay to provide the database backend.

**Architecture:**

```
Development Container
  └─ Your application code
  └─ Connects to keycloak:8180 for auth

Keycloak Container (port 8180)
  └─ Admin console
  └─ OIDC/OAuth2 endpoints
  └─ Connects to postgres:5432

PostgreSQL Container (port 5432)
  └─ Keycloak database storage
```

The Keycloak service is accessible from the dev container using the hostname `keycloak`.

## Configuration

### Environment Variables

The overlay includes a `.env.example` file. Copy it to `.env` and customize:

```bash
cd .devcontainer
cp .env.example .env
```

**Default values (.env.example):**

```bash
# Keycloak Configuration
KEYCLOAK_VERSION=26.0
KEYCLOAK_PORT=8180
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

⚠️ **Security Note:** Default credentials (`admin`/`admin`) are for development only. Never use these in production.

### PostgreSQL Integration

Keycloak uses the PostgreSQL overlay's environment variables:

```bash
POSTGRES_DB=devdb       # Database name
POSTGRES_USER=postgres  # Database user
POSTGRES_PASSWORD=postgres  # Database password
```

These are configured in the `postgres` overlay's `.env.example`.

## Common Commands

### Access Admin Console

```bash
# Open in browser
open http://localhost:8180

# Admin credentials
# Username: admin (or KEYCLOAK_ADMIN value)
# Password: admin (or KEYCLOAK_ADMIN_PASSWORD value)
```

### Realm Management

```bash
# List realms via Admin REST API
curl -s \
  -u admin:admin \
  http://localhost:8180/admin/realms | jq '.[].realm'

# Create a new realm
curl -s -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  http://localhost:8180/admin/realms \
  -d '{"realm": "myrealm", "enabled": true}'
```

### OIDC Discovery

```bash
# Discover OIDC endpoints for the master realm
curl -s http://localhost:8180/realms/master/.well-known/openid-configuration | jq .

# Get discovery for a custom realm
curl -s http://localhost:8180/realms/myrealm/.well-known/openid-configuration | jq .
```

### Client Credentials Flow

```bash
# Get access token using client credentials
curl -s -X POST \
  http://localhost:8180/realms/master/protocol/openid-connect/token \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" | jq .access_token
```

### Token Introspection

```bash
TOKEN=$(curl -s -X POST \
  http://localhost:8180/realms/master/protocol/openid-connect/token \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" | jq -r .access_token)

# Decode token (base64)
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

## Application Integration

### Node.js (using openid-client)

```javascript
import { Issuer } from 'openid-client';

const keycloakIssuer = await Issuer.discover('http://keycloak:8180/realms/myrealm');

const client = new keycloakIssuer.Client({
    client_id: 'my-app',
    client_secret: 'my-secret',
    redirect_uris: ['http://localhost:3000/callback'],
    response_types: ['code'],
});
```

### Python (using requests-oauthlib)

```python
from requests_oauthlib import OAuth2Session

oauth = OAuth2Session(
    client_id="my-app",
    redirect_uri="http://localhost:5000/callback",
    scope=["openid", "profile", "email"]
)

authorization_url, state = oauth.authorization_url(
    "http://keycloak:8180/realms/myrealm/protocol/openid-connect/auth"
)
```

### .NET (using Microsoft.AspNetCore.Authentication.OpenIdConnect)

```csharp
builder.Services.AddAuthentication(options => {
    options.DefaultScheme = "Cookies";
    options.DefaultChallengeScheme = "oidc";
})
.AddCookie("Cookies")
.AddOpenIdConnect("oidc", options => {
    options.Authority = "http://keycloak:8180/realms/myrealm";
    options.ClientId = "my-app";
    options.ClientSecret = "my-secret";
    options.ResponseType = "code";
    options.RequireHttpsMetadata = false; // Development only
});
```

## Use Cases

- **OAuth2/OIDC integration testing** - Test authentication flows end-to-end
- **Multi-tenant applications** - Create separate realms per tenant
- **SSO development** - Single Sign-On across multiple local services
- **Identity federation** - Test social login, LDAP, SAML integration
- **Role-based access control** - Define and test permissions locally

## Troubleshooting

### Keycloak takes too long to start

Keycloak can take 60–90 seconds on first startup (database schema creation). Wait for the health check to pass:

```bash
docker-compose logs -f keycloak
# Look for: "Keycloak X.X started"
```

### Database connection errors

Ensure PostgreSQL is running and healthy before Keycloak starts:

```bash
docker-compose ps postgres
# Should show "healthy"
```

### Cannot connect from application

Use `keycloak` (not `localhost`) as the hostname when connecting from inside the container:

```bash
# Correct (from inside dev container)
http://keycloak:8180/realms/master

# Correct (from host machine browser)
http://localhost:8180/realms/master
```

## References

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)
- [OpenID Connect Specification](https://openid.net/connect/)
- [Keycloak Docker Image](https://quay.io/repository/keycloak/keycloak)

**Related Overlays:**

- `postgres` - Required database backend
- `nodejs` - Node.js application development
- `python` - Python application development
- `dotnet` - .NET application development
