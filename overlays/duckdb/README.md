# DuckDB Overlay

In-process analytical database for OLAP workloads and data analysis.

## Features

- **DuckDB CLI** - Command-line interface for interactive queries
- **In-process** - No separate server required, embedded database
- **OLAP optimized** - Columnar storage for analytical queries
- **SQL support** - Full ANSI SQL with extensions
- **Parquet/CSV support** - Direct querying of file formats
- **Python integration** - Works seamlessly with Python and pandas

## How It Works

This overlay installs the DuckDB CLI, an in-process analytical database designed for OLAP workloads. Unlike traditional databases, DuckDB runs embedded in your application without requiring a separate server.

**Suggested overlays:**

- `python` - For DuckDB Python API
- `jupyter` - Interactive data analysis

## Installation

DuckDB CLI is installed automatically during devcontainer creation via `setup.sh`:

- Downloads DuckDB CLI for your architecture (amd64/aarch64)
- Installs to `/usr/local/bin/duckdb`
- Verifies installation with test query

## Common Commands

### Interactive Shell

```bash
# Start DuckDB with in-memory database
duckdb

# Create/open persistent database
duckdb mydata.db

# Open database read-only
duckdb mydata.db -readonly
```

### Query Files

```bash
# Query CSV file
duckdb -c "SELECT * FROM 'data.csv' LIMIT 10"

# Query Parquet file
duckdb -c "SELECT * FROM 'data.parquet' WHERE col > 100"

# Query JSON file
duckdb -c "SELECT * FROM read_json_auto('data.json')"
```

### Create Tables

```bash
# From CSV
CREATE TABLE sales AS SELECT * FROM 'sales.csv';

# From Parquet
CREATE TABLE events AS SELECT * FROM 'events.parquet';

# From query
CREATE TABLE summary AS
  SELECT date, SUM(amount) as total
  FROM sales
  GROUP BY date;
```

### Export Results

```bash
# Export to CSV
COPY (SELECT * FROM sales) TO 'output.csv' (HEADER, DELIMITER ',');

# Export to Parquet
COPY sales TO 'output.parquet' (FORMAT PARQUET);

# Export to JSON
COPY (SELECT * FROM sales LIMIT 100) TO 'sample.json';
```

## Python Integration

Install DuckDB Python package:

```python
# In Python code or Jupyter notebook
!pip install duckdb

import duckdb

# Connect to database
con = duckdb.connect('mydata.db')

# Execute query
result = con.execute("SELECT * FROM sales WHERE amount > 100").fetchall()

# Query pandas DataFrame directly
import pandas as pd
df = pd.read_csv('data.csv')
result = con.execute("SELECT * FROM df WHERE col > 100").df()

# Close connection
con.close()
```

### Pandas Integration

```python
import duckdb
import pandas as pd

# Read CSV into DuckDB, query, get pandas DataFrame
df = duckdb.query("SELECT * FROM 'data.csv' WHERE col > 100").df()

# Query DataFrame with SQL
df2 = duckdb.query("SELECT col1, AVG(col2) FROM df GROUP BY col1").df()
```

## Use Cases

- **Data analysis** - Ad-hoc analysis of large datasets
- **ETL pipelines** - Transform data with SQL
- **Analytics** - OLAP queries on columnar data
- **Data science** - Integrate with Python/Jupyter workflows
- **Data exploration** - Quick insights from CSV/Parquet files
- **Embedded analytics** - In-app analytical queries

**Integrates well with:**

- `python` - DuckDB Python API (suggested)
- `jupyter` - Interactive data analysis (suggested)
- Node.js, .NET - DuckDB client libraries available

## SQL Examples

### Analytical Queries

```sql
-- Time series aggregation
SELECT
  date_trunc('day', timestamp) as day,
  COUNT(*) as events,
  AVG(duration) as avg_duration
FROM events
WHERE timestamp > '2024-01-01'
GROUP BY day
ORDER BY day;

-- Window functions
SELECT
  user_id,
  event_time,
  event_type,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_time) as event_seq
FROM user_events;

-- Join multiple files
SELECT
  u.name,
  COUNT(o.id) as order_count,
  SUM(o.amount) as total_spent
FROM 'users.csv' u
JOIN 'orders.parquet' o ON u.id = o.user_id
GROUP BY u.name
ORDER BY total_spent DESC;
```

### File Formats

```sql
-- CSV with options
SELECT * FROM read_csv_auto('data.csv', header=true, delim='|');

-- Parquet with projection
SELECT col1, col2 FROM 'data.parquet' WHERE col3 > 100;

-- JSON with auto-detection
SELECT * FROM read_json_auto('data.json');

-- Excel files
INSTALL spatial;
LOAD spatial;
SELECT * FROM ST_Read('data.xlsx');
```

## Benefits vs PostgreSQL

| Feature               | DuckDB                | PostgreSQL              |
| --------------------- | --------------------- | ----------------------- |
| **Use Case**          | ✅ Analytics (OLAP)   | ✅ Transactions (OLTP)  |
| **Setup**             | ✅ No server needed   | ⚠️ Separate service     |
| **File Queries**      | ✅ Direct CSV/Parquet | ❌ Requires COPY        |
| **Analytical Speed**  | ✅ Very fast          | ⚠️ Slower for analytics |
| **Concurrent Writes** | ⚠️ Limited            | ✅ Excellent            |
| **Data Size**         | ✅ GBs-TBs            | ✅ TBs+                 |

**When to use DuckDB:**

- Analytical queries on read-heavy data
- Working with files (CSV, Parquet, JSON)
- Embedded analytics in applications
- Data science and exploration

**When to use PostgreSQL:**

- Transactional workloads (OLTP)
- Concurrent writes from multiple clients
- Need full ACID guarantees
- Large-scale production databases

## Troubleshooting

### Installation Fails

Check architecture is supported:

```bash
uname -m
# Should be x86_64 or aarch64/arm64
```

### File Not Found

Ensure file paths are correct:

```bash
# Use absolute paths or paths relative to working directory
duckdb -c "SELECT * FROM '/absolute/path/data.csv'"
duckdb -c "SELECT * FROM './relative/path/data.csv'"
```

### Out of Memory

DuckDB uses memory-mapped files. For large datasets:

```sql
-- Limit memory usage
SET memory_limit='4GB';

-- Use temp directory
SET temp_directory='/tmp';
```

### Slow Queries

DuckDB is optimized for analytics but:

```sql
-- Create indexes for point queries
CREATE INDEX idx_id ON sales(id);

-- Use columnar storage
COPY sales TO 'sales.parquet' (FORMAT PARQUET);
```

## References

- [DuckDB Documentation](https://duckdb.org/docs/)
- [DuckDB Python API](https://duckdb.org/docs/api/python/overview)
- [DuckDB SQL Reference](https://duckdb.org/docs/sql/introduction)
- [DuckDB File Formats](https://duckdb.org/docs/data/overview)

**Related Overlays:**

- `python` - DuckDB Python API (suggested)
- `jupyter` - Interactive analysis (suggested)
- `postgres` - Transactional database
