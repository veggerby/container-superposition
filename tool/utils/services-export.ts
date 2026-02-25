/**
 * Export utilities for generating service reference documentation
 */

import * as fs from 'fs';
import * as path from 'path';
import type { OverlayMetadata, NormalizedPort } from '../schema/types.js';
import {
    normalizePort,
    generateConnectionString,
    getDefaultConnectionStringTemplate,
    generateUrl,
} from './port-utils.js';
import { applyPortOffsetToEnv } from './merge.js';

/**
 * Code connection examples per service type
 * Keys correspond to the service field in port metadata / overlay id
 */
const SERVICE_CODE_EXAMPLES: Record<string, { nodejs?: string; python?: string }> = {
    postgres: {
        nodejs: `const { Client } = require('pg');
const client = new Client({
  host: 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});`,
        python: `import os
import psycopg2
conn = psycopg2.connect(
  host="postgres",
  port=int(os.getenv("POSTGRES_PORT", "5432")),
  database=os.getenv("POSTGRES_DB"),
  user=os.getenv("POSTGRES_USER"),
  password=os.getenv("POSTGRES_PASSWORD")
)`,
    },
    redis: {
        nodejs: `const redis = require('redis');
const client = redis.createClient({
  url: \`redis://redis:\${process.env.REDIS_PORT || 6379}\`
});`,
        python: `import os
import redis
r = redis.Redis(
  host='redis',
  port=int(os.getenv("REDIS_PORT", "6379"))
)`,
    },
    mongodb: {
        nodejs: `const { MongoClient } = require('mongodb');
const client = new MongoClient(
  \`mongodb://\${process.env.MONGO_USER}:\${process.env.MONGO_PASSWORD}@mongodb:\${process.env.MONGO_PORT || 27017}/\${process.env.MONGO_DB}\`
);`,
        python: `import os
from pymongo import MongoClient
client = MongoClient(
  host='mongodb',
  port=int(os.getenv("MONGO_PORT", "27017"))
)`,
    },
    mysql: {
        nodejs: `const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'mysql',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});`,
        python: `import os
import mysql.connector
conn = mysql.connector.connect(
  host="mysql",
  user=os.getenv("MYSQL_USER"),
  password=os.getenv("MYSQL_PASSWORD"),
  database=os.getenv("MYSQL_DATABASE")
)`,
    },
    rabbitmq: {
        nodejs: `(async () => {
  const amqp = require('amqplib');
  const conn = await amqp.connect('amqp://rabbitmq:5672');
  // use conn here
})();`,
        python: `import pika
connection = pika.BlockingConnection(
  pika.ConnectionParameters('rabbitmq')
)`,
    },
    nats: {
        nodejs: `(async () => {
  const { connect } = require('nats');
  const nc = await connect({ servers: 'nats://nats:4222' });
  // use nc here
})();`,
        python: `import asyncio
import nats

async def main():
    nc = await nats.connect("nats://nats:4222")

asyncio.run(main())`,
    },
};

/**
 * Common CLI commands per service type
 */
