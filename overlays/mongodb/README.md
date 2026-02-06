# MongoDB Overlay

MongoDB document database with Mongo Express web UI for development and testing.

## Features

- **MongoDB 8** - Latest stable version with modern document store features
- **Mongo Express** - Web-based MongoDB admin interface (port 8081)
- **mongosh** - Modern MongoDB Shell for database operations
- **Docker Compose services** - Runs as separate containers
- **Persistent storage** - Data and config survive container restarts
- **Health checks** - Ensures services are ready before use
- **VS Code Extension:** MongoDB for VS Code (mongodb.mongodb-vscode)

## How It Works

This overlay adds MongoDB 8 and Mongo Express as separate Docker Compose services. The database runs in its own container and is accessible from your development container via the hostname `mongodb`.

**Architecture:**
```
┌─────────────────────────────────┐
│   Development Container         │
│   - Your application code       │
│   - mongosh client              │
│   - Connects to mongodb:27017   │
└──────────────┬──────────────────┘
               │
               │ Docker network (devnet)
               │
┌──────────────▼──────────────────┐
│   MongoDB Container             │
│   - MongoDB 8 server            │
│   - Port 27017                  │
│   - Data volumes                │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Mongo Express Container       │
│   - Web UI on port 8081         │
│   - Connected to MongoDB        │
└─────────────────────────────────┘
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
# MongoDB Configuration
MONGODB_VERSION=8
MONGODB_USER=root
MONGODB_PASSWORD=example
MONGODB_PORT=27017

# Mongo Express Configuration
MONGO_EXPRESS_VERSION=latest
MONGO_EXPRESS_PORT=8081
```

⚠️ **SECURITY:** Change the default password for production use. The `.env` file is git-ignored.

### Port Configuration

Default ports can be changed via the `--port-offset` option when initializing:

```bash
# Offset all ports by 100
container-superposition --port-offset 100

# MongoDB will be on 27117, Mongo Express on 8181
```

## Connection Information

### From Development Container

```bash
# Hostname: mongodb (Docker Compose service name)
# Port: 27017
# Username: root (or value from .env)
# Password: example (or value from .env)

# Connection string
mongodb://root:example@mongodb:27017/
```

### From Host Machine

```bash
# Hostname: localhost
# Port: 27017 (or 27017 + port-offset)
# Username: root
# Password: example

# Connection string
mongodb://root:example@localhost:27017/
```

### Mongo Express Web UI

Access the web interface from your host machine:

```
http://localhost:8081
```

(or port 8081 + port-offset if using offset)

## Common Commands

### Using mongosh (MongoDB Shell)

```bash
# Connect to MongoDB
mongosh --host mongodb --port 27017 -u root -p example

# Or with connection string
mongosh "mongodb://root:example@mongodb:27017/"

# Connect to specific database
mongosh "mongodb://root:example@mongodb:27017/myapp"

# Run command directly
mongosh --host mongodb -u root -p example --eval "db.version()"
```

### Database Operations

```bash
# Show databases
mongosh mongodb://root:example@mongodb:27017/ --eval "show dbs"

# Create/use database
mongosh mongodb://root:example@mongodb:27017/ --eval "use myapp"

# Show collections
mongosh mongodb://root:example@mongodb:27017/myapp --eval "show collections"

# Insert document
mongosh mongodb://root:example@mongodb:27017/myapp --eval 'db.users.insertOne({name: "Alice", email: "alice@example.com"})'

# Query documents
mongosh mongodb://root:example@mongodb:27017/myapp --eval 'db.users.find()'

# Drop database
mongosh mongodb://root:example@mongodb:27017/ --eval "db.dropDatabase()"
```

### Container Management

```bash
# Check service status
docker-compose ps

# View MongoDB logs
docker-compose logs -f mongodb

# View Mongo Express logs
docker-compose logs -f mongo-express

# Restart services
docker-compose restart mongodb mongo-express

# Stop services
docker-compose stop mongodb mongo-express

# Remove data (WARNING: destroys all data)
docker-compose down -v
```

## Application Integration

### Node.js

```bash
# Install MongoDB driver
npm install mongodb

# Or use Mongoose ODM
npm install mongoose
```

```javascript
// Using native MongoDB driver
const { MongoClient } = require('mongodb');

const url = 'mongodb://root:example@mongodb:27017/';
const client = new MongoClient(url);

async function main() {
  await client.connect();
  const db = client.db('myapp');
  const collection = db.collection('users');
  
  // Insert
  await collection.insertOne({ name: 'Alice', email: 'alice@example.com' });
  
  // Find
  const users = await collection.find({}).toArray();
  console.log(users);
  
  await client.close();
}

main();
```

```javascript
// Using Mongoose
const mongoose = require('mongoose');

mongoose.connect('mongodb://root:example@mongodb:27017/myapp');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String
});

const User = mongoose.model('User', UserSchema);

// Create
const user = new User({ name: 'Alice', email: 'alice@example.com' });
await user.save();

// Find
const users = await User.find();
```

### Python

```bash
# Install PyMongo driver
pip install pymongo
```

```python
from pymongo import MongoClient

# Connect
client = MongoClient('mongodb://root:example@mongodb:27017/')
db = client.myapp
collection = db.users

# Insert
collection.insert_one({'name': 'Alice', 'email': 'alice@example.com'})

# Find
users = collection.find()
for user in users:
    print(user)

# Close
client.close()
```

### .NET

```bash
# Install MongoDB driver
dotnet add package MongoDB.Driver
```

