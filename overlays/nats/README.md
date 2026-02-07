# NATS Overlay

Lightweight, high-performance messaging system for microservices, IoT, and real-time applications.

## Features

- **NATS Server** - Fast, simple pub/sub messaging
- **JetStream** - Persistence, streaming, and exactly-once delivery
- **Monitoring UI** - HTTP monitoring endpoint with JSON stats (port 8222)
- **Low Latency** - Microsecond-level message delivery
- **Simple Protocol** - Text-based protocol, easy debugging
- **Subject-based Messaging** - Hierarchical subject routing with wildcards
- **Docker Compose service** - Runs as separate container
- **Environment configuration** - Customizable via `.env` file

## How It Works

This overlay adds NATS as a Docker Compose service with JetStream enabled for persistence and advanced features. NATS is optimized for speed and simplicity, making it ideal for microservices communication and real-time messaging.

**Architecture:**
```
┌─────────────────────────────────┐
│   Development Container         │
│   - Your application code       │
│   - NATS client libraries       │
│   - Connects to nats:4222       │
└──────────────┬──────────────────┘
               │
               │ Docker network (devnet)
               │
┌──────────────▼──────────────────┐
│   NATS Container                │
│   - Client port (4222)          │
│   - Monitoring (8222)           │
│   - JetStream enabled           │
│   - Message persistence         │
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
# NATS Configuration
NATS_VERSION=latest
NATS_CLIENT_PORT=4222
NATS_HTTP_PORT=8222
NATS_CLUSTER_PORT=6222
```

### Port Configuration

Default ports can be changed via the `--port-offset` option:

```bash
# Offset all ports by 100
container-superposition --port-offset 100

# NATS will be on:
# - Client: 4322 (instead of 4222)
# - Monitoring: 8322 (instead of 8222)
```

## Connection Information

### From Development Container

**NATS Connection:**
```bash
# Hostname: nats (Docker Compose service name)
# Port: 4222
# URL: nats://nats:4222

# Environment variable (pre-configured)
echo $NATS_URL
# Output: nats://nats:4222
```

**Monitoring UI:**
```
http://nats:8222
```

### From Host Machine

**NATS Connection:**
```bash
# Hostname: localhost
# Port: 4222 (or 4222 + port-offset)
# URL: nats://localhost:4222
```

**Monitoring UI:**
```
http://localhost:8222
```

Provides JSON endpoints:
- `/varz` - Server information
- `/connz` - Connection information  
- `/routez` - Route information
- `/subsz` - Subscription information
- `/jsz` - JetStream information

## Common Commands

### Using NATS CLI (via docker exec)

```bash
# Server info
docker exec nats nats-server --version

# Publish a message
docker exec nats nats pub test.subject "Hello NATS"

# Subscribe to subjects
docker exec -it nats nats sub test.subject
docker exec -it nats nats sub "test.>"  # Wildcard

# Request/reply
docker exec -it nats nats reply test.request "response message"
docker exec nats nats request test.request "request message"
```

### JetStream Commands

```bash
# Create a stream
docker exec nats nats stream add mystream \
  --subjects "events.>" \
  --storage file \
  --retention limits

# List streams
docker exec nats nats stream list

# Stream info
docker exec nats nats stream info mystream

# Publish to stream
docker exec nats nats pub events.user.created '{"id": 1, "name": "Alice"}'

# Create consumer
docker exec nats nats consumer add mystream myconsumer \
  --filter events.user.> \
  --deliver all \
  --replay instant

# Consume messages
docker exec -it nats nats consumer next mystream myconsumer

# Delete stream
docker exec nats nats stream rm mystream
```

### Monitoring

```bash
# Get server stats
curl http://localhost:8222/varz | jq

# Check connections
curl http://localhost:8222/connz | jq

# JetStream stats
curl http://localhost:8222/jsz | jq

# Health check
curl http://localhost:8222/healthz
```

## Application Integration

### Node.js Example

Install NATS client:
```bash
npm install nats
```

