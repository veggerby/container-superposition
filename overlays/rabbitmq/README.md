# RabbitMQ Overlay

RabbitMQ message broker for task queues, pub/sub messaging, and microservices communication.

## Features

- **RabbitMQ 3** - Latest stable version with AMQP protocol support
- **Management UI** - Web-based interface for monitoring and management (port 15672)
- **Message persistence** - Optional message and queue persistence
- **Docker Compose service** - Runs as separate container
- **Pre-configured** - Ready to use with default vhost and credentials
- **Environment configuration** - Customizable via `.env` file

## How It Works

This overlay adds RabbitMQ as a Docker Compose service that runs alongside your development container. RabbitMQ provides message queuing and routing capabilities using the AMQP protocol.

**Architecture:**

```mermaid
graph TD
    A[Development Container<br/>Your application code<br/>AMQP client libraries<br/>Connects to rabbitmq:5672] -->|Docker network devnet| B[RabbitMQ Container<br/>AMQP server 5672<br/>Management UI 15672<br/>Message/queue persistence]
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
# RabbitMQ Configuration
RABBITMQ_VERSION=3-management
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
```

⚠️ **Security Note:** Default credentials (guest/guest) are suitable for development only. Change these for production environments.

### Port Configuration

Default ports can be changed via the `--port-offset` option:

```bash
# Offset all ports by 100
container-superposition --port-offset 100

# RabbitMQ will be on:
# - AMQP: 5772 (instead of 5672)
# - Management UI: 15772 (instead of 15672)
```

## Connection Information

### From Development Container

**AMQP Connection:**

```bash
# Hostname: rabbitmq (Docker Compose service name)
# Port: 5672
# Username: guest (or value from .env)
# Password: guest (or value from .env)
# Virtual host: / (default)

# Connection string
amqp://guest:guest@rabbitmq:5672/
```

**Management UI:**

```
http://rabbitmq:15672
```

### From Host Machine

**AMQP Connection:**

```bash
# Hostname: localhost
# Port: 5672 (or 5672 + port-offset)

# Connection string
amqp://guest:guest@localhost:5672/
```

**Management UI:**

```
http://localhost:15672
```

Login with credentials from `.env` (default: guest/guest)

## Common Commands

### Using RabbitMQ Management UI

The Management UI provides:

- Queue and exchange monitoring
- Message routing visualization
- Connection and channel statistics
- Message publishing and consumption
- User and permission management

Access it at: `http://localhost:15672`

### Using CLI (via docker exec)

```bash
# List queues
docker exec rabbitmq rabbitmqctl list_queues

# List exchanges
docker exec rabbitmq rabbitmqctl list_exchanges

# List bindings
docker exec rabbitmq rabbitmqctl list_bindings

# Check cluster status
docker exec rabbitmq rabbitmqctl cluster_status

# Check node status
docker exec rabbitmq rabbitmqctl status
```

### Creating Queues and Exchanges

```bash
# Declare a queue
docker exec rabbitmq rabbitmqadmin declare queue name=my-queue durable=true

# Declare an exchange
docker exec rabbitmq rabbitmqadmin declare exchange name=my-exchange type=direct

# Bind queue to exchange
docker exec rabbitmq rabbitmqadmin declare binding source=my-exchange destination=my-queue routing_key=my-key
```

## Application Integration

### Node.js Example

Install the AMQP library:

```bash
npm install amqplib
```

**Publisher (producer.js):**

```javascript
const amqp = require('amqplib');

async function publishMessage() {
    const connection = await amqp.connect('amqp://guest:guest@rabbitmq:5672/');
    const channel = await connection.createChannel();

    const queue = 'task_queue';
    const message = 'Hello RabbitMQ!';

    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(message), { persistent: true });

    console.log(`Sent: ${message}`);

    setTimeout(() => {
        connection.close();
    }, 500);
}

publishMessage().catch(console.error);
```

**Consumer (consumer.js):**

```javascript
const amqp = require('amqplib');

async function consumeMessages() {
    const connection = await amqp.connect('amqp://guest:guest@rabbitmq:5672/');
    const channel = await connection.createChannel();

    const queue = 'task_queue';

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);

    console.log('Waiting for messages...');

    channel.consume(queue, (msg) => {
        console.log(`Received: ${msg.content.toString()}`);
        // Acknowledge message
        channel.ack(msg);
    });
}

consumeMessages().catch(console.error);
```

### Python Example

Install the AMQP library:

```bash
pip install pika
```

**Publisher (publisher.py):**

