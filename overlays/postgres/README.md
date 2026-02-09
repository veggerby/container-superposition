# PostgreSQL Overlay

PostgreSQL 16 database server for development and testing.

## Features

- **PostgreSQL 16** - Latest major version with modern SQL features
- **Pre-configured** - Ready to use with sensible defaults
- **Docker Compose service** - Runs as separate container
- **Persistent storage** - Data survives container restarts
- **pgAdmin support** - Optional web-based administration
- **Environment configuration** - Customizable via `.env` file

## How It Works

This overlay adds a PostgreSQL 16 database server as a separate Docker Compose service. The database runs in its own container and is accessible from your development container via the hostname `postgres`.

**Architecture:**

```mermaid
graph TD
    A[Development Container<br/>Your application code<br/>psql client<br/>Connects to postgres:5432] -->|Docker network devnet| B[PostgreSQL Container<br/>PostgreSQL 16 server<br/>Port 5432<br/>Data volume]
```

## Configuration

### Environment Variables

The overlay includes a `.env.example` file. Copy it to `.env` and customize:

```bash
cd .devcontainer
cp .env.example .env
```

**Default values (.env.example):**

```bash
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=devdb
POSTGRES_PORT=5432
```

⚠️ **Important:** The `.env` file is git-ignored. Always use strong passwords in production.

### Port Configuration

The default port (5432) can be changed via the `--port-offset` option when initializing the devcontainer:

```bash
# Offset all ports by 100
container-superposition --port-offset 100

# PostgreSQL will be on 5532 instead of 5432
```

## Connection Information

### From Development Container

```bash
# Hostname: postgres (Docker Compose service name)
# Port: 5432
# Database: devdb (or value from .env)
# Username: postgres (or value from .env)
# Password: postgres (or value from .env)

# Connection string
postgresql://postgres:postgres@postgres:5432/devdb
```

### From Host Machine

```bash
# Hostname: localhost
# Port: 5432 (or 5432 + port-offset)
# Database: devdb
# Username: postgres
# Password: postgres

# Connection string
postgresql://postgres:postgres@localhost:5432/devdb
```

## Common Commands

### Using psql (PostgreSQL CLI)

The PostgreSQL client tools are pre-installed in your development container.

```bash
# Connect to database
psql -h postgres -U postgres -d devdb

# Connect with connection string
psql postgresql://postgres:postgres@postgres:5432/devdb

# Execute SQL file
psql -h postgres -U postgres -d devdb -f schema.sql

# Execute single command
psql -h postgres -U postgres -d devdb -c "SELECT version();"

# Export data to CSV
psql -h postgres -U postgres -d devdb -c "COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER" > users.csv

# Import data from CSV
psql -h postgres -U postgres -d devdb -c "\COPY users FROM 'users.csv' WITH CSV HEADER"
```

### Database Management

```sql
-- List databases
\l

-- Connect to database
\c devdb

-- List tables
\dt

-- Describe table
\d users

-- List schemas
\dn

-- List users/roles
\du

-- Execute SQL file
\i schema.sql

-- Toggle expanded display
\x

-- Quit
\q
```

### Creating Databases and Users

```sql
-- Create database
CREATE DATABASE myapp;

-- Create user
CREATE USER myapp_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE myapp TO myapp_user;

-- Grant schema privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO myapp_user;

-- Grant future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO myapp_user;
```

### Common SQL Operations

```sql
-- Create table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data
INSERT INTO users (username, email) VALUES ('john', 'john@example.com');

-- Query data
SELECT * FROM users;

-- Update data
UPDATE users SET email = 'newemail@example.com' WHERE username = 'john';

-- Delete data
DELETE FROM users WHERE username = 'john';

-- Create index
CREATE INDEX idx_users_email ON users(email);

-- Add foreign key
ALTER TABLE orders ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users(id);
```

### Backup and Restore

```bash
# Backup database
pg_dump -h postgres -U postgres devdb > backup.sql

# Backup with custom format (compressed)
pg_dump -h postgres -U postgres -Fc devdb > backup.dump

# Backup all databases
pg_dumpall -h postgres -U postgres > all_databases.sql

# Restore from SQL file
psql -h postgres -U postgres devdb < backup.sql

# Restore from custom format
pg_restore -h postgres -U postgres -d devdb backup.dump

# Restore specific table
pg_restore -h postgres -U postgres -d devdb -t users backup.dump
```

### Performance and Monitoring

```sql
-- Show active connections
SELECT * FROM pg_stat_activity;

-- Kill connection
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = 12345;

-- Show table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Show index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Show slow queries (requires pg_stat_statements extension)
SELECT
  mean_exec_time,
  calls,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Application Integration

### Node.js (pg library)

```bash
npm install pg
```

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: 'devdb',
    user: 'postgres',
    password: 'postgres',
});

// Query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [1]);
console.log(result.rows);

// Insert
await pool.query('INSERT INTO users (username, email) VALUES ($1, $2)', [
    'john',
    'john@example.com',
]);
```

### Python (psycopg2)

```bash
pip install psycopg2-binary
```

```python
import psycopg2

conn = psycopg2.connect(
    host="postgres",
    port=5432,
    database="devdb",
    user="postgres",
    password="postgres"
)

cur = conn.cursor()

# Query
cur.execute("SELECT * FROM users WHERE id = %s", (1,))
rows = cur.fetchall()

# Insert
cur.execute(
    "INSERT INTO users (username, email) VALUES (%s, %s)",
    ("john", "john@example.com")
)
conn.commit()

cur.close()
conn.close()
```