**Publisher (publisher.js):**
```javascript
const { connect, StringCodec } = require('nats');

async function publish() {
  const nc = await connect({ servers: 'nats://nats:4222' });
  const sc = StringCodec();
  
  // Simple publish
  nc.publish('updates.user', sc.encode('User updated'));
  console.log('Published message');
  
  // Request/reply
  const response = await nc.request('time', sc.encode(''), { timeout: 1000 });
  console.log('Response:', sc.decode(response.data));
  
  await nc.drain();
}

publish().catch(console.error);
```

**Subscriber (subscriber.js):**
```javascript
const { connect, StringCodec } = require('nats');

async function subscribe() {
  const nc = await connect({ servers: 'nats://nats:4222' });
  const sc = StringCodec();
  
  // Subscribe to subject
  const sub = nc.subscribe('updates.>');
  console.log('Listening for messages...');
  
  for await (const msg of sub) {
    console.log(`[${msg.subject}]: ${sc.decode(msg.data)}`);
  }
}

subscribe().catch(console.error);
```

**JetStream Example (stream.js):**
```javascript
const { connect, StringCodec } = require('nats');

async function jetstream() {
  const nc = await connect({ servers: 'nats://nats:4222' });
  const js = nc.jetstream();
  const sc = StringCodec();
  
  // Create stream
  await js.streams.add({
    name: 'EVENTS',
    subjects: ['events.>']
  });
  
  // Publish to stream
  await js.publish('events.user.created', sc.encode('{"id": 1}'));
  console.log('Published to stream');
  
  // Create consumer
  const consumer = await js.consumers.get('EVENTS', 'myconsumer');
  const messages = await consumer.consume();
  
  for await (const msg of messages) {
    console.log(`Received: ${sc.decode(msg.data)}`);
    msg.ack();
  }
  
  await nc.close();
}

jetstream().catch(console.error);
```

### Python Example

Install NATS client:
```bash
pip install nats-py
```

**Publisher (publisher.py):**
```python
import asyncio
from nats.aio.client import Client as NATS

async def publish():
    nc = NATS()
    await nc.connect("nats://nats:4222")
    
    # Simple publish
    await nc.publish("updates.user", b"User updated")
    print("Published message")
    
    # Request/reply
    response = await nc.request("time", b"", timeout=1)
    print(f"Response: {response.data.decode()}")
    
    await nc.close()

if __name__ == '__main__':
    asyncio.run(publish())
```

**Subscriber (subscriber.py):**
```python
import asyncio
from nats.aio.client import Client as NATS

async def message_handler(msg):
    subject = msg.subject
    data = msg.data.decode()
    print(f"[{subject}]: {data}")

async def subscribe():
    nc = NATS()
    await nc.connect("nats://nats:4222")
    
    # Subscribe to subject
    await nc.subscribe("updates.>", cb=message_handler)
    print("Listening for messages...")
    
    # Keep running
    while True:
        await asyncio.sleep(1)

if __name__ == '__main__':
    asyncio.run(subscribe())
```

**JetStream Example (stream.py):**
```python
import asyncio
from nats.aio.client import Client as NATS

async def jetstream():
    nc = NATS()
    await nc.connect("nats://nats:4222")
    js = nc.jetstream()
    
    # Create stream
    await js.add_stream(name="EVENTS", subjects=["events.>"])
    
    # Publish to stream
    await js.publish("events.user.created", b'{"id": 1}')
    print("Published to stream")
    
    # Subscribe to stream
    sub = await js.subscribe("events.>", durable="myconsumer")
    
    async for msg in sub.messages:
        print(f"Received: {msg.data.decode()}")
        await msg.ack()
    
    await nc.close()

if __name__ == '__main__':
    asyncio.run(jetstream())
```

### Go Example

Install NATS client:
```bash
go get github.com/nats-io/nats.go
```

**Publisher (publisher.go):**
```go
package main

import (
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    nc, err := nats.Connect("nats://nats:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // Simple publish
    nc.Publish("updates.user", []byte("User updated"))
    log.Println("Published message")

    // Request/reply
    msg, err := nc.Request("time", []byte(""), 1*time.Second)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Response: %s", string(msg.Data))
}
```

