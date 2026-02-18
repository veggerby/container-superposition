/**
 * Tests for summary utilities
 */

import { describe, it, expect } from 'vitest';
import type { QuestionnaireAnswers, OverlayMetadata, NormalizedPort } from '../schema/types.js';
import {
    detectWarnings,
    generateTips,
    generateNextSteps,
    overlaysToServices,
    portsToPortInfo,
} from '../utils/summary.js';

describe('Summary Utilities', () => {
    describe('detectWarnings', () => {
        it('should detect docker-sock security warning', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'docker-sock',
                    name: 'Docker (host socket)',
                    description: 'Docker host socket access',
                    category: 'dev',
                },
            ];
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                playwright: false,
                cloudTools: [],
                devTools: ['docker-sock'],
                observability: [],
                outputPath: '.devcontainer',
            };

            const warnings = detectWarnings(overlays, answers);
            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toContain('docker-sock');
            expect(warnings[0]).toContain('root access');
        });

        it('should detect target mismatch for docker-sock in Codespaces', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'docker-sock',
                    name: 'Docker (host socket)',
                    description: 'Docker host socket access',
                    category: 'dev',
                },
            ];
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                playwright: false,
                cloudTools: [],
                devTools: ['docker-sock'],
                observability: [],
                outputPath: '.devcontainer',
                target: 'codespaces',
            };

            const warnings = detectWarnings(overlays, answers);
            expect(warnings.length).toBeGreaterThanOrEqual(2);
            expect(warnings.some((w) => w.includes('Codespaces'))).toBe(true);
        });

        it('should detect high port count', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'test1',
                    name: 'Test 1',
                    description: 'Test overlay',
                    category: 'observability',
                    ports: [8000, 8001, 8002, 8003, 8004, 8005],
                },
                {
                    id: 'test2',
                    name: 'Test 2',
                    description: 'Test overlay',
                    category: 'observability',
                    ports: [9000, 9001, 9002, 9003, 9004],
                },
            ];
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: '.devcontainer',
            };

            const warnings = detectWarnings(overlays, answers);
            expect(warnings.some((w) => w.includes('High port count'))).toBe(true);
        });

        it('should warn about port conflicts without offset', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'postgres',
                    name: 'PostgreSQL',
                    description: 'PostgreSQL database',
                    category: 'database',
                    ports: [5432],
                },
            ];
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: '.devcontainer',
                portOffset: 0,
            };

            const warnings = detectWarnings(overlays, answers);
            expect(warnings.some((w) => w.includes('port conflicts'))).toBe(true);
        });

        it('should not warn about port conflicts with offset', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'postgres',
                    name: 'PostgreSQL',
                    description: 'PostgreSQL database',
                    category: 'database',
                    ports: [5432],
                },
            ];
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: '.devcontainer',
                portOffset: 100,
            };

            const warnings = detectWarnings(overlays, answers);
            expect(warnings.some((w) => w.includes('port conflicts'))).toBe(false);
        });
    });

    describe('generateTips', () => {
        it('should suggest committing manifest when not using preset', () => {
            const overlays: OverlayMetadata[] = [];
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: '.devcontainer',
            };

            const tips = generateTips(overlays, answers);
            expect(tips.some((t) => t.includes('superposition.json'))).toBe(true);
        });

        it('should suggest customization directory for complex setups', () => {
            const overlays: OverlayMetadata[] = [
                { id: '1', name: 'O1', description: '', category: 'language' },
                { id: '2', name: 'O2', description: '', category: 'database' },
                { id: '3', name: 'O3', description: '', category: 'observability' },
                { id: '4', name: 'O4', description: '', category: 'dev' },
            ];
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: '.devcontainer',
            };

            const tips = generateTips(overlays, answers);
            expect(tips.some((t) => t.includes('custom/'))).toBe(true);
        });

        it('should always suggest regen command', () => {
            const overlays: OverlayMetadata[] = [];
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: '.devcontainer',
            };

            const tips = generateTips(overlays, answers);
            expect(tips.some((t) => t.includes('regen'))).toBe(true);
        });
    });

    describe('generateNextSteps', () => {
        it('should generate manifest-only next steps', () => {
            const steps = generateNextSteps(true, false);
            expect(steps).toHaveLength(3);
            expect(steps[0]).toContain('superposition.json');
            expect(steps[1]).toContain('Commit');
            expect(steps[2]).toContain('regen');
        });

        it('should generate regen next steps', () => {
            const steps = generateNextSteps(false, true);
            expect(steps).toHaveLength(3);
            expect(steps[0]).toContain('Rebuild');
            expect(steps[1]).toContain('Test');
            expect(steps[2]).toContain('custom');
        });

        it('should generate regular init next steps', () => {
            const steps = generateNextSteps(false, false);
            expect(steps).toHaveLength(4);
            expect(steps[0]).toContain('.env');
            expect(steps[1]).toContain('code');
            expect(steps[2]).toContain('Reopen');
            expect(steps[3]).toContain('doctor');
        });
    });

    describe('overlaysToServices', () => {
        it('should convert overlays to service info', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'nodejs',
                    name: 'Node.js 20',
                    description: 'Node.js runtime',
                    category: 'language',
                },
                {
                    id: 'postgres',
                    name: 'PostgreSQL 16',
                    description: 'PostgreSQL database',
                    category: 'database',
                },
            ];

            const services = overlaysToServices(overlays);
            expect(services).toHaveLength(2);
            expect(services[0]).toEqual({
                name: 'Node.js 20',
                category: 'language',
                version: '20',
            });
            expect(services[1]).toEqual({
                name: 'PostgreSQL 16',
                category: 'database',
                version: '16',
            });
        });

        it('should handle overlays without version numbers', () => {
            const overlays: OverlayMetadata[] = [
                {
                    id: 'docker-sock',
                    name: 'Docker (host socket)',
                    description: 'Docker access',
                    category: 'dev',
                },
            ];

            const services = overlaysToServices(overlays);
            expect(services).toHaveLength(1);
            expect(services[0]).toEqual({
                name: 'Docker (host socket)',
                category: 'dev',
                version: undefined,
            });
        });
    });

    describe('portsToPortInfo', () => {
        it('should convert normalized ports to port info with URLs', () => {
            const ports: NormalizedPort[] = [
                {
                    port: 3000,
                    actualPort: 3100,
                    service: 'grafana',
                    protocol: 'http',
                    description: 'Grafana web UI',
                },
                {
                    port: 5432,
                    actualPort: 5532,
                    service: 'postgres',
                    protocol: 'tcp',
                    description: 'PostgreSQL',
                },
            ];
            const connectionStrings = {
                grafana: 'http://localhost:3100/',
                'grafana-url': 'http://localhost:3100/',
                postgres: 'postgresql://postgres:postgres@localhost:5532/devdb',
            };

            const portInfos = portsToPortInfo(ports, connectionStrings);
            expect(portInfos).toHaveLength(2);
            expect(portInfos[0]).toEqual({
                service: 'grafana',
                port: 3000,
                actualPort: 3100,
                url: 'http://localhost:3100',
                connectionString: 'http://localhost:3100/',
            });
            expect(portInfos[1]).toEqual({
                service: 'postgres',
                port: 5432,
                actualPort: 5532,
                url: undefined,
                connectionString: 'postgresql://postgres:postgres@localhost:5532/devdb',
            });
        });
    });
});
