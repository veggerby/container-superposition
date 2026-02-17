import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..', '..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'test-output');

describe('Golden Tests - Composition', () => {
    it('should generate devcontainer.json with correct structure', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-basic');

        // Clean up previous test output
        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: ['postgres'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        // Verify devcontainer.json was created
        const devcontainerPath = path.join(outputPath, 'devcontainer.json');
        expect(fs.existsSync(devcontainerPath)).toBe(true);

        // Load and verify content
        const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
        expect(devcontainer.name).toBeDefined();
        expect(devcontainer.dockerComposeFile).toBe('docker-compose.yml');

        // Clean up
        fs.rmSync(outputPath, { recursive: true });
    });

    it('should generate superposition.json manifest', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-manifest');

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['dotnet'],
            needsDocker: false,
            database: ['redis'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        // Verify superposition.json was created
        const manifestPath = path.join(outputPath, 'superposition.json');
        expect(fs.existsSync(manifestPath)).toBe(true);

        // Load and verify content
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        expect(manifest.version).toBe('0.1.0');
        expect(manifest.generated).toBeDefined();
        expect(manifest.baseTemplate).toBe('compose');
        expect(manifest.baseImage).toBe('bookworm');
        expect(manifest.overlays).toContain('dotnet');
        expect(manifest.overlays).toContain('redis');

        // Clean up
        fs.rmSync(outputPath, { recursive: true });
    });

    it('should auto-resolve grafana -> prometheus dependency', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-grafana-deps');

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: ['grafana'],
            outputPath,
        };

        await composeDevContainer(answers);

        // Verify superposition.json includes auto-resolved dependency
        const manifestPath = path.join(outputPath, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        expect(manifest.overlays).toContain('grafana');
        expect(manifest.overlays).toContain('prometheus');
        expect(manifest.autoResolved).toBeDefined();
        expect(manifest.autoResolved.added).toContain('prometheus');
        expect(manifest.autoResolved.reason).toContain('required by grafana');

        // Clean up
        fs.rmSync(outputPath, { recursive: true });
    });

    it('should merge docker-compose.yml correctly', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-compose-merge');

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: ['postgres', 'redis'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        // Verify docker-compose.yml was created
        const composePath = path.join(outputPath, 'docker-compose.yml');
        expect(fs.existsSync(composePath)).toBe(true);

        // Load and verify content
        const compose = yaml.load(fs.readFileSync(composePath, 'utf-8')) as any;
        expect(compose.services).toBeDefined();
        expect(compose.services.postgres).toBeDefined();
        expect(compose.services.redis).toBeDefined();
        expect(compose.services.devcontainer).toBeDefined();

        // Clean up
        fs.rmSync(outputPath, { recursive: true });
    });

    it('should apply port offset correctly', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-port-offset');

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: ['grafana'],
            outputPath,
            portOffset: 100,
        };

        await composeDevContainer(answers);

        // Verify devcontainer.json has offset ports
        const devcontainerPath = path.join(outputPath, 'devcontainer.json');
        const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

        // Grafana default port is 3000, with offset should be 3100
        expect(devcontainer.forwardPorts).toContain(3100);
        expect(devcontainer.portsAttributes).toHaveProperty('3100');

        // Prometheus default port is 9090, with offset should be 9190
        expect(devcontainer.forwardPorts).toContain(9190);

        // Verify manifest includes port offset
        const manifestPath = path.join(outputPath, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        expect(manifest.portOffset).toBe(100);

        // Clean up
        fs.rmSync(outputPath, { recursive: true });
    });

    it('should merge environment variables from overlays', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-env-merge');

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: ['postgres'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        // Verify .env.example was created
        const envExamplePath = path.join(outputPath, '.env.example');
        expect(fs.existsSync(envExamplePath)).toBe(true);

        const envContent = fs.readFileSync(envExamplePath, 'utf-8');
        expect(envContent).toContain('POSTGRES');

        // Clean up
        fs.rmSync(outputPath, { recursive: true });
    });

    it('should preserve workspace volumes when merging with overlay volumes', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-volumes-preserved');

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: ['docker-sock'],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        // Verify docker-compose.yml was created
        const composePath = path.join(outputPath, 'docker-compose.yml');
        expect(fs.existsSync(composePath)).toBe(true);

        // Load and verify content
        const compose = yaml.load(fs.readFileSync(composePath, 'utf-8')) as any;
        expect(compose.services.devcontainer).toBeDefined();
        expect(compose.services.devcontainer.volumes).toBeDefined();

        // Verify both volumes are present:
        // 1. Workspace mount from base template
        // 2. Docker socket from docker-sock overlay
        const volumes = compose.services.devcontainer.volumes;
        expect(volumes).toContain('../..:/workspaces:cached');
        expect(volumes).toContain('/var/run/docker.sock:/var/run/docker-host.sock');

        // Clean up
        fs.rmSync(outputPath, { recursive: true });
    });

    it('should remove missing object-style depends_on entries when merging compose services', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-depends-on-object-filter');
        const testOverlaysDir = path.join(REPO_ROOT, 'tmp', 'test-overlays');
        const testOverlayId = 'test-depends-on-object-filter';
        const testOverlayDir = path.join(testOverlaysDir, testOverlayId);

        if (!fs.existsSync(testOverlaysDir)) {
            fs.mkdirSync(testOverlaysDir, { recursive: true });
        }

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }
        if (fs.existsSync(testOverlayDir)) {
            fs.rmSync(testOverlayDir, { recursive: true });
        }

        fs.mkdirSync(testOverlayDir, { recursive: true });

        // Create .registry directory structure for overlay loader
        const registryDir = path.join(testOverlaysDir, '.registry');
        if (!fs.existsSync(registryDir)) {
            fs.mkdirSync(registryDir, { recursive: true });
        }
        fs.writeFileSync(
            path.join(registryDir, 'base-images.yml'),
            `base_images:
  - id: bookworm
    name: Debian 12 (Bookworm)
    description: Latest stable Debian release
    image: mcr.microsoft.com/devcontainers/base:bookworm
    package_manager: apt
`
        );
        fs.writeFileSync(
            path.join(registryDir, 'base-templates.yml'),
            `base_templates:
  - id: plain
    name: Single Image
    description: Development environment in a single container
  - id: compose
    name: Multi-Service
    description: Development environment with multiple services
`
        );
        fs.writeFileSync(
            path.join(testOverlayDir, 'overlay.yml'),
            `id: ${testOverlayId}
name: Test Depends On Filter
description: Test overlay for depends_on object filtering
category: dev
supports:
  - compose
requires: []
suggests: []
conflicts: []
tags:
  - test
ports: []
`
        );
        fs.writeFileSync(path.join(testOverlayDir, 'devcontainer.patch.json'), '{}\n');
        fs.writeFileSync(
            path.join(testOverlayDir, 'docker-compose.yml'),
            `version: '3.8'
services:
  test-service:
    image: alpine:3.20
    command: ["sh", "-c", "sleep infinity"]
    depends_on:
      missing-service:
        condition: service_started
networks:
  devnet:
`
        );

        try {
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [testOverlayId as any],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers, testOverlaysDir);

            const composePath = path.join(outputPath, 'docker-compose.yml');
            const compose = yaml.load(fs.readFileSync(composePath, 'utf-8')) as any;

            expect(compose.services['test-service']).toBeDefined();
            expect(compose.services['test-service'].depends_on).toBeUndefined();
        } finally {
            if (fs.existsSync(testOverlayDir)) {
                fs.rmSync(testOverlayDir, { recursive: true });
            }
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }
        }
    });
});
