# SQL Server Overlay

Microsoft SQL Server 2022 for Linux - enterprise-grade relational database for .NET and Microsoft stack development.

## Features

- **SQL Server 2022** - Latest version with modern T-SQL features
- **Developer Edition** - Full-featured free edition for development/testing
- **Docker Compose service** - Runs as separate container
- **Persistent storage** - Data survives container restarts
- **Health checks** - Ensures service is ready before use
- **VS Code Extension:** SQL Server (mssql) by Microsoft (ms-mssql.mssql)

## How It Works

This overlay adds Microsoft SQL Server 2022 for Linux as a Docker Compose service. The database runs in its own container and is accessible from your development container via the hostname `sqlserver`.

**Architecture:**
```mermaid
graph TD
    A[Development Container<br/>Your application code<br/>VS Code mssql extension<br/>Connects to sqlserver:1433] -->|Docker network devnet| B[SQL Server Container<br/>SQL Server 2022<br/>Port 1433<br/>Data volume]
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
# SQL Server Configuration
MSSQL_VERSION=2022-latest
MSSQL_SA_PASSWORD=YourStrong@Passw0rd
MSSQL_PID=Developer
MSSQL_PORT=1433
```

⚠️ **Password Requirements:** SQL Server requires passwords with:
- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

⚠️ **SECURITY:** Change the SA password for production use. The `.env` file is git-ignored.

### Port Configuration

The default port (1433) can be changed via the `--port-offset` option when initializing:

```bash
# Offset all ports by 100
container-superposition --port-offset 100

# SQL Server will be on 1533 instead of 1433
```

## Connection Information

### From Development Container

```bash
# Hostname: sqlserver (Docker Compose service name)
# Port: 1433
# Username: sa
# Password: YourStrong@Passw0rd (or value from .env)

# Connection string (ADO.NET)
Server=sqlserver,1433;Database=master;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True;

# Connection string (ODBC)
Driver={ODBC Driver 18 for SQL Server};Server=sqlserver,1433;Database=master;Uid=sa;Pwd=YourStrong@Passw0rd;TrustServerCertificate=yes;
```

### From Host Machine

```bash
# Hostname: localhost
# Port: 1433 (or 1433 + port-offset)
# Username: sa
# Password: YourStrong@Passw0rd

# Connection string
Server=localhost,1433;Database=master;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True;
```

### Using VS Code mssql Extension

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Select "MS SQL: Connect"
3. Create a new connection profile:
   - **Server:** sqlserver,1433
   - **Database:** master (or your database name)
   - **Authentication:** SQL Login
   - **User:** sa
   - **Password:** YourStrong@Passw0rd
   - **Save Password:** Yes
   - **Profile Name:** SQL Server Dev

## Common Commands

### Using VS Code Extension

The MS SQL extension provides:
- Query editor with IntelliSense
- Execute queries (Ctrl+Shift+E / Cmd+Shift+E)
- View databases and tables in sidebar
- Generate CREATE scripts
- Export results to CSV/JSON

### Using sqlcmd (in SQL Server container)

```bash
# Execute query via docker exec
docker exec -it $(docker ps -qf "name=sqlserver") \
  /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd' \
  -Q "SELECT @@VERSION"

# Interactive session
docker exec -it $(docker ps -qf "name=sqlserver") \
  /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd'
```

### Database Operations

```sql
-- Show databases
SELECT name FROM sys.databases;

-- Create database
CREATE DATABASE MyApp;

-- Use database
USE MyApp;

-- Create table
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100),
    Email NVARCHAR(100) UNIQUE
);

-- Insert data
INSERT INTO Users (Name, Email) VALUES ('Alice', 'alice@example.com');

-- Query data
SELECT * FROM Users;

-- Drop database
DROP DATABASE MyApp;
```

### Backup and Restore

```sql
-- Backup database
BACKUP DATABASE MyApp
TO DISK = '/var/opt/mssql/data/MyApp.bak'
WITH FORMAT;

-- Restore database
RESTORE DATABASE MyApp
FROM DISK = '/var/opt/mssql/data/MyApp.bak'
WITH REPLACE;
```

### Container Management

```bash
# Check service status
docker-compose ps

# View SQL Server logs
docker-compose logs -f sqlserver

# Restart service
docker-compose restart sqlserver

# Stop service
docker-compose stop sqlserver

# Remove data (WARNING: destroys all data)
docker-compose down -v
```

## Application Integration