```python
import pika

# Connect to RabbitMQ
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='rabbitmq', credentials=pika.PlainCredentials('guest', 'guest'))
)
channel = connection.channel()

# Declare queue
channel.queue_declare(queue='task_queue', durable=True)

# Publish message
message = 'Hello RabbitMQ!'
channel.basic_publish(
    exchange='',
    routing_key='task_queue',
    body=message,
    properties=pika.BasicProperties(delivery_mode=2)  # Make message persistent
)

print(f"Sent: {message}")
connection.close()
```

**Consumer (consumer.py):**

```python
import pika

def callback(ch, method, properties, body):
    print(f"Received: {body.decode()}")
    ch.basic_ack(delivery_tag=method.delivery_tag)

# Connect to RabbitMQ
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='rabbitmq', credentials=pika.PlainCredentials('guest', 'guest'))
)
channel = connection.channel()

# Declare queue
channel.queue_declare(queue='task_queue', durable=True)
channel.basic_qos(prefetch_count=1)

# Start consuming
print('Waiting for messages...')
channel.basic_consume(queue='task_queue', on_message_callback=callback)
channel.start_consuming()
```

### .NET Example

Install the RabbitMQ client:

```bash
dotnet add package RabbitMQ.Client
```

**Publisher (Publisher.cs):**

```csharp
using RabbitMQ.Client;
using System.Text;

var factory = new ConnectionFactory
{
    HostName = "rabbitmq",
    UserName = "guest",
    Password = "guest"
};

using var connection = factory.CreateConnection();
using var channel = connection.CreateModel();

channel.QueueDeclare(
    queue: "task_queue",
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: null
);

var message = "Hello RabbitMQ!";
var body = Encoding.UTF8.GetBytes(message);

var properties = channel.CreateBasicProperties();
properties.Persistent = true;

channel.BasicPublish(
    exchange: "",
    routingKey: "task_queue",
    basicProperties: properties,
    body: body
);

Console.WriteLine($"Sent: {message}");
```

**Consumer (Consumer.cs):**

```csharp
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;

var factory = new ConnectionFactory
{
    HostName = "rabbitmq",
    UserName = "guest",
    Password = "guest"
};

using var connection = factory.CreateConnection();
using var channel = connection.CreateModel();

channel.QueueDeclare(
    queue: "task_queue",
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: null
);

channel.BasicQos(prefetchSize: 0, prefetchCount: 1, global: false);

Console.WriteLine("Waiting for messages...");

var consumer = new EventingBasicConsumer(channel);
consumer.Received += (model, ea) =>
{
    var body = ea.Body.ToArray();
    var message = Encoding.UTF8.GetString(body);
    Console.WriteLine($"Received: {message}");

    channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
};

channel.BasicConsume(queue: "task_queue", autoAck: false, consumer: consumer);

Console.WriteLine("Press [enter] to exit.");
Console.ReadLine();
```

### Go Example

Install the AMQP library:

```bash
go get github.com/rabbitmq/amqp091-go
```

**Publisher (publisher.go):**

```go
package main

import (
    "context"
    "log"
    "time"

    amqp "github.com/rabbitmq/amqp091-go"
)

func main() {
    conn, err := amqp.Dial("amqp://guest:guest@rabbitmq:5672/")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    ch, err := conn.Channel()
    if err != nil {
        log.Fatal(err)
    }
    defer ch.Close()

    q, err := ch.QueueDeclare(
        "task_queue", // name
        true,         // durable
        false,        // delete when unused
        false,        // exclusive
        false,        // no-wait
        nil,          // arguments
    )
    if err != nil {
        log.Fatal(err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    body := "Hello RabbitMQ!"
    err = ch.PublishWithContext(ctx,
        "",     // exchange
        q.Name, // routing key
        false,  // mandatory
        false,  // immediate
        amqp.Publishing{
            DeliveryMode: amqp.Persistent,
            ContentType:  "text/plain",
            Body:         []byte(body),
        })
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Sent: %s", body)
}
```

**Consumer (consumer.go):**

```go
package main

import (
    "log"

    amqp "github.com/rabbitmq/amqp091-go"
)

func main() {
    conn, err := amqp.Dial("amqp://guest:guest@rabbitmq:5672/")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    ch, err := conn.Channel()
    if err != nil {
        log.Fatal(err)
    }
    defer ch.Close()

    q, err := ch.QueueDeclare(
        "task_queue", // name
        true,         // durable
        false,        // delete when unused
        false,        // exclusive
        false,        // no-wait
        nil,          // arguments
    )
    if err != nil {
        log.Fatal(err)
    }

    err = ch.Qos(
        1,     // prefetch count
        0,     // prefetch size
        false, // global
    )
    if err != nil {
        log.Fatal(err)
    }

    msgs, err := ch.Consume(
        q.Name, // queue
        "",     // consumer
        false,  // auto-ack
        false,  // exclusive
        false,  // no-local
        false,  // no-wait
        nil,    // args
    )
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Waiting for messages...")

    forever := make(chan bool)

    go func() {
        for d := range msgs {
            log.Printf("Received: %s", d.Body)
            d.Ack(false)
        }
    }()

    <-forever
}
```

