/**
 * Tests for port utilities and rich port metadata system
 */

import { describe, it, expect } from 'vitest';
import {
    normalizePort,
    generateConnectionString,
    getDefaultConnectionStringTemplate,
    generateUrl,
    generatePortsDocumentation,
    extractPorts,
} from '../utils/port-utils.js';
import type { PortMetadata, OverlayMetadata } from '../schema/types.js';

describe('Port Utilities', () => {
    describe('normalizePort', () => {
        it('should normalize a numeric port', () => {
            const result = normalizePort(5432, 100, 'postgres');
            expect(result).toEqual({
                port: 5432,
                actualPort: 5532,
                service: 'postgres',
            });
        });

        it('should normalize a rich port metadata object', () => {
            const port: PortMetadata = {
                port: 3000,
                service: 'grafana',
                protocol: 'http',
                description: 'Grafana web UI',
                path: '/',
                onAutoForward: 'openBrowser',
            };

            const result = normalizePort(port, 100);
            expect(result).toEqual({
                port: 3000,
                service: 'grafana',
                protocol: 'http',
                description: 'Grafana web UI',
                path: '/',
                onAutoForward: 'openBrowser',
                actualPort: 3100,
            });
        });

        it('should use overlayId as service if not provided in port object', () => {
            const port: PortMetadata = {
                port: 8080,
                protocol: 'http',
            };

            const result = normalizePort(port, 0, 'myoverlay');
            expect(result.service).toBe('myoverlay');
        });
    });

    describe('generateConnectionString', () => {
        it('should generate PostgreSQL connection string', () => {
            const port: PortMetadata = {
                port: 5432,
                service: 'postgres',
                protocol: 'tcp',
                connectionStringTemplate: 'postgresql://{user}:{password}@{host}:{port}/{database}',
            };

            const normalized = normalizePort(port, 100);
            const envVars = {
                user: 'postgres',
                password: 'postgres',
                database: 'mydb',
            };

            const result = generateConnectionString(
                port.connectionStringTemplate!,
                normalized,
                envVars
            );

            expect(result).toBe('postgresql://postgres:postgres@localhost:5532/mydb');
        });

        it('should generate Redis connection string', () => {
            const port: PortMetadata = {
                port: 6379,
                service: 'redis',
                protocol: 'tcp',
                connectionStringTemplate: 'redis://{host}:{port}',
            };

            const normalized = normalizePort(port, 100);
            const result = generateConnectionString(port.connectionStringTemplate!, normalized);

            expect(result).toBe('redis://localhost:6479');
        });

        it('should replace placeholders with default values', () => {
            const port: PortMetadata = {
                port: 3000,
                service: 'webapp',
                protocol: 'http',
                connectionStringTemplate: 'http://{host}:{port}',
            };

            const normalized = normalizePort(port, 0);
            const result = generateConnectionString(port.connectionStringTemplate!, normalized);

            expect(result).toBe('http://localhost:3000');
        });
    });

    describe('getDefaultConnectionStringTemplate', () => {
        it('should return PostgreSQL template', () => {
            const template = getDefaultConnectionStringTemplate('postgres');
            expect(template).toBe('postgresql://{user}:{password}@{host}:{port}/{database}');
        });

        it('should return Redis template', () => {
            const template = getDefaultConnectionStringTemplate('redis');
            expect(template).toBe('redis://{host}:{port}');
        });

        it('should return HTTP template for http protocol', () => {
            const template = getDefaultConnectionStringTemplate('myservice', 'http');
            expect(template).toBe('http://{host}:{port}{path}');
        });

        it('should return undefined for unknown service', () => {
            const template = getDefaultConnectionStringTemplate('unknown');
            expect(template).toBeUndefined();
        });
    });

    describe('generateUrl', () => {
        it('should generate HTTP URL', () => {
            const port: PortMetadata = {
                port: 3000,
                service: 'grafana',
                protocol: 'http',
                path: '/',
            };

            const normalized = normalizePort(port, 100);
            const url = generateUrl(normalized);

            expect(url).toBe('http://localhost:3100/');
        });

        it('should generate HTTPS URL', () => {
            const port: PortMetadata = {
                port: 443,
                service: 'api',
                protocol: 'https',
                path: '/api/v1',
            };

            const normalized = normalizePort(port, 0);
            const url = generateUrl(normalized);

            expect(url).toBe('https://localhost:443/api/v1');
        });

        it('should use empty path if not provided', () => {
            const port: PortMetadata = {
                port: 8080,
                service: 'webapp',
                protocol: 'http',
            };

            const normalized = normalizePort(port, 0);
            const url = generateUrl(normalized);

            expect(url).toBe('http://localhost:8080');
        });

        it('should return undefined for non-HTTP protocols', () => {
            const port: PortMetadata = {
                port: 5432,
                service: 'postgres',
                protocol: 'tcp',
            };

            const normalized = normalizePort(port, 0);
            const url = generateUrl(normalized);

            expect(url).toBeUndefined();
        });
    });

    describe('extractPorts', () => {
        it('should extract numeric ports from overlays', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'postgres',
                    name: 'PostgreSQL',
                    description: 'Database',
                    category: 'database',
                    ports: [5432],
                },
                {
                    id: 'redis',
                    name: 'Redis',
                    description: 'Cache',
                    category: 'database',
                    ports: [6379],
                },
            ];

            const ports = extractPorts(overlays);
            expect(ports).toEqual([5432, 6379]);
        });

        it('should extract ports from rich metadata objects', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'grafana',
                    name: 'Grafana',
                    description: 'Visualization',
                    category: 'observability',
                    ports: [
                        {
                            port: 3000,
                            service: 'grafana',
                            protocol: 'http',
                        },
                    ],
                },
            ];

            const ports = extractPorts(overlays);
            expect(ports).toEqual([3000]);
        });

        it('should handle mix of numeric and rich ports', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'mixed',
                    name: 'Mixed',
                    description: 'Mixed ports',
                    category: 'dev',
                    ports: [
                        5432,
                        {
                            port: 3000,
                            service: 'web',
                            protocol: 'http',
                        },
                        6379,
                    ],
                },
            ];

            const ports = extractPorts(overlays);
            expect(ports).toEqual([3000, 5432, 6379]); // Sorted
        });

        it('should deduplicate ports', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'overlay1',
                    name: 'Overlay 1',
                    description: 'First',
                    category: 'dev',
                    ports: [5432, 3000],
                },
                {
                    id: 'overlay2',
                    name: 'Overlay 2',
                    description: 'Second',
                    category: 'dev',
                    ports: [3000, 6379],
                },
            ];

            const ports = extractPorts(overlays);
            expect(ports).toEqual([3000, 5432, 6379]);
        });
    });

    describe('generatePortsDocumentation', () => {
        it('should generate comprehensive port documentation', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'postgres',
                    name: 'PostgreSQL',
                    description: 'Database',
                    category: 'database',
                    ports: [
                        {
                            port: 5432,
                            service: 'postgres',
                            protocol: 'tcp',
                            description: 'PostgreSQL connection',
                            onAutoForward: 'notify',
                            connectionStringTemplate:
                                'postgresql://{user}:{password}@{host}:{port}/{database}',
                        },
                    ],
                },
                {
                    id: 'grafana',
                    name: 'Grafana',
                    description: 'Visualization',
                    category: 'observability',
                    ports: [
                        {
                            port: 3000,
                            service: 'grafana',
                            protocol: 'http',
                            description: 'Grafana UI',
                            path: '/',
                            onAutoForward: 'openBrowser',
                        },
                    ],
                },
            ];

            const envVars = {
                user: 'postgres',
                password: 'secret',
                database: 'mydb',
            };

            const doc = generatePortsDocumentation(overlays, 100, envVars);

            expect(doc.portOffset).toBe(100);
            expect(doc.ports).toHaveLength(2);

            // Check postgres port
            const postgresPort = doc.ports.find((p) => p.service === 'postgres');
            expect(postgresPort).toEqual({
                port: 5432,
                service: 'postgres',
                protocol: 'tcp',
                description: 'PostgreSQL connection',
                onAutoForward: 'notify',
                connectionStringTemplate:
                    'postgresql://{user}:{password}@{host}:{port}/{database}',
                actualPort: 5532,
            });

            // Check connection strings
            expect(doc.connectionStrings?.postgres).toBe(
                'postgresql://postgres:secret@localhost:5532/mydb'
            );
            expect(doc.connectionStrings?.['grafana-url']).toBe('http://localhost:3100/');
        });

        it('should handle overlays without ports', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'nodejs',
                    name: 'Node.js',
                    description: 'Runtime',
                    category: 'language',
                    ports: [],
                },
            ];

            const doc = generatePortsDocumentation(overlays, 0);

            expect(doc.ports).toHaveLength(0);
            expect(doc.connectionStrings).toEqual({});
        });

        it('should use default connection string templates when not specified', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'redis',
                    name: 'Redis',
                    description: 'Cache',
                    category: 'database',
                    ports: [
                        {
                            port: 6379,
                            service: 'redis',
                            protocol: 'tcp',
                        },
                    ],
                },
            ];

            const doc = generatePortsDocumentation(overlays, 0);

            expect(doc.connectionStrings?.redis).toBe('redis://localhost:6379');
        });
    });
});
