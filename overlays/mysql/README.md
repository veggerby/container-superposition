# MySQL Overlay

MySQL 8 relational database with phpMyAdmin web UI for development and testing.

## Features

- **MySQL 8** - Popular open-source relational database
- **phpMyAdmin** - Web-based MySQL administration interface (port 8080)
- **mysql CLI** - Command-line client for database operations
- **Docker Compose services** - Runs as separate containers
- **Persistent storage** - Data survives container restarts
- **Health checks** - Ensures services are ready before use
- **VS Code Extension:** MySQL Client (cweijan.vscode-mysql-client2)

## How It Works

This overlay adds MySQL 8 and phpMyAdmin as separate Docker Compose services. The database runs in its own container and is accessible from your development container via the hostname `mysql`.

**Architecture:**
```mermaid
graph TD
    A[Development Container<br/>Your application code<br/>mysql client<br/>Connects to mysql:3306] -->|Docker network devnet| B[MySQL Container<br/>MySQL 8 server<br/>Port 3306<br/>Data volume]
    B --> C[phpMyAdmin Container<br/>Web UI on port 8080<br/>Connected to MySQL]
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
# MySQL Configuration
MYSQL_VERSION=8
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=devdb
MYSQL_USER=devuser
MYSQL_PASSWORD=devpassword
MYSQL_PORT=3306

# phpMyAdmin Configuration
PHPMYADMIN_VERSION=latest
PHPMYADMIN_PORT=8080
```

⚠️ **SECURITY:** Change default passwords for production use. The `.env` file is git-ignored.

### Port Configuration

Default ports can be changed via the `--port-offset` option when initializing:

```bash
# Offset all ports by 100
container-superposition --port-offset 100

# MySQL will be on 3406, phpMyAdmin on 8180
```

## Connection Information

### From Development Container

```bash
# Hostname: mysql (Docker Compose service name)
# Port: 3306
# Database: devdb (or value from .env)
# Username: devuser / root
# Password: devpassword / rootpassword (from .env)

# Connection string (non-root user)
mysql://devuser:devpassword@mysql:3306/devdb

# Connection string (root user)
mysql://root:rootpassword@mysql:3306/devdb
```

### From Host Machine

```bash
# Hostname: localhost
# Port: 3306 (or 3306 + port-offset)
# Database: devdb
# Username: devuser / root
# Password: devpassword / rootpassword

# Connection string
mysql://devuser:devpassword@localhost:3306/devdb
```

### phpMyAdmin Web UI

Access the web interface from your host machine:

```
http://localhost:8080
```

Login with:
- **Server:** mysql
- **Username:** root (or devuser)
- **Password:** rootpassword (or devpassword)

## Common Commands

### Using mysql CLI

```bash
# Connect as root user
mysql -h mysql -P 3306 -u root -prootpassword

# Connect as regular user
mysql -h mysql -P 3306 -u devuser -pdevpassword devdb

# Connect and run query
mysql -h mysql -u root -prootpassword -e "SHOW DATABASES;"

# Execute SQL file
mysql -h mysql -u root -prootpassword devdb < schema.sql

# Dump database
mysqldump -h mysql -u root -prootpassword devdb > backup.sql
```

### Database Operations

```bash
# Show databases
mysql -h mysql -u root -prootpassword -e "SHOW DATABASES;"

# Create database
mysql -h mysql -u root -prootpassword -e "CREATE DATABASE myapp;"

# Use specific database
mysql -h mysql -u root -prootpassword myapp

# Show tables
mysql -h mysql -u root -prootpassword devdb -e "SHOW TABLES;"

# Create table
mysql -h mysql -u root -prootpassword devdb -e "
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE
);"

# Insert data
mysql -h mysql -u root -prootpassword devdb -e "
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');"

# Query data
mysql -h mysql -u root -prootpassword devdb -e "SELECT * FROM users;"

# Drop database
mysql -h mysql -u root -prootpassword -e "DROP DATABASE myapp;"
```