**Subscriber (subscriber.go):**
```go
package main

import (
    "log"
    "runtime"

    "github.com/nats-io/nats.go"
)

func main() {
    nc, err := nats.Connect("nats://nats:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // Subscribe to subject
    sub, err := nc.Subscribe("updates.>", func(msg *nats.Msg) {
        log.Printf("[%s]: %s", msg.Subject, string(msg.Data))
    })
    if err != nil {
        log.Fatal(err)
    }
    defer sub.Unsubscribe()

    log.Println("Listening for messages...")
    runtime.Goexit()
}
```

**JetStream Example (stream.go):**
```go
package main

import (
    "context"
    "log"

    "github.com/nats-io/nats.go"
)

func main() {
    nc, err := nats.Connect("nats://nats:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    js, err := nc.JetStream()
    if err != nil {
        log.Fatal(err)
    }

    // Create stream
    _, err = js.AddStream(&nats.StreamConfig{
        Name:     "EVENTS",
        Subjects: []string{"events.>"},
    })
    if err != nil {
        log.Fatal(err)
    }

    // Publish to stream
    _, err = js.Publish("events.user.created", []byte(`{"id": 1}`))
    if err != nil {
        log.Fatal(err)
    }
    log.Println("Published to stream")

    // Subscribe to stream
    sub, err := js.SubscribeSync("events.>", nats.Durable("myconsumer"))
    if err != nil {
        log.Fatal(err)
    }

    for {
        msg, err := sub.NextMsg(context.Background())
        if err != nil {
            log.Fatal(err)
        }
        log.Printf("Received: %s", string(msg.Data))
        msg.Ack()
    }
}
```

### .NET Example

Install NATS client:
```bash
dotnet add package NATS.Client
```

**Publisher (Publisher.cs):**
```csharp
using NATS.Client;
using System.Text;

var factory = new ConnectionFactory();
using var connection = factory.CreateConnection("nats://nats:4222");

// Simple publish
connection.Publish("updates.user", Encoding.UTF8.GetBytes("User updated"));
Console.WriteLine("Published message");

// Request/reply
var reply = connection.Request("time", Encoding.UTF8.GetBytes(""), 1000);
Console.WriteLine($"Response: {Encoding.UTF8.GetString(reply.Data)}");
```

**Subscriber (Subscriber.cs):**
```csharp
using NATS.Client;
using System.Text;

var factory = new ConnectionFactory();
using var connection = factory.CreateConnection("nats://nats:4222");

// Subscribe to subject
var subscription = connection.SubscribeAsync("updates.>", (sender, args) =>
{
    var subject = args.Message.Subject;
    var data = Encoding.UTF8.GetString(args.Message.Data);
    Console.WriteLine($"[{subject}]: {data}");
});

Console.WriteLine("Listening for messages...");
Console.WriteLine("Press [enter] to exit.");
Console.ReadLine();
```

## Use Cases

- **Microservices Communication** - Fast, simple service-to-service messaging
- **Pub/Sub Messaging** - Broadcast events to multiple subscribers
- **Request/Reply** - Synchronous RPC-style communication
- **Event Streaming** - JetStream provides Kafka-like streaming
- **IoT Messaging** - Low overhead, high performance for edge devices
- **Real-Time Updates** - WebSocket/SSE alternative for live data
- **Command/Control** - Distribute commands to workers
- **Service Discovery** - Dynamic service registration and lookup

**Integrates well with:**
- Language overlays (Node.js, Python, Go, .NET, Java) with NATS clients
- Observability stack (OTEL Collector, Prometheus) for metrics
- Microservice architectures requiring fast messaging

## NATS vs Other Messaging Systems

| Feature | NATS | RabbitMQ | Redpanda/Kafka |
|---------|------|----------|----------------|
| **Latency** | ✅ Microseconds | ⚠️ Milliseconds | ⚠️ Milliseconds |
| **Throughput** | ✅ Very high | ✅ High | ✅ Very high |
| **Resource Usage** | ✅ Minimal | ⚠️ Moderate | ⚠️ High |
| **Complexity** | ✅ Simple | ⚠️ Moderate | ⚠️ Complex |
| **Persistence** | ✅ JetStream | ✅ Native | ✅ Native |
| **Protocol** | Text-based | AMQP (binary) | Binary |
| **Use Case** | Microservices, IoT | Task queues, RPC | Event streaming |
| **Setup** | ✅ Seconds | ⚠️ Minutes | ⚠️ Minutes |