### .NET (C#)

```bash
# Install SQL Server client
dotnet add package Microsoft.Data.SqlClient
```

```csharp
using Microsoft.Data.SqlClient;

var connectionString = "Server=sqlserver,1433;Database=MyApp;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True;";

using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

// Query
using var command = new SqlCommand("SELECT * FROM Users", connection);
using var reader = await command.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader["Name"]}: {reader["Email"]}");
}

// Insert
var insertCmd = new SqlCommand(
    "INSERT INTO Users (Name, Email) VALUES (@Name, @Email)",
    connection
);
insertCmd.Parameters.AddWithValue("@Name", "Alice");
insertCmd.Parameters.AddWithValue("@Email", "alice@example.com");
await insertCmd.ExecuteNonQueryAsync();
```

### .NET (Entity Framework Core)

```bash
# Install EF Core SQL Server provider
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

```csharp
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseSqlServer(
            "Server=sqlserver,1433;Database=MyApp;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True;"
        );
    }
}

public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
}

// Usage
using var db = new AppDbContext();
await db.Database.EnsureCreatedAsync();

db.Users.Add(new User { Name = "Alice", Email = "alice@example.com" });
await db.SaveChangesAsync();

var users = await db.Users.ToListAsync();
```

### Node.js

```bash
# Install SQL Server driver
npm install mssql
```

```javascript
const sql = require('mssql');