### Container Management

```bash
# Check service status
docker-compose ps

# View MySQL logs
docker-compose logs -f mysql

# View phpMyAdmin logs
docker-compose logs -f phpmyadmin

# Restart services
docker-compose restart mysql phpmyadmin

# Stop services
docker-compose stop mysql phpmyadmin

# Remove data (WARNING: destroys all data)
docker-compose down -v
```

## Application Integration

### Node.js

```bash
# Install MySQL driver
npm install mysql2

# Or use an ORM like Sequelize
npm install sequelize mysql2
```

```javascript
// Using mysql2
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'mysql',
    port: 3306,
    user: 'devuser',
    password: 'devpassword',
    database: 'devdb'
  });

  // Query
  const [rows] = await connection.execute('SELECT * FROM users');
  console.log(rows);

  // Insert
  await connection.execute(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    ['Alice', 'alice@example.com']
  );

  await connection.end();
}

main();
```

### Python

```bash
# Install MySQL connector
pip install mysql-connector-python

# Or use PyMySQL
pip install pymysql
```

```python
import mysql.connector

# Connect
conn = mysql.connector.connect(
    host='mysql',
    port=3306,
    user='devuser',
    password='devpassword',
    database='devdb'
)

cursor = conn.cursor()

# Query
cursor.execute('SELECT * FROM users')
for row in cursor.fetchall():
    print(row)

# Insert
cursor.execute(
    'INSERT INTO users (name, email) VALUES (%s, %s)',
    ('Alice', 'alice@example.com')
)
conn.commit()

# Close
cursor.close()
conn.close()
```

### PHP

```php
<?php
// Using PDO
$pdo = new PDO(
    'mysql:host=mysql;port=3306;dbname=devdb',
    'devuser',
    'devpassword'
);

// Query
$stmt = $pdo->query('SELECT * FROM users');
while ($row = $stmt->fetch()) {
    print_r($row);
}

// Insert
$stmt = $pdo->prepare('INSERT INTO users (name, email) VALUES (?, ?)');
$stmt->execute(['Alice', 'alice@example.com']);
?>
```

### .NET

```bash
# Install MySQL connector
dotnet add package MySql.Data
```

```csharp
using MySql.Data.MySqlClient;

var connectionString = "Server=mysql;Port=3306;Database=devdb;Uid=devuser;Pwd=devpassword;";

using var connection = new MySqlConnection(connectionString);
await connection.OpenAsync();

// Query
using var command = new MySqlCommand("SELECT * FROM users", connection);
using var reader = await command.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader["name"]}: {reader["email"]}");
}

// Insert
var insertCmd = new MySqlCommand(
    "INSERT INTO users (name, email) VALUES (@name, @email)",
    connection
);
insertCmd.Parameters.AddWithValue("@name", "Alice");
insertCmd.Parameters.AddWithValue("@email", "alice@example.com");
await insertCmd.ExecuteNonQueryAsync();
```

### Go

```bash
# Install MySQL driver
go get github.com/go-sql-driver/mysql
```

```go
package main

import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
)

func main() {
    db, _ := sql.Open("mysql", "devuser:devpassword@tcp(mysql:3306)/devdb")
    defer db.Close()

    // Query
    rows, _ := db.Query("SELECT * FROM users")
    defer rows.Close()

    for rows.Next() {
        var name, email string
        rows.Scan(&name, &email)
        println(name, email)
    }

    // Insert
    db.Exec("INSERT INTO users (name, email) VALUES (?, ?)",
        "Alice", "alice@example.com")
}
```

## Use Cases

- **Legacy compatibility** - Wide ecosystem support, established patterns
- **WordPress/PHP applications** - Traditional LAMP stack development
- **E-commerce platforms** - Proven for transactional workloads
- **CMS and blogging platforms** - Drupal, Joomla, WordPress
- **General web applications** - Mature, well-documented, reliable
- **Learning SQL** - Industry-standard relational database