const SERVICE_COMMANDS: Record<string, Array<{ name: string; command: string }>> = {
    postgres: [
        {
            name: 'Connect with psql',
            command: 'psql -h postgres -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-devdb}',
        },
        {
            name: 'List databases',
            command: "psql -h postgres -U ${POSTGRES_USER:-postgres} -c '\\l'",
        },
        {
            name: 'Dump database',
            command:
                'pg_dump -h postgres -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-devdb} > backup.sql',
        },
        {
            name: 'Test connection',
            command: "psql -h postgres -U ${POSTGRES_USER:-postgres} -c 'SELECT version();'",
        },
    ],
    redis: [
        { name: 'Connect with redis-cli', command: 'redis-cli -h redis' },
        { name: 'Test connection', command: 'redis-cli -h redis ping' },
        { name: 'Monitor commands', command: 'redis-cli -h redis monitor' },
        { name: 'List all keys', command: 'redis-cli -h redis keys "*"' },
    ],
    mongodb: [
        {
            name: 'Connect with mongosh',
            command: 'mongosh mongodb://mongodb:${MONGO_PORT:-27017}/${MONGO_DB:-devdb}',
        },
        { name: 'List databases', command: 'mongosh --eval "show dbs"' },
    ],
    mysql: [
        {
            name: 'Connect with mysql client',
            command: 'mysql -h mysql -u ${MYSQL_USER:-root} -p',
        },
        {
            name: 'List databases',
            command: 'mysql -h mysql -u ${MYSQL_USER:-root} -p -e "SHOW DATABASES;"',
        },
    ],
    grafana: [
        {
            name: 'Check health',
            command: 'curl http://localhost:${GRAFANA_PORT:-3000}/api/health',
        },
        {
            name: 'List datasources (API)',
            command: 'curl -u admin:admin http://localhost:${GRAFANA_PORT:-3000}/api/datasources',
        },
    ],
    prometheus: [
        {
            name: 'Check targets',
            command: 'curl http://localhost:${PROMETHEUS_PORT:-9090}/api/v1/targets',
        },
        {
            name: 'Query metrics',
            command: 'curl "http://localhost:${PROMETHEUS_PORT:-9090}/api/v1/query?query=up"',
        },
    ],
    jaeger: [
        {
            name: 'Check health',
            command: 'curl http://localhost:${JAEGER_UI_PORT:-16686}/api/services',
        },
    ],
    rabbitmq: [
        {
            name: 'List queues',
            command: 'rabbitmqctl list_queues',
        },
        {
            name: 'Open management UI',
            command: 'open http://localhost:${RABBITMQ_MANAGEMENT_PORT:-15672}',
        },
    ],
};

/**
 * Credentials info per service (for Quick Links table)
 */
const SERVICE_CREDENTIALS: Record<string, string> = {
    grafana: '${GRAFANA_ADMIN_USER:-admin} / ${GRAFANA_ADMIN_PASSWORD:-admin}',
    prometheus: '(no auth)',
    jaeger: '(no auth)',
    postgres: '${POSTGRES_USER:-postgres} / ${POSTGRES_PASSWORD:-postgres}',
    redis: '(no auth by default)',
    mongodb: '${MONGO_USER} / ${MONGO_PASSWORD}',
    mysql: '${MYSQL_USER} / ${MYSQL_PASSWORD}',
    rabbitmq: '${RABBITMQ_DEFAULT_USER:-guest} / ${RABBITMQ_DEFAULT_PASS:-guest}',
    minio: '${MINIO_ROOT_USER:-minioadmin} / ${MINIO_ROOT_PASSWORD:-minioadmin}',
};

/**
 * Generate the services.md reference document
 */