### .NET (Npgsql)

```bash
dotnet add package Npgsql
```

```csharp
using Npgsql;

var connectionString = "Host=postgres;Port=5432;Database=devdb;Username=postgres;Password=postgres";

await using var conn = new NpgsqlConnection(connectionString);
await conn.OpenAsync();

// Query
await using var cmd = new NpgsqlCommand("SELECT * FROM users WHERE id = @id", conn);
cmd.Parameters.AddWithValue("id", 1);
await using var reader = await cmd.ExecuteReaderAsync();

while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader["username"]}: {reader["email"]}");
}
```

### Go (pgx)

```bash
go get github.com/jackc/pgx/v5
```

```go
package main

import (
    "context"
    "github.com/jackc/pgx/v5"
)

func main() {
    ctx := context.Background()
    conn, err := pgx.Connect(ctx, "postgresql://postgres:postgres@postgres:5432/devdb")
    if err != nil {
        panic(err)
    }
    defer conn.Close(ctx)

    // Query
    var username, email string
    err = conn.QueryRow(ctx, "SELECT username, email FROM users WHERE id = $1", 1).Scan(&username, &email)

    // Insert
    _, err = conn.Exec(ctx, "INSERT INTO users (username, email) VALUES ($1, $2)", "john", "john@example.com")
}
```

## Use Cases

### Application Development

- Local database for web applications
- API backend data storage
- Microservices data persistence

### Testing

- Integration tests with real database
- Schema migration testing
- Performance testing

### Learning SQL

- Practice SQL queries
- Database design
- PostgreSQL-specific features

### Data Analysis

- Local data warehouse
- ETL pipeline development
- SQL query optimization

## Extensions

PostgreSQL supports many extensions. Common ones:

```sql
-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT uuid_generate_v4();

-- Enable PostGIS (geospatial data)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- List installed extensions
\dx
```

## Troubleshooting

### Cannot connect to database

```bash
# Check if PostgreSQL container is running
docker-compose ps
# Note: Use 'docker compose' (without hyphen) if using Docker Compose V2

# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection from dev container
psql -h postgres -U postgres -c "SELECT version();"

# Check network connectivity
ping postgres
```

### Password authentication failed

```bash
# Verify environment variables
cat .devcontainer/.env

# Ensure .env file is loaded
# Rebuild container if needed
```

### Database does not exist

```sql
-- List databases
psql -h postgres -U postgres -c "\l"

-- Create database
psql -h postgres -U postgres -c "CREATE DATABASE devdb;"
```

### Permission denied errors

```sql
-- Grant privileges to user
GRANT ALL PRIVILEGES ON DATABASE devdb TO myuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO myuser;
```

### Out of connections

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check max connections
SHOW max_connections;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

### Data not persisting

Data is stored in a Docker volume and should persist across container restarts. If data is lost:

```bash
# Check volumes
docker volume ls

# Inspect volume
docker volume inspect <volume-name>

# If needed, recreate volume
docker-compose down -v  # WARNING: Deletes all data
docker-compose up -d
```

## Performance Tuning

For development, PostgreSQL uses default settings. For better performance:

**Increase shared buffers (add to docker-compose.yml):**

```yaml
services:
    postgres:
        command: postgres -c shared_buffers=256MB -c max_connections=200
```

**Or create custom postgresql.conf:**

```ini
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connections
max_connections = 200

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

## Security Best Practices

1. **Change default password** - Use strong passwords in `.env`
2. **Don't commit .env** - Keep credentials out of version control
3. **Use least privilege** - Create users with minimal required permissions
4. **Limit connections** - Restrict connections to necessary IP addresses
5. **Regular backups** - Backup data regularly with `pg_dump`
6. **Update regularly** - Keep PostgreSQL updated

## Migration Tools

### Flyway

```bash
# Install Flyway CLI
# Add migration scripts to db/migration/

flyway -url=jdbc:postgresql://postgres:5432/devdb \
       -user=postgres \
       -password=postgres \
       migrate
```

### Liquibase

```bash
# Create changelog.xml
liquibase --url=jdbc:postgresql://postgres:5432/devdb \
          --username=postgres \
          --password=postgres \
          update
```

### Alembic (Python)

```bash
pip install alembic

# Initialize
alembic init migrations

# Configure alembic.ini
sqlalchemy.url = postgresql://postgres:postgres@postgres:5432/devdb

# Create migration
alembic revision -m "create users table"

# Apply migrations
alembic upgrade head
```

## Related Overlays

- **nodejs** - For Node.js applications with PostgreSQL
- **python** - For Python applications with Django/Flask
- **dotnet** - For .NET applications with Entity Framework
- **grafana** - For database monitoring dashboards
- **redis** - For caching layer with PostgreSQL

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [psql Commands](https://www.postgresql.org/docs/16/app-psql.html)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Awesome PostgreSQL](https://github.com/dhamaniasad/awesome-postgres)

## Notes

- This overlay **requires compose stack** (uses docker-compose)
- PostgreSQL runs on port **5432** (configurable with port-offset)
- Data persists in Docker volume (survives container restarts)
- Use hostname **`postgres`** from development container
- Use **`localhost`** from host machine