**Recommendation:** Use NATS for microservices and real-time messaging where speed and simplicity matter. Use RabbitMQ for complex routing and task queues. Use Redpanda/Kafka for high-volume event streaming.

## Messaging Patterns

### Publish/Subscribe
```
Publisher → Subject "updates.>" → Subscriber 1
                                → Subscriber 2
                                → Subscriber 3
```
All subscribers receive every message on matching subjects.

### Request/Reply
```
Client → Request "api.user.get" → Service
       ← Reply ─────────────────────┘
```
Synchronous RPC-style communication.

### Queue Groups
```
Publisher → Subject → Queue Group "workers"
                    → Worker 1 (gets msg 1, 3, 5...)
                    → Worker 2 (gets msg 2, 4, 6...)
```
Load balancing across workers.

### Subject Hierarchy
```
events.user.created
events.user.updated
events.order.created
events.order.shipped

Subscribe to:
- "events.user.*" → user events only
- "events.>" → all events
- "events.*.created" → all created events
```

## Troubleshooting

### Service Not Starting

**Check logs:**
```bash
docker logs nats
```

**Common issues:**
- Port conflicts (4222 or 8222 already in use)
- Volume permission issues
- Insufficient disk space for JetStream

### Cannot Connect to NATS

**Verify service is running:**
```bash
docker ps | grep nats
```

**Check health:**
```bash
curl http://localhost:8222/healthz
```

**Test connectivity:**
```bash
# From dev container
curl http://nats:8222/varz
```

### Messages Not Being Received

**Check subscriptions:**
```bash
curl http://localhost:8222/subsz | jq
```

**Verify subject matches:**
NATS subjects are case-sensitive and must match exactly.

**Check queue group:**
If using queue groups, only one member receives each message.

### JetStream Issues

**Check JetStream is enabled:**
```bash
curl http://localhost:8222/jsz | jq
```

**Verify stream exists:**
```bash
docker exec nats nats stream list
```

**Check consumer status:**
```bash
docker exec nats nats consumer info STREAMNAME CONSUMERNAME
```

### Performance Issues

**Monitor server stats:**
```bash
curl http://localhost:8222/varz | jq
```

**Check memory usage:**
```bash
docker stats nats
```

**Review slow consumers:**
```bash
curl http://localhost:8222/connz?state=slow_consumer | jq
```

## Security Considerations

⚠️ **Development Configuration:**
- No authentication enabled by default
- Suitable for local development only
- Do not expose ports publicly

**Production Recommendations:**
- Enable user authentication
- Use TLS for encryption
- Configure authorization rules
- Enable accounts for multi-tenancy
- Monitor security logs
- Regularly update NATS version

**Enabling Authentication (production):**
```bash
# Create nats.conf
authentication {
  users = [
    {user: "app", password: "secret"}
  ]
}
```

See [NATS Security Documentation](https://docs.nats.io/running-a-nats-service/configuration/securing_nats) for details.

## Related Overlays

**Alternative Messaging Systems:**
- `rabbitmq` - AMQP message broker (better for complex routing)
- `redpanda` - Kafka-compatible streaming (better for high-volume logs)

**Complementary Overlays:**
- Language overlays - Application development with NATS clients
- `otel-collector` - Distributed tracing and metrics
- `prometheus` - Metrics collection from NATS
- `grafana` - Visualization of messaging metrics

## Additional Resources

- [Official NATS Documentation](https://docs.nats.io/)
- [NATS by Example](https://natsbyexample.com/)
- [JetStream Documentation](https://docs.nats.io/nats-concepts/jetstream)
- [NATS Client Libraries](https://docs.nats.io/using-nats/developer)
- [NATS Design Philosophy](https://docs.nats.io/nats-concepts/overview)

## Notes

- NATS is written in Go for high performance
- Subject names are hierarchical and case-sensitive
- Wildcards: `*` matches one token, `>` matches multiple tokens
- JetStream provides persistence and exactly-once delivery
- Core NATS is fire-and-forget (at-most-once delivery)
- Maximum message size is 1 MB by default
- Supports both binary and JSON message formats
- Monitoring endpoint provides JSON stats
- Can run in cluster mode for high availability
- Very low memory and CPU footprint