export function generateServicesMarkdown(
    overlays: OverlayMetadata[],
    portOffset: number,
    envVars: Record<string, string>,
    generatedAt: string = new Date().toISOString()
): string {
    const serviceOverlays = overlays.filter((o) => o.ports && o.ports.length > 0);

    if (serviceOverlays.length === 0) {
        return '';
    }

    const lines: string[] = [];

    lines.push('# Services Reference');
    lines.push('');
    lines.push('> Auto-generated by Container Superposition');
    lines.push('');

    // Build normalized port map
    const overlayPorts: Array<{ overlay: OverlayMetadata; ports: NormalizedPort[] }> = [];
    for (const overlay of serviceOverlays) {
        const normalizedPorts = (overlay.ports || []).map((p) =>
            normalizePort(p, portOffset, overlay.id)
        );
        overlayPorts.push({ overlay, ports: normalizedPorts });
    }

    // ─── Quick Links Table ───────────────────────────────────────────
    lines.push('## Quick Links');
    lines.push('');
    lines.push('| Service | URL / Connection | Credentials |');
    lines.push('|---------|-----------------|-------------|');

    for (const { overlay, ports } of overlayPorts) {
        for (const port of ports) {
            const url = generateUrl(port);
            const service = port.service || overlay.id;
            const template =
                typeof (overlay.ports || [])[0] === 'object' &&
                (overlay.ports![0] as any).connectionStringTemplate
                    ? (overlay.ports![0] as any).connectionStringTemplate
                    : getDefaultConnectionStringTemplate(service, port.protocol);

            let connDisplay = url || '';
            if (!connDisplay && template) {
                connDisplay = generateConnectionString(template, port, envVars);
            }
            if (!connDisplay) {
                connDisplay = `${service}:${port.actualPort}`;
            }

            const creds = SERVICE_CREDENTIALS[service] || '(see .env.example)';
            const label = overlay.name;
            lines.push(`| ${label} | \`${connDisplay}\` | ${creds} |`);
        }
    }

    lines.push('');

    // ─── Per-Service Details ─────────────────────────────────────────
    lines.push('## Service Details');
    lines.push('');

    for (const { overlay, ports } of overlayPorts) {
        lines.push(`### ${overlay.name}`);
        lines.push('');

        const primaryPort = ports[0];
        const service = primaryPort.service || overlay.id;
        const url = generateUrl(primaryPort);

        if (url) {
            // HTTP service
            lines.push('**Access:**');
            lines.push(`- UI: ${url}`);
            const creds = SERVICE_CREDENTIALS[service];
            if (creds) {
                lines.push(`- Credentials: \`${creds}\``);
            }
        } else {
            // TCP/database service
            lines.push('**Connection Information:**');
            lines.push(`- Host (from container): \`${service}\``);
            lines.push(`- Host (from host): \`localhost\``);
            lines.push(`- Port: \`${primaryPort.actualPort}\``);
            if (primaryPort.description) {
                lines.push(`- ${primaryPort.description}`);
            }
        }

        lines.push('');

        // Connection strings — emit both container (service name) and host (localhost) variants
        const connectionStrings: string[] = [];
        for (const port of ports) {
            const portService = port.service || overlay.id;
            const tmpl =
                typeof (overlay.ports || [])[ports.indexOf(port)] === 'object' &&
                (overlay.ports![ports.indexOf(port)] as any).connectionStringTemplate
                    ? (overlay.ports![ports.indexOf(port)] as any).connectionStringTemplate
                    : getDefaultConnectionStringTemplate(portService, port.protocol);

            const portUrl = generateUrl(port);
            if (portUrl) {
                connectionStrings.push(portUrl);
            } else if (tmpl) {
                // From dev container: use the service name as host
                const containerStr = generateConnectionString(tmpl, port, {
                    ...envVars,
                    host: portService,
                });
                // From host machine: use localhost
                const hostStr = generateConnectionString(tmpl, port, {
                    ...envVars,
                    host: 'localhost',
                });
                if (containerStr) {
                    connectionStrings.push(`# From dev container\n${containerStr}`);
                }
                if (hostStr && hostStr !== containerStr) {
                    connectionStrings.push(`# From host machine\n${hostStr}`);
                }
            }
        }

        if (connectionStrings.length > 0) {
            lines.push('**Connection Strings:**');
            lines.push('');
            lines.push('```bash');
            for (const cs of connectionStrings) {
                lines.push(cs);
            }
            lines.push('```');
            lines.push('');
        }

        // Code examples
        const examples = SERVICE_CODE_EXAMPLES[service] || SERVICE_CODE_EXAMPLES[overlay.id];
        if (examples) {
            lines.push('**Code Examples:**');
            lines.push('');

            if (examples.nodejs) {
                lines.push('*Node.js:*');
                lines.push('```javascript');
                lines.push(examples.nodejs);
                lines.push('```');
                lines.push('');
            }

            if (examples.python) {
                lines.push('*Python:*');
                lines.push('```python');
                lines.push(examples.python);
                lines.push('```');
                lines.push('');
            }
        }

        // Common commands
        const commands = SERVICE_COMMANDS[service] || SERVICE_COMMANDS[overlay.id];
        if (commands) {
            lines.push('**Common Commands:**');
            lines.push('');
            lines.push('```bash');
            for (const cmd of commands) {
                lines.push(`# ${cmd.name}`);
                lines.push(cmd.command);
            }
            lines.push('```');
            lines.push('');
        }

        // Health check
        lines.push('**Health Check:**');
        lines.push('');
        lines.push('```bash');
        lines.push(`# Verify service is running`);
        lines.push(`docker-compose ps ${service}`);
        lines.push('');
        lines.push(`# View service logs`);
        lines.push(`docker-compose logs ${service}`);
        lines.push('```');
        lines.push('');
    }

    // ─── Environment Variables ────────────────────────────────────────
    lines.push('## Environment Variables');
    lines.push('');
    lines.push('See `.env.example` for all configuration options.');
    lines.push('');
    lines.push('Copy to `.env` and customize:');
    lines.push('```bash');
    lines.push('cp .devcontainer/.env.example .devcontainer/.env');
    lines.push('```');
    lines.push('');

    // ─── Port Offset ──────────────────────────────────────────────────
    lines.push('## Port Offset');
    lines.push('');
    lines.push(`**Current offset:** ${portOffset}`);
    lines.push('');

    if (portOffset > 0) {
        lines.push(
            `A port offset of **${portOffset}** is currently applied to avoid conflicts with other projects.`
        );
    } else {
        lines.push('To avoid conflicts when running multiple projects simultaneously:');
        lines.push('```bash');
        lines.push('npx container-superposition regen --port-offset 100');
        lines.push('```');
        lines.push('');

        // Show what would change
        if (serviceOverlays.length > 0) {
            lines.push('This would change:');
            for (const { overlay, ports } of overlayPorts) {
                for (const port of ports) {
                    lines.push(`- ${overlay.name}: ${port.port} → ${port.port + 100}`);
                }
            }
        }
    }

    lines.push('');

    // ─── Troubleshooting ──────────────────────────────────────────────
    lines.push('## Troubleshooting');
    lines.push('');
    lines.push("### Service won't start");
    lines.push('');
    lines.push('```bash');
    lines.push('# Check container status');
    lines.push('docker-compose ps');
    lines.push('');
    lines.push('# View logs');
    lines.push('docker-compose logs <service-name>');
    lines.push('');
    lines.push('# Restart service');
    lines.push('docker-compose restart <service-name>');
    lines.push('```');
    lines.push('');
    lines.push('### Connection refused');
    lines.push('');
    lines.push('1. Verify service is running with `docker-compose ps`');
    lines.push('2. Use service name from container (e.g., `postgres` not `localhost`)');
    lines.push('3. Use `localhost` when connecting from the host machine');
    lines.push('4. Check for port conflicts');
    lines.push('');
    lines.push('### Port already in use');
    lines.push('');
    lines.push('```bash');
    lines.push('npx container-superposition regen --port-offset 100');
    lines.push('```');
    lines.push('');

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`Generated from overlays on ${generatedAt}`);
    lines.push('');

    return lines.join('\n');
}

