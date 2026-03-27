import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { composeDevContainer } from '../questionnaire/composer.js';
import { writeProjectConfigCustomizations } from '../schema/project-config.js';
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

    it('should include bubblewrap when codex overlay is selected', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-codex-overlay');

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: ['codex'],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf-8')
        );
        expect(devcontainer.features?.['./features/cross-distro-packages']?.apt).toContain(
            'bubblewrap'
        );
        expect(devcontainer.features?.['./features/cross-distro-packages']?.apk).toContain(
            'bubblewrap'
        );
        expect(devcontainer.postCreateCommand?.['setup-codex']).toBe(
            'bash .devcontainer/scripts/setup-codex.sh'
        );

        fs.rmSync(outputPath, { recursive: true });
    });

    it('should preserve custom image and container name parity when project-config customizations are present', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-project-config-custom-image');

        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        writeProjectConfigCustomizations(outputPath, {
            devcontainerPatch: {
                features: {
                    'ghcr.io/devcontainers/features/common-utils:2': {},
                },
            },
        });

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'custom',
            customImage: 'ubuntu:24.04',
            containerName: 'project-config-dev',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf-8')
        );
        expect(devcontainer.name).toBe('project-config-dev');
        expect(devcontainer.image).toBe('ubuntu:24.04');
        expect(devcontainer.features).toHaveProperty(
            'ghcr.io/devcontainers/features/common-utils:2'
        );

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

