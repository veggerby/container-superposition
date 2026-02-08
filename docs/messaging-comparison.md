# Messaging System Comparison

This guide helps you choose the right messaging overlay for your development environment.

## Quick Comparison

| Feature | RabbitMQ | Redpanda | NATS |
| --------- | ---------- | ---------- | ------ |
| **Protocol** | AMQP | Kafka API | NATS Protocol |
| **Primary Use Case** | Task queues, RPC | Event streaming | Pub/sub, microservices |
| **Latency** | Low (ms) | Low (ms) | Very low (μs) |
| **Throughput** | High | Very high | Very high |
| **Persistence** | Yes | Yes | Yes (JetStream) |
| **Complexity** | Moderate | Moderate | Simple |
| **Resource Usage** | Moderate | Moderate-High | Low |
| **Management UI** | ✅ Built-in | ✅ Console | ⚠️ HTTP API only |
| **Best For** | Task distribution | Event logs | Real-time updates |

## When to Use RabbitMQ

**Choose RabbitMQ if you need:**

- ✅ Task queues with work distribution
- ✅ Complex routing patterns (exchanges, bindings)
- ✅ Request/reply (RPC) patterns
- ✅ Dead letter queues and retry logic
- ✅ Rich management UI
- ✅ AMQP protocol compatibility

**Use Cases:**

- Background job processing
- Order processing systems
- Email/notification queuing
- Microservices with RPC communication
- Integration with AMQP-based systems

**Example:**

```bash
# Generate with RabbitMQ
container-superposition --stack compose --database rabbitmq --language nodejs
```

## When to Use Redpanda

**Choose Redpanda if you need:**

- ✅ Event streaming (Kafka-compatible)
- ✅ High-throughput log aggregation
- ✅ Event sourcing and CQRS
- ✅ Stream processing
- ✅ Kafka API compatibility without Zookeeper
- ✅ Modern web console UI

**Use Cases:**

- Application event streaming
- Log aggregation from multiple services
- Change data capture (CDC)
- Real-time analytics pipelines
- Replacing Apache Kafka for local development

**Example:**

```bash
# Generate with Redpanda
container-superposition --stack compose --database redpanda --language nodejs
```

**Why Redpanda over Kafka?**

- No Zookeeper required (simpler setup)
- Lower resource usage for local development
- Faster startup times
- 100% Kafka API compatible
- Modern management console included

## When to Use NATS

**Choose NATS if you need:**

- ✅ Lightweight pub/sub messaging
- ✅ Very low latency (microseconds)
- ✅ Simple subject-based routing
- ✅ Request/reply patterns
- ✅ IoT and edge messaging
- ✅ Minimal resource footprint

**Use Cases:**

- Microservices communication
- Real-time updates and notifications
- Command/control distribution
- IoT device messaging
- Service mesh data plane
- Fast request/reply RPC

**Example:**

```bash
# Generate with NATS
container-superposition --stack compose --database nats --language nodejs
```

**Why NATS?**

- Simplest to set up and use
- Lowest resource usage
- Fastest message delivery
- Text-based protocol (easy debugging)
- JetStream adds persistence when needed

## Combining Messaging Systems

You can use multiple messaging systems together for different purposes:

```bash
# RabbitMQ for task queues + NATS for real-time updates
container-superposition --stack compose \
  --database rabbitmq,nats \
  --language nodejs

# Redpanda for event streaming + RabbitMQ for work queues
container-superposition --stack compose \
  --database redpanda,rabbitmq \
  --language nodejs,python
```

**Common Patterns:**

- **Redpanda + RabbitMQ**: Event streaming for analytics + task queues for jobs
- **NATS + RabbitMQ**: Real-time notifications + background processing
- **All three**: Event streaming (Redpanda) + Task queues (RabbitMQ) + Service mesh (NATS)

## Performance Characteristics

### Latency

```txt
NATS:      < 1ms   (fastest - optimized for low latency)
RabbitMQ:  1-5ms   (fast - good for most use cases)
Redpanda:  1-10ms  (optimized for throughput over latency)
```

### Throughput

```txt
Redpanda:  Highest  (millions of messages/sec)
RabbitMQ:  High     (hundreds of thousands/sec)
NATS:      High     (hundreds of thousands/sec)
```

### Memory Usage (Single Instance)

```txt
NATS:      ~50MB   (minimal)
RabbitMQ:  ~200MB  (moderate)
Redpanda:  ~1GB    (higher - includes schema registry, admin API)
```

## Protocol Compatibility

### RabbitMQ

- **Primary**: AMQP 0-9-1
- **Also supports**: MQTT, STOMP (with plugins)
- **Client libraries**: All major languages
- **Interoperability**: Works with other AMQP systems

### Redpanda

- **Primary**: Kafka wire protocol
- **Also includes**: Schema Registry API, HTTP Proxy
- **Client libraries**: All Kafka client libraries work
- **Interoperability**: Drop-in Kafka replacement

### NATS

- **Primary**: NATS protocol (text-based)
- **Also supports**: WebSocket, TLS
- **Client libraries**: All major languages
- **Interoperability**: NATS-specific (not compatible with others)

## Decision Tree

```txt
Need Kafka compatibility?
├─ YES → Redpanda
└─ NO
    ├─ Need complex routing/RPC?
    │   └─ YES → RabbitMQ
    └─ NO
        ├─ Need lowest latency?
        │   └─ YES → NATS
        └─ NO
            ├─ Need task queues?
            │   └─ YES → RabbitMQ
            └─ NO
                └─ Default → NATS (simplest)
```

## Integration Examples

### RabbitMQ + Node.js

```javascript
const amqp = require('amqplib');
const connection = await amqp.connect('amqp://rabbitmq:5672');
const channel = await connection.createChannel();

// Publish to queue
await channel.assertQueue('tasks');
channel.sendToQueue('tasks', Buffer.from('Hello World'));

// Consume from queue
await channel.consume('tasks', (msg) => {
  console.log('Received:', msg.content.toString());
  channel.ack(msg);
});
```

### Redpanda + Node.js

```javascript
const { Kafka } = require('kafkajs');
const kafka = new Kafka({ brokers: ['redpanda:9092'] });

// Producer
const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'events',
  messages: [{ value: 'Hello Redpanda' }]
});

// Consumer
const consumer = kafka.consumer({ groupId: 'my-group' });
await consumer.connect();
await consumer.subscribe({ topic: 'events' });
await consumer.run({
  eachMessage: async ({ message }) => {
    console.log('Received:', message.value.toString());
  }
});
```

### NATS + Node.js

```javascript
const { connect } = require('nats');
const nc = await connect({ servers: 'nats://nats:4222' });

// Publish
nc.publish('updates', 'Hello NATS');

// Subscribe
const sub = nc.subscribe('updates');
for await (const msg of sub) {
  console.log('Received:', msg.string());
}
```

## See Also

- [Observability Workflow](observability-workflow.md) - Monitoring messaging systems
- [RabbitMQ Overlay](../overlays/rabbitmq/README.md)
- [Redpanda Overlay](../overlays/redpanda/README.md)
- [NATS Overlay](../overlays/nats/README.md)