const config = {
  server: 'sqlserver',
  port: 1433,
  database: 'MyApp',
  user: 'sa',
  password: 'YourStrong@Passw0rd',
  options: {
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function main() {
  const pool = await sql.connect(config);

  // Query
  const result = await pool.request()
    .query('SELECT * FROM Users');
  console.log(result.recordset);

  // Insert
  await pool.request()
    .input('name', sql.NVarChar, 'Alice')
    .input('email', sql.NVarChar, 'alice@example.com')
    .query('INSERT INTO Users (Name, Email) VALUES (@name, @email)');

  await pool.close();
}

main();
```

### Python

```bash
# Install pyodbc
pip install pyodbc
```

```python
import pyodbc

# Connect
conn = pyodbc.connect(
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=sqlserver,1433;'
    'DATABASE=MyApp;'
    'UID=sa;'
    'PWD=YourStrong@Passw0rd;'
    'TrustServerCertificate=yes;'
)

cursor = conn.cursor()

# Query
cursor.execute('SELECT * FROM Users')
for row in cursor.fetchall():
    print(row)

# Insert
cursor.execute(
    'INSERT INTO Users (Name, Email) VALUES (?, ?)',
    'Alice', 'alice@example.com'
)
conn.commit()

# Close
cursor.close()
conn.close()
```

### Go

```bash
# Install SQL Server driver
go get github.com/denisenkom/go-mssqldb
```

```go
package main

import (
    "database/sql"
    _ "github.com/denisenkom/go-mssqldb"
)

func main() {
    connString := "sqlserver://sa:YourStrong@Passw0rd@sqlserver:1433?database=MyApp&TrustServerCertificate=true"

    db, _ := sql.Open("sqlserver", connString)
    defer db.Close()

    // Query
    rows, _ := db.Query("SELECT * FROM Users")
    defer rows.Close()

    for rows.Next() {
        var name, email string
        rows.Scan(&name, &email)
        println(name, email)
    }

    // Insert
    db.Exec("INSERT INTO Users (Name, Email) VALUES (@p1, @p2)",
        "Alice", "alice@example.com")
}
```

## Use Cases

- **.NET applications** - First-class integration with .NET ecosystem
- **Enterprise applications** - Proven for large-scale deployments
- **Microsoft stack** - Azure, Power BI, SSIS integration
- **Windows legacy apps** - Compatibility with existing systems
- **Stored procedures** - Advanced T-SQL programming
- **Business intelligence** - SSRS, SSAS integration

**Integrates well with:**
- .NET (dotnet overlay) - Primary development platform
- Azure CLI (azure-cli overlay) - Cloud deployment
- Grafana (grafana overlay) - Database metrics visualization
- OTEL Collector (otel-collector overlay) - Performance monitoring

## Troubleshooting

### Issue: Cannot connect to SQL Server

**Symptoms:**
- Connection refused errors
- Timeout when connecting

**Solution:**
```bash
# Check if service is running
docker-compose ps

# SQL Server can take 30-60 seconds to start
# Check logs for "SQL Server is now ready for client connections"
docker-compose logs sqlserver | grep "ready for client connections"

# Wait for health check to pass
docker-compose ps | grep sqlserver
# Look for "healthy" status

# Test connection via docker exec
docker exec -it $(docker ps -qf "name=sqlserver") \
  /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd' \
  -Q "SELECT 1"
```

### Issue: Login failed for user 'sa'

**Symptoms:**
- "Login failed for user 'sa'"
- Authentication errors

**Solution:**
```bash
# Verify password in .env file
cat .devcontainer/.env

# Ensure password meets requirements (8+ chars, uppercase, lowercase, digit, special)

# If changing password, recreate containers
docker-compose down -v
docker-compose up -d
```

### Issue: TrustServerCertificate error

**Symptoms:**
- "The certificate chain was issued by an authority that is not trusted"

**Solution:**
```bash
# Add TrustServerCertificate=True to connection string
# Or use TrustServerCertificate=yes for ODBC

# Example:
# Server=sqlserver,1433;Database=MyApp;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True;
```

### Issue: Database not found

**Symptoms:**
- "Cannot open database 'MyApp' requested by the login"

**Solution:**
```sql
-- Connect to master database first
-- Then create your database
CREATE DATABASE MyApp;
USE MyApp;
```

### Issue: Data not persisting

**Symptoms:**
- Data lost after container restart

**Solution:**
```bash
# Verify volumes exist
docker volume ls | grep sqlserver

# Check volume mounts in docker-compose.yml
docker-compose config

# Don't use 'docker-compose down -v' unless you want to delete data
# Use 'docker-compose down' or 'docker-compose stop' instead
```

### Issue: Container exits immediately

**Symptoms:**
- SQL Server container keeps restarting

**Solution:**
```bash
# Check logs for error messages
docker-compose logs sqlserver

# Common issue: EULA not accepted
# Solution: ACCEPT_EULA=Y is already set in docker-compose.yml

# Common issue: Insufficient resources
# SQL Server requires at least 2GB RAM
# Check Docker Desktop resource settings
```

## Security Considerations

⚠️ **Development-only defaults:**

- Default SA password is intentionally visible for development
- SQL Server is exposed on host port (accessible from host machine)
- TrustServerCertificate is enabled (skips certificate validation)

**For production:**

1. **Change SA password:**
   ```bash
   # Use strong password meeting complexity requirements
   MSSQL_SA_PASSWORD=<ComplexPassword123!>
   ```

2. **Create application-specific users:**
   ```sql
   -- Don't use SA for applications
   CREATE LOGIN appuser WITH PASSWORD = 'ComplexPassword123!';
   CREATE USER appuser FOR LOGIN appuser;
   GRANT SELECT, INSERT, UPDATE, DELETE ON DATABASE::MyApp TO appuser;
   ```

3. **Restrict network access:**
   - Don't expose ports publicly
   - Use firewall rules
   - Enable TLS/SSL encryption

4. **Use Windows Authentication (if applicable):**
   - Configure Active Directory integration
   - Disable SQL authentication for production

5. **Enable auditing:**
   ```sql
   -- Enable server audit
   CREATE SERVER AUDIT MyAudit TO FILE (FILEPATH = '/var/opt/mssql/audit/');
   ALTER SERVER AUDIT MyAudit WITH (STATE = ON);
   ```

## Related Overlays

- **dotnet** - .NET SDK with C# DevKit (recommended)
- **azure-cli** - Azure deployment and management
- **grafana** - Visualize SQL Server metrics
- **otel-collector** - Monitor SQL Server performance

## Additional Resources

- [Official SQL Server on Linux Documentation](https://docs.microsoft.com/en-us/sql/linux/)
- [SQL Server Docker Image](https://hub.docker.com/_/microsoft-mssql-server)
- [VS Code mssql Extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql)
- [T-SQL Reference](https://docs.microsoft.com/en-us/sql/t-sql/)
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/)

## Notes

- SQL Server uses the hostname `sqlserver` (the service name) for container-to-container communication
- Data is persisted in a Docker volume (`sqlserver-data`)
- The Developer Edition is fully featured and free for development/testing
- SQL Server 2022 for Linux has excellent performance and feature parity with Windows
- Health checks include a 30-second start period as SQL Server takes time to initialize
- The VS Code mssql extension provides an excellent development experience
- **Inevitable for .NET developers** - SQL Server is the natural choice for .NET applications