describe('Python Overlay - venv support', () => {
    it('should configure VS Code to use .venv interpreter', async () => {
        const projectRoot = path.join(TEST_OUTPUT_DIR, 'test-python-venv-interpreter');
        const outputPath = path.join(projectRoot, '.devcontainer');

        if (fs.existsSync(projectRoot)) {
            fs.rmSync(projectRoot, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['python'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const devcontainerPath = path.join(outputPath, 'devcontainer.json');
        expect(fs.existsSync(devcontainerPath)).toBe(true);

        const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

        // Verify VS Code interpreter points to .venv
        expect(
            devcontainer.customizations?.vscode?.settings?.['python.defaultInterpreterPath']
        ).toBe('${workspaceFolder}/.venv/bin/python');

        // Verify VIRTUAL_ENV is set
        expect(devcontainer.remoteEnv?.VIRTUAL_ENV).toBe('${containerWorkspaceFolder}/.venv');

        // Verify PATH includes .venv/bin
        expect(devcontainer.remoteEnv?.PATH).toContain('.venv/bin');

        // Clean up
        fs.rmSync(projectRoot, { recursive: true });
    });

    it('should add setup-python.sh script to postCreateCommand', async () => {
        const projectRoot = path.join(TEST_OUTPUT_DIR, 'test-python-venv-setup-script');
        const outputPath = path.join(projectRoot, '.devcontainer');

        if (fs.existsSync(projectRoot)) {
            fs.rmSync(projectRoot, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['python'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const devcontainerPath = path.join(outputPath, 'devcontainer.json');
        const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

        // Verify postCreateCommand includes the python setup script
        const postCreate = devcontainer.postCreateCommand;
        expect(postCreate).toBeDefined();
        const commands = typeof postCreate === 'object' ? Object.values(postCreate) : [postCreate];
        expect(commands.some((cmd: unknown) => String(cmd).includes('setup-python.sh'))).toBe(true);

        // Verify setup-python.sh was copied to scripts directory
        const setupScriptPath = path.join(outputPath, 'scripts', 'setup-python.sh');
        expect(fs.existsSync(setupScriptPath)).toBe(true);

        // Clean up
        fs.rmSync(projectRoot, { recursive: true });
    });

    it('setup-python.sh should contain venv creation commands', () => {
        const repoRoot = path.join(__dirname, '..', '..');
        const setupShPath = path.join(repoRoot, 'overlays', 'python', 'setup.sh');

        expect(fs.existsSync(setupShPath)).toBe(true);

        const content = fs.readFileSync(setupShPath, 'utf-8');

        // Verify venv is created using python3
        expect(content).toContain('python3 -m venv');
        expect(content).toContain('.venv');

        // Verify activation
        expect(content).toContain('source');
        expect(content).toContain('activate');

        // Verify requirements.txt is installed into venv (no --user flag)
        expect(content).toContain('pip install -r requirements.txt');
        expect(content).not.toContain('pip install --user -r requirements.txt');

        // Verify requirements-dev.txt is also handled
        expect(content).toContain('requirements-dev.txt');

        // setup.sh should NOT manage .gitignore — that is the composer's responsibility
        expect(content).not.toContain('>> .gitignore');
        expect(content).not.toContain('GITIGNORE_FILE');
    });

    it('setup-ollama.sh should install the CLI from the release tarball', () => {
        const repoRoot = path.join(__dirname, '..', '..');
        const setupShPath = path.join(repoRoot, 'overlays', 'ollama', 'setup.sh');

        expect(fs.existsSync(setupShPath)).toBe(true);

        const content = fs.readFileSync(setupShPath, 'utf-8');

        expect(content).toContain('detect_arch');
        expect(content).toContain('ollama-linux-${CS_ARCH}.tgz');
        expect(content).toContain('sudo tar -xzf - -C /usr/local');
        expect(content).not.toContain('https://ollama.com/install.sh');
    });

    it('devcontainer.patch.json should reference .venv interpreter path', () => {
        const repoRoot = path.join(__dirname, '..', '..');
        const patchPath = path.join(repoRoot, 'overlays', 'python', 'devcontainer.patch.json');

        expect(fs.existsSync(patchPath)).toBe(true);

        const patch = JSON.parse(fs.readFileSync(patchPath, 'utf-8'));

        expect(patch.customizations?.vscode?.settings?.['python.defaultInterpreterPath']).toBe(
            '${workspaceFolder}/.venv/bin/python'
        );

        expect(patch.remoteEnv?.VIRTUAL_ENV).toBeDefined();
        expect(patch.remoteEnv?.PATH).toContain('.venv/bin');
    });
});

describe('Gitignore - first-class overlay support', () => {
    // Each test uses its own parent directory so .gitignore files don’t collide between tests
    const GITIGNORE_TEST_ROOT = path.join(REPO_ROOT, 'tmp', 'test-gitignore');

    it('python overlay writes gitignore patterns at project root', async () => {
        const projectRoot = path.join(GITIGNORE_TEST_ROOT, 'python-gitignore-basic');
        const outputPath = path.join(projectRoot, '.devcontainer');

        if (fs.existsSync(projectRoot)) fs.rmSync(projectRoot, { recursive: true });

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['python'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        // .gitignore should be at project root (parent of outputPath)
        const gitignorePath = path.join(projectRoot, '.gitignore');
        expect(fs.existsSync(gitignorePath)).toBe(true);

        const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
        expect(gitignore).toContain('.venv/');
        expect(gitignore).toContain('__pycache__/');
        expect(gitignore).toContain('*.pyc');
        expect(gitignore).toContain('.pytest_cache/');
        expect(gitignore).toContain('# python (container-superposition)');

        fs.rmSync(projectRoot, { recursive: true });
    });

    it('gitignore entries are not duplicated on re-run', async () => {
        const projectRoot = path.join(GITIGNORE_TEST_ROOT, 'python-gitignore-dedup');
        const outputPath = path.join(projectRoot, '.devcontainer');

        if (fs.existsSync(projectRoot)) fs.rmSync(projectRoot, { recursive: true });
        fs.mkdirSync(projectRoot, { recursive: true });

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['python'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);
        await composeDevContainer(answers);

        const gitignorePath = path.join(projectRoot, '.gitignore');
        const content = fs.readFileSync(gitignorePath, 'utf-8');

        // Count occurrences of the sentinel pattern — should appear exactly once
        const occurrences = (content.match(/\.venv\//g) ?? []).length;
        expect(occurrences).toBe(1);

        fs.rmSync(projectRoot, { recursive: true });
    });

    it('merges into existing .gitignore without touching existing entries', async () => {
        const projectRoot = path.join(GITIGNORE_TEST_ROOT, 'python-gitignore-existing');
        const outputPath = path.join(projectRoot, '.devcontainer');

        if (fs.existsSync(projectRoot)) fs.rmSync(projectRoot, { recursive: true });
        fs.mkdirSync(projectRoot, { recursive: true });

        // Pre-existing .gitignore with unrelated content
        const existingGitignore = '# My Project\nnode_modules/\n.DS_Store\n';
        fs.writeFileSync(path.join(projectRoot, '.gitignore'), existingGitignore);

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['python'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const gitignorePath = path.join(projectRoot, '.gitignore');
        const content = fs.readFileSync(gitignorePath, 'utf-8');

        // Original entries are preserved
        expect(content).toContain('node_modules/');
        expect(content).toContain('.DS_Store');

        // Python entries are appended
        expect(content).toContain('.venv/');
        expect(content).toContain('__pycache__/');

        fs.rmSync(projectRoot, { recursive: true });
    });

    it('overlays without .gitignore file do not create one', async () => {
        const projectRoot = path.join(GITIGNORE_TEST_ROOT, 'nodejs-gitignore-none');
        const outputPath = path.join(projectRoot, '.devcontainer');

        if (fs.existsSync(projectRoot)) fs.rmSync(projectRoot, { recursive: true });

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const gitignorePath = path.join(projectRoot, '.gitignore');
        // nodejs overlay has no .gitignore — no file should be created
        expect(fs.existsSync(gitignorePath)).toBe(false);

        fs.rmSync(projectRoot, { recursive: true });
    });
});
