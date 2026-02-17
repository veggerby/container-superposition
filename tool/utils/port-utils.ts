/**
 * Port utilities for normalizing and documenting ports
 */

import type { PortMetadata, NormalizedPort, PortsDocumentation, OverlayMetadata } from '../schema/types.js';

/**
 * Normalize a port entry (number or PortMetadata) to NormalizedPort format
 */
export function normalizePort(
    port: number | PortMetadata,
    offset: number,
    overlayId?: string
): NormalizedPort {
    if (typeof port === 'number') {
        // Legacy format - just a number
        return {
            port,
            actualPort: port + offset,
            service: overlayId,
        };
    }

    // Rich format - already an object
    return {
        ...port,
        actualPort: port.port + offset,
        service: port.service || overlayId,
    };
}

/**
 * Generate connection string from template
 */
export function generateConnectionString(
    template: string,
    port: NormalizedPort,
    envVars: Record<string, string> = {}
): string {
    let result = template;

    // Replace port placeholder
    result = result.replace(/\{port\}/g, String(port.actualPort));

    // Replace other placeholders from environment variables or port metadata
    const replacements: Record<string, string> = {
        host: 'localhost',
        service: port.service || 'unknown',
        ...envVars,
    };

    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex, value);
    }

    return result;
}

/**
 * Get default connection string template for common services
 */
export function getDefaultConnectionStringTemplate(service: string, protocol?: string): string | undefined {
    const templates: Record<string, string> = {
        postgres: 'postgresql://{user}:{password}@{host}:{port}/{database}',
        postgresql: 'postgresql://{user}:{password}@{host}:{port}/{database}',
        mysql: 'mysql://{user}:{password}@{host}:{port}/{database}',
        mongodb: 'mongodb://{user}:{password}@{host}:{port}/{database}',
        redis: 'redis://{host}:{port}',
        rabbitmq: 'amqp://{user}:{password}@{host}:{port}',
        nats: 'nats://{host}:{port}',
    };

    // For HTTP/HTTPS services, use URL format
    if (protocol === 'http' || protocol === 'https') {
        return `${protocol}://{host}:{port}{path}`;
    }

    return templates[service.toLowerCase()];
}

/**
 * Generate URL for HTTP/HTTPS services
 */
export function generateUrl(port: NormalizedPort): string | undefined {
    if (port.protocol === 'http' || port.protocol === 'https') {
        const path = port.path || '';
        return `${port.protocol}://localhost:${port.actualPort}${path}`;
    }
    return undefined;
}

/**
 * Generate ports documentation from overlays
 */
export function generatePortsDocumentation(
    overlays: OverlayMetadata[],
    portOffset: number,
    envVars: Record<string, string> = {}
): PortsDocumentation {
    const allPorts: NormalizedPort[] = [];
    const connectionStrings: Record<string, string> = {};

    for (const overlay of overlays) {
        if (!overlay.ports || overlay.ports.length === 0) {
            continue;
        }

        for (const portEntry of overlay.ports) {
            const normalizedPort = normalizePort(portEntry, portOffset, overlay.id);
            allPorts.push(normalizedPort);

            // Generate connection string if template is provided or can be inferred
            const template =
                typeof portEntry === 'object' && portEntry.connectionStringTemplate
                    ? portEntry.connectionStringTemplate
                    : getDefaultConnectionStringTemplate(normalizedPort.service || '', normalizedPort.protocol);

            if (template) {
                const connStr = generateConnectionString(template, normalizedPort, envVars);
                const key = normalizedPort.service || `port-${normalizedPort.port}`;
                connectionStrings[key] = connStr;
            }

            // Generate URL for HTTP/HTTPS services
            const url = generateUrl(normalizedPort);
            if (url && normalizedPort.service) {
                connectionStrings[`${normalizedPort.service}-url`] = url;
            }
        }
    }

    return {
        portOffset,
        ports: allPorts,
        connectionStrings,
    };
}

/**
 * Extract all unique ports from overlays (for offset calculation)
 */
export function extractPorts(overlays: OverlayMetadata[]): number[] {
    const ports = new Set<number>();

    for (const overlay of overlays) {
        if (!overlay.ports) {
            continue;
        }

        for (const portEntry of overlay.ports) {
            const port = typeof portEntry === 'number' ? portEntry : portEntry.port;
            ports.add(port);
        }
    }

    return Array.from(ports).sort((a, b) => a - b);
}