## Use Cases

- **Task Queues** - Distribute time-consuming tasks across multiple workers
- **Pub/Sub Messaging** - Broadcast messages to multiple consumers
- **Microservices Communication** - Decouple services with asynchronous messaging
- **Work Distribution** - Load balancing across worker processes
- **Event-Driven Architecture** - React to events across service boundaries
- **Request/Reply Patterns** - RPC-style communication with message queuing
- **Message Routing** - Complex routing with exchanges and bindings

**Integrates well with:**

- Language overlays (Node.js, Python, .NET, Go, Java) for client applications
- Observability stack (OTEL Collector, Prometheus) for message tracing and metrics
- Microservice architectures with multiple language overlays

## Messaging Patterns

### Work Queue Pattern

```
Publisher → Queue → Worker1
                  → Worker2
                  → Worker3
```

Multiple workers compete for tasks from a single queue.

### Publish/Subscribe Pattern

```
Publisher → Fanout Exchange → Queue1 → Consumer1
                            → Queue2 → Consumer2
                            → Queue3 → Consumer3
```

All subscribers receive every message.

### Routing Pattern

```
Publisher → Direct Exchange → Queue1 (info) → Consumer1
                            → Queue2 (error) → Consumer2
```

Messages are routed based on routing keys.

### Topics Pattern

```
Publisher → Topic Exchange → Queue1 (*.critical) → Consumer1
                          → Queue2 (kern.*)     → Consumer2
```

Pattern-based routing with wildcards.

## Troubleshooting

### Service Not Starting

**Check logs:**

```bash
docker logs rabbitmq
```

**Common issues:**

- Port conflicts (5672 or 15672 already in use)
- Insufficient memory
- Volume permission issues

### Cannot Connect to RabbitMQ

**Verify service is running:**

```bash
docker ps | grep rabbitmq
```

**Check network connectivity:**

```bash
# From dev container
curl -u guest:guest http://rabbitmq:15672/api/overview
```

**Verify credentials:**
Check `.env` file for correct username/password

### Management UI Not Accessible

**Ensure management plugin is enabled:**
The `rabbitmq:3-management-alpine` image includes the management plugin by default.

**Check port forwarding:**
Verify port 15672 is forwarded in your devcontainer configuration.

### Messages Not Being Consumed

**Check consumer connection:**

- Verify queue name matches exactly
- Ensure consumer is acknowledging messages
- Check prefetch count settings

**Inspect queue in Management UI:**

- View message rates
- Check consumer count
- Review message status (ready, unacked)

## Security Considerations

⚠️ **Default Configuration Warning:**

- Default credentials (guest/guest) are for development only
- Guest user can only connect from localhost by default
- Change credentials for production environments

**Best Practices:**

- Use strong passwords in production
- Create separate users with limited permissions
- Enable TLS for production deployments
- Use virtual hosts to isolate applications
- Regularly rotate credentials
- Monitor failed authentication attempts

**Creating a new user:**

```bash
# Create user
docker exec rabbitmq rabbitmqctl add_user myuser mypassword

# Set permissions
docker exec rabbitmq rabbitmqctl set_permissions -p / myuser ".*" ".*" ".*"

# Set user tags (optional)
docker exec rabbitmq rabbitmqctl set_user_tags myuser administrator
```

## Related Overlays

**Alternative Messaging Systems:**

- `redpanda` - Kafka-compatible event streaming (better for high-throughput logs)
- `nats` - Lightweight pub/sub messaging (faster but fewer features)

**Complementary Overlays:**

- Language overlays - Application development with AMQP clients
- `otel-collector` - Distributed tracing of message flows
- `prometheus` - Metrics collection from RabbitMQ
- `grafana` - Visualization of message queue metrics

## Additional Resources

- [Official RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [AMQP Protocol](https://www.rabbitmq.com/tutorials/amqp-concepts.html)
- [RabbitMQ Management HTTP API](https://www.rabbitmq.com/management.html)
- [Client Libraries](https://www.rabbitmq.com/devtools.html)

## Notes

- RabbitMQ uses the AMQP 0-9-1 protocol
- Supports multiple messaging patterns (queues, exchanges, bindings)
- Messages can be persistent or transient
- Provides message acknowledgments and publisher confirms
- Built-in clustering and high availability features
- Management UI accessible at port 15672
- Default virtual host is `/`
- Maximum message size is 128 MB by default
