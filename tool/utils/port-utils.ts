/**
 * Utilities for working with port metadata
 */

import type { PortMetadata, NormalizedPortInfo } from '../schema/types.js';

/**
 * Extract port number from port definition (number or PortMetadata)
 */
export function getPortNumber(port: number | PortMetadata): number {
    return typeof port === 'number' ? port : port.port;
}

/**
 * Extract all port numbers from an array of port definitions
 */
export function getPortNumbers(ports: (number | PortMetadata)[] | undefined): number[] {
    if (!ports) return [];
    return ports.map(getPortNumber);
}

/**
 * Normalize port definition to NormalizedPortInfo
 */
export function normalizePort(
    port: number | PortMetadata,
    overlayId: string
): NormalizedPortInfo {
    if (typeof port === 'number') {
        // Legacy format - create default metadata
        return {
            service: overlayId,
            port,
            protocol: 'tcp',
            description: `Port ${port}`,
        };
    }

    // Rich format - use provided metadata with defaults
    return {
        service: port.service || overlayId,
        port: port.port,
        protocol: port.protocol || 'tcp',
        description: port.description || `Port ${port.port}`,
        path: port.path,
    };
}

/**
 * Normalize all ports from an overlay
 */
export function normalizePorts(
    ports: (number | PortMetadata)[] | undefined,
    overlayId: string
): NormalizedPortInfo[] {
    if (!ports || ports.length === 0) return [];
    return ports.map((port) => normalizePort(port, overlayId));
}

/**
 * Generate connection string for a database service
 */
export function generateConnectionString(
    service: string,
    port: number,
    protocol: string
): string | undefined {
    const hostname = service; // Service name is the hostname in docker-compose

    switch (service) {
        case 'postgres':
            return `postgresql://postgres:postgres@localhost:${port}/devdb`;
        case 'mysql':
            return `mysql://root:mysql@localhost:${port}/devdb`;
        case 'mongodb':
            return `mongodb://localhost:${port}/devdb`;
        case 'redis':
            return `redis://localhost:${port}`;
        case 'rabbitmq':
            return `amqp://guest:guest@localhost:${port}`;
        case 'nats':
            return `nats://localhost:${port}`;
        case 'sqlserver':
            return `Server=localhost,${port};Database=devdb;User Id=sa;Password=YourStrong@Passw0rd;`;
        case 'minio':
            return `s3://minioadmin:minioadmin@localhost:${port}`;
        default:
            return undefined;
    }
}

/**
 * Generate URL for an HTTP/HTTPS service
 */
export function generateUrl(
    protocol: string,
    port: number,
    path?: string
): string | undefined {
    if (protocol !== 'http' && protocol !== 'https') {
        return undefined;
    }

    const basePath = path || '';
    return `${protocol}://localhost:${port}${basePath}`;
}