```csharp
using MongoDB.Driver;
using MongoDB.Bson;

var client = new MongoClient("mongodb://root:example@mongodb:27017/");
var database = client.GetDatabase("myapp");
var collection = database.GetCollection<BsonDocument>("users");

// Insert
var document = new BsonDocument
{
    { "name", "Alice" },
    { "email", "alice@example.com" }
};
await collection.InsertOneAsync(document);

// Find
var users = await collection.Find(new BsonDocument()).ToListAsync();
```

### Go

```bash
# Install MongoDB driver
go get go.mongodb.org/mongo-driver/mongo
```

```go
package main

import (
    "context"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
    ctx := context.Background()
    
    client, _ := mongo.Connect(ctx, options.Client().
        ApplyURI("mongodb://root:example@mongodb:27017/"))
    defer client.Disconnect(ctx)
    
    collection := client.Database("myapp").Collection("users")
    
    // Insert
    collection.InsertOne(ctx, bson.M{
        "name":  "Alice",
        "email": "alice@example.com",
    })
    
    // Find
    cursor, _ := collection.Find(ctx, bson.M{})
    defer cursor.Close(ctx)
    
    for cursor.Next(ctx) {
        var result bson.M
        cursor.Decode(&result)
        println(result)
    }
}
```

## Use Cases

- **Document-oriented applications** - JSON-based data with flexible schemas
- **Node.js/Python backends** - Native JSON support, popular in MEAN/MERN stacks
- **Rapid prototyping** - No rigid schema required, fast iteration
- **Real-time applications** - Change streams for reactive updates
- **Content management** - Flexible document structure for CMS
- **Catalog/inventory systems** - Nested data and arrays

**Integrates well with:**
- Node.js, Python, .NET, Go (application development)
- Grafana (database metrics visualization)
- OTEL Collector (query performance monitoring)

## Troubleshooting

### Issue: Cannot connect to MongoDB

**Symptoms:**
- Connection refused errors
- Timeout when connecting

**Solution:**
```bash
# Check if service is running
docker-compose ps

# Check MongoDB logs
docker-compose logs mongodb

# Wait for health check to pass
docker-compose ps | grep mongodb
# Look for "healthy" status

# Test connection
mongosh --host mongodb --port 27017 -u root -p example --eval "db.adminCommand('ping')"
```

### Issue: Authentication failed

**Symptoms:**
- "Authentication failed" error
- Invalid credentials

**Solution:**
```bash
# Verify credentials in .env file
cat .devcontainer/.env

# Ensure credentials match in connection string
# mongodb://USERNAME:PASSWORD@mongodb:27017/

# If changing credentials, recreate containers
docker-compose down -v
docker-compose up -d
```

### Issue: Mongo Express not accessible

**Symptoms:**
- Cannot access http://localhost:8081
- Page not loading

**Solution:**
```bash
# Check Mongo Express logs
docker-compose logs mongo-express

# Verify MongoDB is healthy first
docker-compose ps mongodb

# Restart Mongo Express
docker-compose restart mongo-express

# Check port forwarding in VS Code
# Dev Containers: Forward Ports... (port 8081)
```

### Issue: Data not persisting

**Symptoms:**
- Data lost after container restart

**Solution:**
```bash
# Verify volumes exist
docker volume ls | grep mongodb

# Check volume mounts in docker-compose.yml
docker-compose config

# Don't use 'docker-compose down -v' unless you want to delete data
# Use 'docker-compose down' or 'docker-compose stop' instead
```

## Security Considerations

⚠️ **Development-only defaults:**

- Default credentials (`root/example`) are intentionally weak for development
- Mongo Express has authentication disabled (`ME_CONFIG_BASICAUTH: false`)
- MongoDB is exposed on host port (accessible from host machine)

**For production:**

1. **Change credentials:**
   ```bash
   # Use strong passwords
   MONGODB_PASSWORD=<strong-password>
   ```

2. **Enable Mongo Express authentication:**
   ```yaml
   # In docker-compose.yml
   ME_CONFIG_BASICAUTH: true
   ME_CONFIG_BASICAUTH_USERNAME: admin
   ME_CONFIG_BASICAUTH_PASSWORD: <strong-password>
   ```

3. **Restrict network access:**
   - Don't expose ports publicly
   - Use firewall rules
   - Consider TLS/SSL for connections

4. **Use authentication databases:**
   ```bash
   mongosh "mongodb://user:password@mongodb:27017/myapp?authSource=admin"
   ```

## Related Overlays

- **nodejs** - Node.js with native MongoDB support via drivers
- **python** - Python with PyMongo driver
- **dotnet** - .NET with MongoDB.Driver
- **grafana** - Visualize MongoDB metrics
- **otel-collector** - Monitor MongoDB query performance

## Additional Resources

- [Official MongoDB Documentation](https://www.mongodb.com/docs/)
- [MongoDB Shell (mongosh)](https://www.mongodb.com/docs/mongodb-shell/)
- [Mongo Express](https://github.com/mongo-express/mongo-express)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [MongoDB Drivers](https://www.mongodb.com/docs/drivers/)

## Notes

- MongoDB uses the hostname `mongodb` (the service name) for container-to-container communication
- Data is persisted in Docker volumes (`mongodb-data` and `mongodb-config`)
- Mongo Express provides a convenient web UI for database management and debugging
- Default configuration uses MongoDB 8 which includes the latest features and performance improvements
- Health checks ensure MongoDB is ready before Mongo Express starts
