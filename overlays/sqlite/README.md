# SQLite Overlay

SQLite embedded database with enhanced CLI tools and VS Code extensions for file-based database development.

## Features

- **sqlite3 CLI** - Command-line interface for SQLite databases
- **litecli** - Modern CLI with syntax highlighting and autocompletion (requires Python)
- **File-based** - No server required, database stored in local files
- **VS Code Extensions:**
  - SQLite Viewer (qwtel.sqlite-viewer) - View and edit SQLite databases
  - SQLite (alexcvzz.vscode-sqlite) - Query and manage databases
- **Lightweight** - Minimal resource usage, instant startup
- **No service** - Works with both plain and compose templates

## How It Works

Unlike server-based databases, SQLite stores the entire database in a single file on disk. This overlay installs the SQLite CLI tools and VS Code extensions for working with SQLite databases.

**Architecture:**
```
┌─────────────────────────────────┐
│   Development Container         │
│   - Your application code       │
│   - sqlite3 CLI                 │
│   - litecli (enhanced CLI)      │
│   - SQLite databases (.db)      │
│   - No server needed            │
└─────────────────────────────────┘
```

**No Docker Compose service** - SQLite is embedded directly in your application and development environment.

## Configuration

No configuration needed! SQLite databases are just files on disk.

**Typical database locations:**
```bash
# In project root
/workspace/database.db

# In data directory
/workspace/data/app.db

# In home directory
~/myapp.db
```

## Common Commands

### Using sqlite3 CLI

```bash
# Create/open database
sqlite3 myapp.db

# Create database and run commands
sqlite3 myapp.db "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);"

# Run SQL file
sqlite3 myapp.db < schema.sql

# Dump database
sqlite3 myapp.db .dump > backup.sql

# Export to CSV
sqlite3 -header -csv myapp.db "SELECT * FROM users;" > users.csv

# Interactive mode
sqlite3 myapp.db
```

### SQLite Interactive Commands

```sql
-- Inside sqlite3 interactive session

.help                  -- Show all commands
.tables                -- List tables
.schema users          -- Show table schema
.mode column           -- Pretty-print results
.headers on            -- Show column headers
.width 20 40           -- Set column widths

-- Query data
SELECT * FROM users;

-- Insert data
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');

-- Exit
.quit
```

### Using litecli (Enhanced CLI)

```bash
# Create/open database (if Python overlay installed)
litecli myapp.db

# Features:
# - Syntax highlighting
# - Auto-completion (type table names, column names)
# - Query history (up/down arrows)
# - Multi-line editing
# - Better output formatting
```

### Database Operations

```bash
# Create table
sqlite3 myapp.db "
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);"

# Insert data
sqlite3 myapp.db "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');"

# Query data
sqlite3 myapp.db "SELECT * FROM users;"

# Update data
sqlite3 myapp.db "UPDATE users SET email = 'newemail@example.com' WHERE name = 'Alice';"

# Delete data
sqlite3 myapp.db "DELETE FROM users WHERE id = 1;"

# Vacuum (reclaim space)
sqlite3 myapp.db "VACUUM;"

# Backup database
sqlite3 myapp.db ".backup myapp_backup.db"

# Restore from backup
sqlite3 myapp.db ".restore myapp_backup.db"
```

### Using VS Code Extensions

**SQLite Viewer Extension:**
1. Right-click on `.db` file in VS Code Explorer
2. Select "Open with SQLite Viewer"
3. Browse tables, view data, edit rows

**SQLite Extension:**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Select "SQLite: Open Database"
3. Choose your `.db` file
4. Use "SQLite: New Query" to run SQL

## Application Integration

### Node.js

```bash
# Install better-sqlite3 (synchronous, faster)
npm install better-sqlite3

# Or use sqlite3 (asynchronous)
npm install sqlite3
```

```javascript
// Using better-sqlite3
const Database = require('better-sqlite3');

const db = new Database('myapp.db');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE
  )
`);

// Insert
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
insert.run('Alice', 'alice@example.com');