/**
 * Generate env.local.example - a commented-out local override template
 * derived from each overlay's .env.example
 */
export function generateEnvLocalExample(
    overlays: OverlayMetadata[],
    overlaysDir: string,
    portOffset: number
): string {
    const sections: string[] = [];

    for (const overlay of overlays) {
        const envPath = path.join(overlaysDir, overlay.id, '.env.example');
        if (!fs.existsSync(envPath)) {
            continue;
        }

        const rawContent = fs.readFileSync(envPath, 'utf-8').trim();
        if (!rawContent) {
            continue;
        }

        // Apply port offset to the env content so suggested values match .env.example
        const content = portOffset > 0 ? applyPortOffsetToEnv(rawContent, portOffset) : rawContent;

        // Build commented-out version of this overlay's env vars
        const commentedLines = content.split('\n').map((line) => {
            const trimmed = line.trim();
            // Keep blank lines and already-commented lines as-is
            if (trimmed === '' || trimmed.startsWith('#')) {
                return line;
            }
            // Comment out the variable assignment
            return `# ${line}`;
        });

        const section =
            `# ============================================\n` +
            `# ${overlay.name}\n` +
            `# ============================================\n` +
            commentedLines.join('\n');

        sections.push(section);
    }

    if (sections.length === 0) {
        return '';
    }

    let header = `# Local Environment Configuration
# Copy this file to .devcontainer/.env and customize for your machine
#
# This file shows OPTIONAL overrides. The defaults in .devcontainer/.env.example
# work out of the box for local development.
#
# Generated by container-superposition
`;

    if (portOffset > 0) {
        header += `#
# NOTE: A port offset of ${portOffset} is applied.
# Ports have been shifted by ${portOffset} in .env.example.
`;
    }

    return header + '\n' + sections.join('\n\n') + '\n';
}