**Integrates well with:**
- PHP, Node.js, Python, .NET, Go (application development)
- Grafana (database metrics visualization)
- OTEL Collector (query performance monitoring)

## Troubleshooting

### Issue: Cannot connect to MySQL

**Symptoms:**
- Connection refused errors
- Timeout when connecting

**Solution:**
```bash
# Check if service is running
docker-compose ps

# Check MySQL logs
docker-compose logs mysql

# Wait for health check to pass
docker-compose ps | grep mysql
# Look for "healthy" status

# Test connection
mysql -h mysql -u root -prootpassword -e "SELECT 1"
```

### Issue: Access denied for user

**Symptoms:**
- "Access denied for user 'devuser'@'%'"
- Authentication errors

**Solution:**
```bash
# Verify credentials in .env file
cat .devcontainer/.env

# Ensure credentials match in connection string
# mysql://USERNAME:PASSWORD@mysql:3306/DATABASE

# If changing credentials, recreate containers
docker-compose down -v
docker-compose up -d
```

### Issue: phpMyAdmin not accessible

**Symptoms:**
- Cannot access http://localhost:8080
- Page not loading

**Solution:**
```bash
# Check phpMyAdmin logs
docker-compose logs phpmyadmin

# Verify MySQL is healthy first
docker-compose ps mysql

# Restart phpMyAdmin
docker-compose restart phpmyadmin

# Check port forwarding in VS Code
# Dev Containers: Forward Ports... (port 8080)
```

### Issue: Database not found

**Symptoms:**
- "Unknown database 'devdb'"

**Solution:**
```bash
# Create database manually
mysql -h mysql -u root -prootpassword -e "CREATE DATABASE devdb;"

# Or recreate containers (uses MYSQL_DATABASE env var)
docker-compose down
docker-compose up -d
```

### Issue: Data not persisting

**Symptoms:**
- Data lost after container restart

**Solution:**
```bash
# Verify volumes exist
docker volume ls | grep mysql

# Check volume mounts in docker-compose.yml
docker-compose config

# Don't use 'docker-compose down -v' unless you want to delete data
# Use 'docker-compose down' or 'docker-compose stop' instead
```

## Security Considerations

⚠️ **Development-only defaults:**

- Default credentials are intentionally weak for development
- MySQL is exposed on host port (accessible from host machine)
- Root user has remote access enabled

**For production:**

1. **Change credentials:**
   ```bash
   # Use strong passwords
   MYSQL_ROOT_PASSWORD=<strong-password>
   MYSQL_PASSWORD=<strong-password>
   ```

2. **Limit user privileges:**
   ```sql
   -- Create user with limited permissions
   CREATE USER 'app'@'%' IDENTIFIED BY 'password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON devdb.* TO 'app'@'%';
   ```

3. **Restrict network access:**
   - Don't expose ports publicly
   - Use firewall rules
   - Consider TLS/SSL for connections

4. **Disable phpMyAdmin in production:**
   ```yaml
   # Comment out or remove phpmyadmin service
   ```

## Related Overlays

- **nodejs** - Node.js with MySQL drivers
- **python** - Python with MySQL connectors
- **dotnet** - .NET with MySQL.Data
- **grafana** - Visualize MySQL metrics
- **otel-collector** - Monitor MySQL query performance

## Additional Resources

- [Official MySQL Documentation](https://dev.mysql.com/doc/)
- [MySQL Docker Image](https://hub.docker.com/_/mysql)
- [phpMyAdmin](https://www.phpmyadmin.net/)
- [MySQL Tutorial](https://www.mysqltutorial.org/)
- [MySQL Best Practices](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

## Notes

- MySQL uses the hostname `mysql` (the service name) for container-to-container communication
- Data is persisted in a Docker volume (`mysql-data`)
- phpMyAdmin provides a convenient web UI for database management
- MySQL 8 includes modern features like window functions, CTEs, and JSON support
- Health checks ensure MySQL is ready before phpMyAdmin starts
- Default configuration creates both root and regular user accounts