// Query
const users = db.prepare('SELECT * FROM users').all();
console.log(users);

db.close();
```

### Python

```bash
# sqlite3 module is built-in, no installation needed
```

```python
import sqlite3

# Connect (creates file if doesn't exist)
conn = sqlite3.connect('myapp.db')
cursor = conn.cursor()

# Create table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE
    )
''')

# Insert
cursor.execute('INSERT INTO users (name, email) VALUES (?, ?)',
    ('Alice', 'alice@example.com'))
conn.commit()

# Query
cursor.execute('SELECT * FROM users')
for row in cursor.fetchall():
    print(row)

# Close
conn.close()
```

### .NET

```bash
# Install SQLite package
dotnet add package Microsoft.Data.Sqlite
```

```csharp
using Microsoft.Data.Sqlite;

using var connection = new SqliteConnection("Data Source=myapp.db");
await connection.OpenAsync();

// Create table
var createCmd = connection.CreateCommand();
createCmd.CommandText = @"
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE
    )
";
await createCmd.ExecuteNonQueryAsync();

// Insert
var insertCmd = connection.CreateCommand();
insertCmd.CommandText = "INSERT INTO users (name, email) VALUES ($name, $email)";
insertCmd.Parameters.AddWithValue("$name", "Alice");
insertCmd.Parameters.AddWithValue("$email", "alice@example.com");
await insertCmd.ExecuteNonQueryAsync();

// Query
var selectCmd = connection.CreateCommand();
selectCmd.CommandText = "SELECT * FROM users";
using var reader = await selectCmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader["name"]}: {reader["email"]}");
}
```

### Go

```bash
# Install SQLite driver
go get github.com/mattn/go-sqlite3
```

```go
package main

import (
    "database/sql"
    _ "github.com/mattn/go-sqlite3"
)

func main() {
    db, _ := sql.Open("sqlite3", "myapp.db")
    defer db.Close()

    // Create table
    db.Exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE
        )
    `)

    // Insert
    db.Exec("INSERT INTO users (name, email) VALUES (?, ?)",
        "Alice", "alice@example.com")

    // Query
    rows, _ := db.Query("SELECT * FROM users")
    defer rows.Close()
    
    for rows.Next() {
        var id int
        var name, email string
        rows.Scan(&id, &name, &email)
        println(id, name, email)
    }
}
```

### Rust

```bash
# Add to Cargo.toml
# rusqlite = "0.30"
```

```rust
use rusqlite::{Connection, Result};

fn main() -> Result<()> {
    let conn = Connection::open("myapp.db")?;

    // Create table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE
        )",
        [],
    )?;

    // Insert
    conn.execute(
        "INSERT INTO users (name, email) VALUES (?1, ?2)",
        &["Alice", "alice@example.com"],
    )?;

    // Query
    let mut stmt = conn.prepare("SELECT * FROM users")?;
    let users = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i32>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    })?;

    for user in users {
        println!("{:?}", user?);
    }

    Ok(())
}
```

## Use Cases

- **Embedded databases** - Mobile apps, desktop apps, single-user applications
- **Testing** - Fast, in-memory or file-based test databases
- **Prototyping** - Quick database without server setup
- **Small applications** - Low-traffic websites, personal projects
- **Local caching** - Store data locally without network overhead
- **Data analysis** - Query CSV/JSON data imported into SQLite
- **Learning SQL** - Simple, no-configuration database for education

**Integrates well with:**
- Node.js, Python, .NET, Go, Rust (all have excellent SQLite support)
- Any application needing embedded database
- File-based projects (no network required)

## Troubleshooting

### Issue: Database is locked

**Symptoms:**
- "database is locked" error
- Timeout when writing

**Solution:**
```bash
# Only one writer allowed at a time
# Close all open connections before writing

# In Python:
conn.close()

# Check for .db-wal and .db-shm files (Write-Ahead Logging)
ls -la *.db*

# Force checkpoint (close WAL)
sqlite3 myapp.db "PRAGMA wal_checkpoint(FULL);"
```

### Issue: litecli not found

**Symptoms:**
- `litecli: command not found`

**Solution:**
```bash
# litecli requires Python
# Install Python overlay for litecli support

# Or install manually:
pip install --user litecli
export PATH="$HOME/.local/bin:$PATH"
```

### Issue: Database file not found

**Symptoms:**
- "unable to open database file"

**Solution:**
```bash
# Check file path is correct
ls -la myapp.db

# Use absolute path
sqlite3 /workspace/myapp.db

# Or ensure you're in the correct directory
cd /workspace
sqlite3 myapp.db
```

### Issue: Corrupted database

**Symptoms:**
- "database disk image is malformed"

**Solution:**
```bash
# Try to dump and recreate
sqlite3 myapp.db .dump > backup.sql
mv myapp.db myapp.db.corrupted
sqlite3 myapp_new.db < backup.sql

# Run integrity check
sqlite3 myapp.db "PRAGMA integrity_check;"

# If salvageable, export and reimport
```

### Issue: Performance issues

**Symptoms:**
- Slow inserts/updates
- Database growing large

**Solution:**
```bash
# Use transactions for bulk inserts
sqlite3 myapp.db "
BEGIN TRANSACTION;
INSERT INTO users ...;
INSERT INTO users ...;
COMMIT;
"

# Enable WAL mode (better concurrency)
sqlite3 myapp.db "PRAGMA journal_mode=WAL;"

# Analyze query performance
sqlite3 myapp.db "EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com';"

# Create indexes
sqlite3 myapp.db "CREATE INDEX idx_users_email ON users(email);"

# Vacuum to reclaim space
sqlite3 myapp.db "VACUUM;"
```

## Performance Tips

1. **Use transactions** for bulk operations:
   ```sql
   BEGIN TRANSACTION;
   -- Multiple INSERT/UPDATE statements
   COMMIT;
   ```

2. **Enable WAL mode** for better concurrency:
   ```sql
   PRAGMA journal_mode=WAL;
   ```

3. **Create indexes** on frequently queried columns:
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   ```

4. **Use prepared statements** in application code (prevents SQL injection, faster)

5. **Vacuum regularly** to reclaim space:
   ```sql
   VACUUM;
   ```

## Security Considerations

⚠️ **File-based security:**

- SQLite databases are single files - protect file permissions
- No built-in user authentication/authorization
- Applications must implement access control

**Best practices:**

1. **File permissions:**
   ```bash
   # Restrict database file access
   chmod 600 myapp.db
   ```

2. **Use parameterized queries** to prevent SQL injection:
   ```python
   # Good
   cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
   
   # Bad (SQL injection vulnerable)
   cursor.execute(f'SELECT * FROM users WHERE email = "{email}"')
   ```

3. **Encrypt sensitive data:**
   ```bash
   # Use SQLCipher for encrypted databases
   # Or encrypt database file at OS level
   ```

4. **Backup regularly:**
   ```bash
   # Automated backups
   sqlite3 myapp.db ".backup /backups/myapp_$(date +%Y%m%d).db"
   ```

## Related Overlays

- **nodejs** - Node.js with better-sqlite3 support
- **python** - Python with built-in sqlite3 module (enables litecli)
- **dotnet** - .NET with Microsoft.Data.Sqlite
- No service dependencies - works standalone

## Additional Resources

- [Official SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQLite Tutorial](https://www.sqlitetutorial.net/)
- [litecli GitHub](https://github.com/dbcli/litecli)
- [SQLite Viewer Extension](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer)
- [When to Use SQLite](https://www.sqlite.org/whentouse.html)

## Notes

- SQLite is **not** a client-server database - it's embedded in your application
- Perfect for **development, testing, and small-to-medium applications**
- Database is a **single file** - easy to copy, backup, version control
- **No network overhead** - faster than client-server databases for local use
- **ACID compliant** - full transaction support
- **Cross-platform** - database files work across Windows, macOS, Linux
- **Widely supported** - drivers available for virtually every language
- litecli requires Python - install Python overlay for enhanced CLI experience
