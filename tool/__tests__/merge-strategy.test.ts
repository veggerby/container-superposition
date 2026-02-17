/**
 * Tests for merge strategy specification
 *
 * These tests validate that the merge utilities follow the formal specification
 * defined in docs/merge-strategy.md
 */

import { describe, it, expect } from 'vitest';
import {
    deepMerge,
    mergeRemoteEnv,
    mergePackages,
    filterDependsOn,
    applyPortOffset,
    applyPortOffsetToEnv,
    MERGE_STRATEGY,
} from '../utils/merge.js';

describe('Merge Strategy Specification', () => {
    describe('deepMerge', () => {
        it('should deep merge objects', () => {
            const base = {
                customizations: {
                    vscode: {
                        settings: {
                            'editor.fontSize': 14,
                        },
                    },
                },
            };

            const overlay = {
                customizations: {
                    vscode: {
                        settings: {
                            'editor.tabSize': 2,
                        },
                    },
                },
            };

            const result = deepMerge(base, overlay);

            expect(result).toEqual({
                customizations: {
                    vscode: {
                        settings: {
                            'editor.fontSize': 14,
                            'editor.tabSize': 2,
                        },
                    },
                },
            });
        });

        it('should merge arrays with union and deduplication', () => {
            const base = {
                forwardPorts: [3000, 8080],
            };

            const overlay = {
                forwardPorts: [8080, 9090],
            };

            const result = deepMerge(base, overlay);

            expect(result.forwardPorts).toEqual([3000, 8080, 9090]);
        });

        it('should preserve target array when source array is empty', () => {
            const base = {
                forwardPorts: [3000, 8080],
            };

            const overlay = {
                forwardPorts: [],
            };

            const result = deepMerge(base, overlay);

            expect(result.forwardPorts).toEqual([3000, 8080]);
        });

        it('should merge features object deeply', () => {
            const base = {
                features: {
                    'ghcr.io/devcontainers/features/node:1': {
                        version: 'lts',
                    },
                },
            };

            const overlay = {
                features: {
                    'ghcr.io/devcontainers/features/node:1': {
                        nodeGypDependencies: true,
                    },
                    'ghcr.io/devcontainers/features/git:1': {},
                },
            };

            const result = deepMerge(base, overlay);

            expect(result).toEqual({
                features: {
                    'ghcr.io/devcontainers/features/node:1': {
                        version: 'lts',
                        nodeGypDependencies: true,
                    },
                    'ghcr.io/devcontainers/features/git:1': {},
                },
            });
        });

        it('should handle last-writer-wins for primitives', () => {
            const base = {
                name: 'Base Container',
                workspaceFolder: '/workspace',
            };

            const overlay = {
                workspaceFolder: '/app',
            };

            const result = deepMerge(base, overlay);

            expect(result).toEqual({
                name: 'Base Container',
                workspaceFolder: '/app',
            });
        });

        it('should handle null values', () => {
            const base = {
                workspaceFolder: '/workspace',
                shutdownAction: 'stopCompose',
            };

            const overlay = {
                workspaceFolder: null,
            };

            const result = deepMerge(base, overlay);

            expect(result.workspaceFolder).toBeNull();
            expect(result.shutdownAction).toBe('stopCompose');
        });

        it('should merge portsAttributes by port key', () => {
            const base = {
                portsAttributes: {
                    '3000': {
                        label: 'Dev Server',
                    },
                },
            };

            const overlay = {
                portsAttributes: {
                    '3000': {
                        onAutoForward: 'openBrowser',
                    },
                    '8080': {
                        label: 'API',
                    },
                },
            };

            const result = deepMerge(base, overlay);

            expect(result.portsAttributes).toEqual({
                '3000': {
                    label: 'Dev Server',
                    onAutoForward: 'openBrowser',
                },
                '8080': {
                    label: 'API',
                },
            });
        });

        it('should merge extensions array', () => {
            const base = {
                customizations: {
                    vscode: {
                        extensions: ['dbaeumer.vscode-eslint', 'esbenp.prettier-vscode'],
                    },
                },
            };

            const overlay = {
                customizations: {
                    vscode: {
                        extensions: ['esbenp.prettier-vscode', 'ms-azuretools.vscode-docker'],
                    },
                },
            };

            const result = deepMerge(base, overlay);

            expect(result.customizations.vscode.extensions).toEqual([
                'dbaeumer.vscode-eslint',
                'esbenp.prettier-vscode',
                'ms-azuretools.vscode-docker',
            ]);
        });
    });

    describe('mergeRemoteEnv', () => {
        it('should merge PATH variables intelligently', () => {
            const target = {
                PATH: '/usr/local/bin:${containerEnv:PATH}',
                NODE_ENV: 'development',
            };

            const source = {
                PATH: '${containerEnv:HOME}/.local/bin:${containerEnv:PATH}',
                NODE_ENV: 'production',
            };

            const result = mergeRemoteEnv(target, source);

            expect(result.PATH).toBe(
                '/usr/local/bin:${containerEnv:HOME}/.local/bin:${containerEnv:PATH}'
            );
            expect(result.NODE_ENV).toBe('production'); // Last writer wins
        });

        it('should deduplicate PATH components', () => {
            const target = {
                PATH: '/usr/local/bin:/usr/bin:${containerEnv:PATH}',
            };

            const source = {
                PATH: '/usr/bin:/opt/bin:${containerEnv:PATH}',
            };

            const result = mergeRemoteEnv(target, source);

            expect(result.PATH).toBe('/usr/local/bin:/usr/bin:/opt/bin:${containerEnv:PATH}');
        });

        it('should preserve variable references in PATH', () => {
            const target = {
                PATH: '${containerEnv:HOME}/bin:${containerEnv:PATH}',
            };

            const source = {
                PATH: '${containerEnv:HOME}/.npm-global/bin:${containerEnv:PATH}',
            };

            const result = mergeRemoteEnv(target, source);

            expect(result.PATH).toBe(
                '${containerEnv:HOME}/bin:${containerEnv:HOME}/.npm-global/bin:${containerEnv:PATH}'
            );
        });

        it('should use last-writer-wins for non-PATH variables', () => {
            const target = {
                NODE_ENV: 'development',
                DEBUG: 'true',
            };

            const source = {
                NODE_ENV: 'production',
            };

            const result = mergeRemoteEnv(target, source);

            expect(result.NODE_ENV).toBe('production');
            expect(result.DEBUG).toBe('true');
        });

        it('should add new environment variables', () => {
            const target = {
                NODE_ENV: 'development',
            };

            const source = {
                RUST_LOG: 'info',
            };

            const result = mergeRemoteEnv(target, source);

            expect(result).toEqual({
                NODE_ENV: 'development',
                RUST_LOG: 'info',
            });
        });
    });

    describe('mergePackages', () => {
        it('should merge and deduplicate package lists', () => {
            const existing = 'curl wget';
            const additional = 'wget jq';

            const result = mergePackages(existing, additional);

            expect(result).toBe('curl wget jq');
        });

        it('should handle empty existing packages', () => {
            const existing = '';
            const additional = 'curl wget';

            const result = mergePackages(existing, additional);

            expect(result).toBe('curl wget');
        });

        it('should handle empty additional packages', () => {
            const existing = 'curl wget';
            const additional = '';

            const result = mergePackages(existing, additional);

            expect(result).toBe('curl wget');
        });

        it('should handle extra whitespace', () => {
            const existing = '  curl   wget  ';
            const additional = ' wget  jq ';

            const result = mergePackages(existing, additional);

            expect(result).toBe('curl wget jq');
        });

        it('should preserve package order (target first)', () => {
            const existing = 'pkg-a pkg-b';
            const additional = 'pkg-c pkg-d';

            const result = mergePackages(existing, additional);

            expect(result).toBe('pkg-a pkg-b pkg-c pkg-d');
        });
    });

    describe('filterDependsOn', () => {
        it('should filter array form depends_on', () => {
            const dependsOn = ['postgres', 'redis', 'rabbitmq'];
            const existingServices = new Set(['postgres', 'redis']);

            const result = filterDependsOn(dependsOn, existingServices);

            expect(result).toEqual(['postgres', 'redis']);
        });

        it('should filter object form depends_on', () => {
            const dependsOn = {
                postgres: { condition: 'service_healthy' },
                redis: { condition: 'service_started' },
                rabbitmq: { condition: 'service_started' },
            };
            const existingServices = new Set(['postgres', 'redis']);

            const result = filterDependsOn(dependsOn, existingServices);

            expect(result).toEqual({
                postgres: { condition: 'service_healthy' },
                redis: { condition: 'service_started' },
            });
        });

        it('should return undefined when all dependencies filtered out', () => {
            const dependsOn = ['nonexistent'];
            const existingServices = new Set(['postgres', 'redis']);

            const result = filterDependsOn(dependsOn, existingServices);

            expect(result).toBeUndefined();
        });

        it('should handle empty depends_on array', () => {
            const dependsOn: string[] = [];
            const existingServices = new Set(['postgres']);

            const result = filterDependsOn(dependsOn, existingServices);

            expect(result).toBeUndefined();
        });

        it('should handle empty depends_on object', () => {
            const dependsOn = {};
            const existingServices = new Set(['postgres']);

            const result = filterDependsOn(dependsOn, existingServices);

            expect(result).toBeUndefined();
        });
    });

    describe('applyPortOffset', () => {
        it('should offset numeric ports', () => {
            const port = 3000;
            const offset = 100;

            const result = applyPortOffset(port, offset);

            expect(result).toBe(3100);
        });

        it('should offset host port in "host:container" format', () => {
            const port = '5432:5432';
            const offset = 100;

            const result = applyPortOffset(port, offset);

            expect(result).toBe('5532:5432');
        });

        it('should offset host port in "ip:host:container" format', () => {
            const port = '127.0.0.1:5432:5432';
            const offset = 100;

            const result = applyPortOffset(port, offset);

            expect(result).toBe('127.0.0.1:5532:5432');
        });

        it('should handle zero offset', () => {
            const port = '5432:5432';
            const offset = 0;

            const result = applyPortOffset(port, offset);

            expect(result).toBe('5432:5432');
        });

        it('should return unparseable strings as-is', () => {
            const port = 'invalid';
            const offset = 100;

            const result = applyPortOffset(port, offset);

            expect(result).toBe('invalid');
        });
    });

    describe('applyPortOffsetToEnv', () => {
        it('should offset PORT variables', () => {
            const env = `POSTGRES_PORT=5432
REDIS_PORT=6379
APP_NAME=myapp`;
            const offset = 100;

            const result = applyPortOffsetToEnv(env, offset);

            expect(result).toBe(`POSTGRES_PORT=5532
REDIS_PORT=6479
APP_NAME=myapp`);
        });

        it('should handle various PORT variable patterns', () => {
            const env = `GRAFANA_HTTP_PORT=3000
LOKI_HTTP_PORT=3100
HTTP_PORT=8080
MY_CUSTOM_PORT=9090`;
            const offset = 100;

            const result = applyPortOffsetToEnv(env, offset);

            expect(result).toBe(`GRAFANA_HTTP_PORT=3100
LOKI_HTTP_PORT=3200
HTTP_PORT=8180
MY_CUSTOM_PORT=9190`);
        });

        it('should not offset non-PORT variables', () => {
            const env = `POSTGRES_VERSION=16
POSTGRES_PORT=5432
POSTGRES_DB=myapp`;
            const offset = 100;

            const result = applyPortOffsetToEnv(env, offset);

            expect(result).toBe(`POSTGRES_VERSION=16
POSTGRES_PORT=5532
POSTGRES_DB=myapp`);
        });

        it('should handle comments and empty lines', () => {
            const env = `# Database configuration
POSTGRES_PORT=5432

# Redis configuration
REDIS_PORT=6379`;
            const offset = 100;

            const result = applyPortOffsetToEnv(env, offset);

            expect(result).toBe(`# Database configuration
POSTGRES_PORT=5532

# Redis configuration
REDIS_PORT=6479`);
        });
    });

    describe('MERGE_STRATEGY metadata', () => {
        it('should export merge strategy metadata', () => {
            expect(MERGE_STRATEGY.version).toBe('1.0.0');
            expect(MERGE_STRATEGY.description).toBeDefined();
            expect(MERGE_STRATEGY.rules).toBeDefined();
        });

        it('should document merge rules', () => {
            expect(MERGE_STRATEGY.rules.objects).toBe('deep-merge');
            expect(MERGE_STRATEGY.rules.arrays).toBe('union-deduplicate');
            expect(MERGE_STRATEGY.rules.primitives).toBe('last-writer-wins');
        });
    });

    describe('Golden Tests - Complex Scenarios', () => {
        it('should handle multi-overlay composition', () => {
            const base = {
                name: 'Base Container',
                features: {
                    'node:1': { version: 'lts' },
                },
                forwardPorts: [3000],
                customizations: {
                    vscode: {
                        extensions: ['dbaeumer.vscode-eslint'],
                    },
                },
            };

            const overlay1 = {
                features: {
                    'node:1': { nodeGypDependencies: true },
                    'git:1': {},
                },
                forwardPorts: [8080],
                remoteEnv: {
                    PATH: '/usr/local/bin:${containerEnv:PATH}',
                },
            };

            const overlay2 = {
                forwardPorts: [9090],
                customizations: {
                    vscode: {
                        extensions: ['esbenp.prettier-vscode'],
                        settings: {
                            'editor.formatOnSave': true,
                        },
                    },
                },
                remoteEnv: {
                    PATH: '${containerEnv:HOME}/.npm/bin:${containerEnv:PATH}',
                    NODE_ENV: 'development',
                },
            };

            const step1 = deepMerge(base, overlay1);
            const final = deepMerge(step1, overlay2);

            expect(final).toEqual({
                name: 'Base Container',
                features: {
                    'node:1': {
                        version: 'lts',
                        nodeGypDependencies: true,
                    },
                    'git:1': {},
                },
                forwardPorts: [3000, 8080, 9090],
                customizations: {
                    vscode: {
                        extensions: ['dbaeumer.vscode-eslint', 'esbenp.prettier-vscode'],
                        settings: {
                            'editor.formatOnSave': true,
                        },
                    },
                },
                remoteEnv: {
                    PATH: '/usr/local/bin:${containerEnv:HOME}/.npm/bin:${containerEnv:PATH}',
                    NODE_ENV: 'development',
                },
            });
        });

        it('should handle apt-get-packages feature merging', () => {
            const base = {
                features: {
                    'ghcr.io/devcontainers-extra/features/apt-get-packages:1': {
                        packages: 'curl wget',
                    },
                },
            };

            const overlay = {
                features: {
                    'ghcr.io/devcontainers-extra/features/apt-get-packages:1': {
                        packages: 'wget jq git',
                    },
                },
            };

            const result = deepMerge(base, overlay);

            // Note: Package string merging would be done by composer.ts using mergePackages
            // Here we're just testing the object merge
            expect(result.features).toHaveProperty(
                'ghcr.io/devcontainers-extra/features/apt-get-packages:1'
            );
        });

        it('should handle cross-distro-packages feature', () => {
            const base = {
                features: {
                    './features/cross-distro-packages': {
                        apt: 'build-essential wget',
                        apk: 'build-base wget',
                    },
                },
            };

            const overlay = {
                features: {
                    './features/cross-distro-packages': {
                        apt: 'wget curl',
                        apk: 'wget curl',
                    },
                },
            };

            const result = deepMerge(base, overlay);

            // Package merging would be done separately
            expect(result.features['./features/cross-distro-packages']).toHaveProperty('apt');
            expect(result.features['./features/cross-distro-packages']).toHaveProperty('apk');
        });
    });
});
