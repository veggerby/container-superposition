import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import {
    getTargetRule,
    resolveTargetFilePath,
    removeStaleTargetArtifacts,
} from '../schema/target-rules.js';
import type { TargetRuleContext } from '../schema/target-rules.js';
import type { QuestionnaireAnswers, OverlayMetadata, DeploymentTarget } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..', '..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'test-target-gen');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContext(
    target: DeploymentTarget,
    outputPath: string,
    projectRoot: string,
    overlays: string[] = [],
    overlayMeta?: Map<string, OverlayMetadata>
): TargetRuleContext {
    return {
        overlays,
        overlayMetadata: overlayMeta ?? new Map(),
        portOffset: 0,
        stack: 'compose',
        outputPath,
        projectRoot,
    };
}

function cleanDir(dir: string): void {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
    }
}

// ─── Unit tests for TargetRule implementations ───────────────────────────────

describe('Target Rules — unit', () => {
    describe('local rule', () => {
        const rule = getTargetRule('local');

        it('produces no devcontainer patch', () => {
            const ctx = makeContext('local', '/tmp/out', '/tmp');
            expect(rule.devcontainerPatch(ctx)).toEqual({});
        });

        it('generates no files', () => {
            const ctx = makeContext('local', '/tmp/out', '/tmp');
            expect(rule.generateFiles(ctx).size).toBe(0);
        });

        it('owns no files', () => {
            expect(rule.ownedFiles()).toHaveLength(0);
        });
    });

    describe('codespaces rule', () => {
        const rule = getTargetRule('codespaces');

        it('adds hostRequirements to devcontainer.json', () => {
            const ctx = makeContext('codespaces', '/tmp/out', '/tmp');
            const patch = rule.devcontainerPatch(ctx);
            expect(patch).toHaveProperty('hostRequirements');
            const req = (patch as any).hostRequirements;
            expect(req.cpus).toBeGreaterThan(0);
            expect(typeof req.memory).toBe('string');
            expect(typeof req.storage).toBe('string');
        });

        it('recommends larger machine when many service overlays selected', () => {
            const meta = new Map<string, OverlayMetadata>();
            for (const id of ['postgres', 'redis', 'prometheus', 'grafana']) {
                meta.set(id, {
                    id,
                    name: id,
                    description: '',
                    category: id === 'postgres' || id === 'redis' ? 'database' : 'observability',
                });
            }
            const ctx = makeContext('codespaces', '/tmp/out', '/tmp', [...meta.keys()], meta);
            const patch = rule.devcontainerPatch(ctx);
            expect((patch as any).hostRequirements.cpus).toBeGreaterThanOrEqual(8);
        });

        it('generates CODESPACES.md in outputPath', () => {
            const ctx = makeContext('codespaces', '/tmp/out', '/tmp');
            const files = rule.generateFiles(ctx);
            expect(files.has('CODESPACES.md')).toBe(true);
            const content = files.get('CODESPACES.md')!;
            expect(content).toContain('GitHub Codespaces');
            expect(content).toContain('hostRequirements');
        });

        it('CODESPACES.md lists selected overlay names', () => {
            const meta = new Map<string, OverlayMetadata>();
            meta.set('nodejs', {
                id: 'nodejs',
                name: 'Node.js',
                description: '',
                category: 'language',
            });
            const ctx = makeContext('codespaces', '/tmp/out', '/tmp', ['nodejs'], meta);
            const content = rule.generateFiles(ctx).get('CODESPACES.md')!;
            expect(content).toContain('Node.js');
        });

        it('CODESPACES.md includes port information when ports are declared', () => {
            const meta = new Map<string, OverlayMetadata>();
            meta.set('postgres', {
                id: 'postgres',
                name: 'PostgreSQL',
                description: '',
                category: 'database',
                ports: [{ port: 5432, service: 'postgres', description: 'DB', protocol: 'tcp' }],
            });
            const ctx = makeContext('codespaces', '/tmp/out', '/tmp', ['postgres'], meta);
            const content = rule.generateFiles(ctx).get('CODESPACES.md')!;
            expect(content).toContain('5432');
        });

        it('owns CODESPACES.md', () => {
            expect(rule.ownedFiles()).toContain('CODESPACES.md');
        });
    });

    describe('gitpod rule', () => {
        const rule = getTargetRule('gitpod');

        it('produces no devcontainer patch', () => {
            const ctx = makeContext('gitpod', '/tmp/out', '/tmp');
            expect(rule.devcontainerPatch(ctx)).toEqual({});
        });

        it('generates .gitpod.yml at project root (../ prefix) and GITPOD.md in outputPath', () => {
            const ctx = makeContext('gitpod', '/tmp/out', '/tmp');
            const files = rule.generateFiles(ctx);
            expect(files.has('../.gitpod.yml')).toBe(true);
            expect(files.has('GITPOD.md')).toBe(true);
        });

        it('.gitpod.yml references devcontainer', () => {
            const ctx = makeContext('gitpod', '/tmp/out', '/tmp');
            const yml = rule.generateFiles(ctx).get('../.gitpod.yml')!;
            expect(yml).toContain('image:');
            expect(yml).toContain('devcontainer');
        });

        it('.gitpod.yml includes ports section when overlays declare ports', () => {
            const meta = new Map<string, OverlayMetadata>();
            meta.set('grafana', {
                id: 'grafana',
                name: 'Grafana',
                description: '',
                category: 'observability',
                ports: [
                    { port: 3000, service: 'grafana', description: 'Dashboard', protocol: 'http' },
                ],
            });
            const ctx = makeContext('gitpod', '/tmp/out', '/tmp', ['grafana'], meta);
            const yml = rule.generateFiles(ctx).get('../.gitpod.yml')!;
            expect(yml).toContain('port: 3000');
        });

        it('GITPOD.md contains Gitpod badge/URL instructions', () => {
            const ctx = makeContext('gitpod', '/tmp/out', '/tmp');
            const md = rule.generateFiles(ctx).get('GITPOD.md')!;
            expect(md).toContain('gitpod.io');
            expect(md).toContain('.gitpod.yml');
        });

        it('owns ../.gitpod.yml and GITPOD.md', () => {
            expect(rule.ownedFiles()).toContain('../.gitpod.yml');
            expect(rule.ownedFiles()).toContain('GITPOD.md');
        });
    });

    describe('devpod rule', () => {
        const rule = getTargetRule('devpod');

        it('produces no devcontainer patch', () => {
            const ctx = makeContext('devpod', '/tmp/out', '/tmp');
            expect(rule.devcontainerPatch(ctx)).toEqual({});
        });

        it('generates devpod.yaml at project root and DEVPOD.md in outputPath', () => {
            const ctx = makeContext('devpod', '/tmp/out', '/tmp');
            const files = rule.generateFiles(ctx);
            expect(files.has('../devpod.yaml')).toBe(true);
            expect(files.has('DEVPOD.md')).toBe(true);
        });

        it('devpod.yaml references devcontainerPath', () => {
            const ctx = makeContext('devpod', '/tmp/out', '/tmp');
            const yaml = rule.generateFiles(ctx).get('../devpod.yaml')!;
            expect(yaml).toContain('devcontainerPath');
        });

        it('DEVPOD.md contains devpod up instructions', () => {
            const ctx = makeContext('devpod', '/tmp/out', '/tmp');
            const md = rule.generateFiles(ctx).get('DEVPOD.md')!;
            expect(md).toContain('devpod up');
            expect(md).toContain('devpod.yaml');
        });

        it('owns ../devpod.yaml and DEVPOD.md', () => {
            expect(rule.ownedFiles()).toContain('../devpod.yaml');
            expect(rule.ownedFiles()).toContain('DEVPOD.md');
        });
    });

    describe('getTargetRule', () => {
        it('returns a rule for every declared target', () => {
            const targets: DeploymentTarget[] = ['local', 'codespaces', 'gitpod', 'devpod'];
            for (const t of targets) {
                expect(() => getTargetRule(t)).not.toThrow();
            }
        });
    });

    describe('resolveTargetFilePath', () => {
        it('resolves outputPath-relative keys to outputPath', () => {
            const result = resolveTargetFilePath('CODESPACES.md', '/proj/.devcontainer', '/proj');
            expect(result).toBe(path.join('/proj/.devcontainer', 'CODESPACES.md'));
        });

        it('resolves ../ keys to projectRoot', () => {
            const result = resolveTargetFilePath('../.gitpod.yml', '/proj/.devcontainer', '/proj');
            expect(result).toBe(path.join('/proj', '.gitpod.yml'));
        });
    });
});

// ─── removeStaleTargetArtifacts ───────────────────────────────────────────────

describe('removeStaleTargetArtifacts', () => {
    const tmpRoot = path.join(REPO_ROOT, 'tmp', 'test-target-stale');

    beforeEach(() => {
        cleanDir(tmpRoot);
        fs.mkdirSync(tmpRoot, { recursive: true });
    });

    afterEach(() => {
        cleanDir(tmpRoot);
    });

    it('removes .gitpod.yml when switching from gitpod to local', () => {
        const gitpodFile = path.join(tmpRoot, '.gitpod.yml');
        fs.writeFileSync(gitpodFile, 'image: ...');

        removeStaleTargetArtifacts('gitpod', 'local', tmpRoot);

        expect(fs.existsSync(gitpodFile)).toBe(false);
    });

    it('removes devpod.yaml when switching from devpod to codespaces', () => {
        const devpodFile = path.join(tmpRoot, 'devpod.yaml');
        fs.writeFileSync(devpodFile, 'devcontainerPath: ...');

        removeStaleTargetArtifacts('devpod', 'codespaces', tmpRoot);

        expect(fs.existsSync(devpodFile)).toBe(false);
    });

    it('does nothing when target stays the same', () => {
        const gitpodFile = path.join(tmpRoot, '.gitpod.yml');
        fs.writeFileSync(gitpodFile, 'image: ...');

        removeStaleTargetArtifacts('gitpod', 'gitpod', tmpRoot);

        expect(fs.existsSync(gitpodFile)).toBe(true);
    });

    it('does not fail when stale file does not exist', () => {
        expect(() => {
            removeStaleTargetArtifacts('gitpod', 'local', tmpRoot);
        }).not.toThrow();
    });
});

// ─── Integration: composeDevContainer with target ────────────────────────────

describe('composeDevContainer — target-aware generation', () => {
    beforeEach(() => {
        cleanDir(TEST_OUTPUT_DIR);
        fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    });

    afterEach(() => {
        cleanDir(TEST_OUTPUT_DIR);
    });

    it('--target local produces no target-specific files', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'local');
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            target: 'local',
        };

        await composeDevContainer(answers);

        expect(fs.existsSync(path.join(outputPath, 'CODESPACES.md'))).toBe(false);
        expect(fs.existsSync(path.join(outputPath, 'GITPOD.md'))).toBe(false);
        expect(fs.existsSync(path.join(outputPath, 'DEVPOD.md'))).toBe(false);
        expect(fs.existsSync(path.join(path.dirname(outputPath), '.gitpod.yml'))).toBe(false);
        expect(fs.existsSync(path.join(path.dirname(outputPath), 'devpod.yaml'))).toBe(false);
    });

    it('no --target produces no target-specific files (default = local)', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'default');
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            // target intentionally omitted
        };

        await composeDevContainer(answers);

        expect(fs.existsSync(path.join(outputPath, 'CODESPACES.md'))).toBe(false);
        expect(fs.existsSync(path.join(outputPath, 'GITPOD.md'))).toBe(false);
        expect(fs.existsSync(path.join(outputPath, 'DEVPOD.md'))).toBe(false);
    });

    it('--target codespaces writes CODESPACES.md and extends devcontainer.json with hostRequirements', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'codespaces');
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
            target: 'codespaces',
        };

        await composeDevContainer(answers);

        // CODESPACES.md should exist inside .devcontainer/
        const csMdPath = path.join(outputPath, 'CODESPACES.md');
        expect(fs.existsSync(csMdPath)).toBe(true);
        const md = fs.readFileSync(csMdPath, 'utf-8');
        expect(md).toContain('GitHub Codespaces');

        // devcontainer.json should have hostRequirements
        const dc = JSON.parse(fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf-8'));
        expect(dc).toHaveProperty('hostRequirements');
        expect(dc.hostRequirements.cpus).toBeGreaterThan(0);

        // superposition.json should record the target
        const manifest = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'superposition.json'), 'utf-8')
        );
        expect(manifest.target).toBe('codespaces');

        // No Gitpod or DevPod files
        expect(fs.existsSync(path.join(outputPath, 'GITPOD.md'))).toBe(false);
        expect(fs.existsSync(path.join(outputPath, 'DEVPOD.md'))).toBe(false);
    });

    it('--target gitpod writes .gitpod.yml at project root and GITPOD.md in outputPath', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'gitpod');
        const projectRoot = path.dirname(outputPath);
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            target: 'gitpod',
        };

        await composeDevContainer(answers);

        // .gitpod.yml at project root
        const gitpodPath = path.join(projectRoot, '.gitpod.yml');
        expect(fs.existsSync(gitpodPath)).toBe(true);
        const gitpodYml = fs.readFileSync(gitpodPath, 'utf-8');
        expect(gitpodYml).toContain('image:');
        expect(gitpodYml).toContain('tasks:');

        // GITPOD.md inside .devcontainer/
        const gitpodMdPath = path.join(outputPath, 'GITPOD.md');
        expect(fs.existsSync(gitpodMdPath)).toBe(true);
        expect(fs.readFileSync(gitpodMdPath, 'utf-8')).toContain('gitpod.io');

        // superposition.json records target
        const manifest = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'superposition.json'), 'utf-8')
        );
        expect(manifest.target).toBe('gitpod');

        // Clean up project-root file
        if (fs.existsSync(gitpodPath)) fs.unlinkSync(gitpodPath);
    });

    it('--target devpod writes devpod.yaml at project root and DEVPOD.md in outputPath', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'devpod');
        const projectRoot = path.dirname(outputPath);
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            target: 'devpod',
        };

        await composeDevContainer(answers);

        // devpod.yaml at project root
        const devpodPath = path.join(projectRoot, 'devpod.yaml');
        expect(fs.existsSync(devpodPath)).toBe(true);
        const devpodYaml = fs.readFileSync(devpodPath, 'utf-8');
        expect(devpodYaml).toContain('devcontainerPath');

        // DEVPOD.md inside .devcontainer/
        const devpodMdPath = path.join(outputPath, 'DEVPOD.md');
        expect(fs.existsSync(devpodMdPath)).toBe(true);
        expect(fs.readFileSync(devpodMdPath, 'utf-8')).toContain('devpod up');

        // superposition.json records target
        const manifest = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'superposition.json'), 'utf-8')
        );
        expect(manifest.target).toBe('devpod');

        // Clean up project-root file
        if (fs.existsSync(devpodPath)) fs.unlinkSync(devpodPath);
    });

    it('switching from gitpod to local removes .gitpod.yml on regen', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'switch-gitpod-to-local');
        const projectRoot = path.dirname(outputPath);
        const gitpodPath = path.join(projectRoot, '.gitpod.yml');

        // First run: gitpod
        const answersGitpod: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            target: 'gitpod',
        };
        await composeDevContainer(answersGitpod);
        expect(fs.existsSync(gitpodPath)).toBe(true);

        // Second run: local
        const answersLocal: QuestionnaireAnswers = {
            ...answersGitpod,
            target: 'local',
        };
        await composeDevContainer(answersLocal, undefined, { isRegen: true });
        expect(fs.existsSync(gitpodPath)).toBe(false);

        // GITPOD.md also removed (via FileRegistry / cleanupStaleFiles)
        expect(fs.existsSync(path.join(outputPath, 'GITPOD.md'))).toBe(false);
    });

    it('switching from devpod to codespaces removes devpod.yaml on regen', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'switch-devpod-to-codespaces');
        const projectRoot = path.dirname(outputPath);
        const devpodPath = path.join(projectRoot, 'devpod.yaml');

        // First run: devpod
        const answersDevpod: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            target: 'devpod',
        };
        await composeDevContainer(answersDevpod);
        expect(fs.existsSync(devpodPath)).toBe(true);

        // Second run: codespaces
        const answersCodespaces: QuestionnaireAnswers = {
            ...answersDevpod,
            target: 'codespaces',
        };
        await composeDevContainer(answersCodespaces, undefined, { isRegen: true });
        expect(fs.existsSync(devpodPath)).toBe(false);
        expect(fs.existsSync(path.join(outputPath, 'CODESPACES.md'))).toBe(true);

        // Clean up
        cleanDir(outputPath);
    });

    it('target is written to superposition.json for local target', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'manifest-local-target');
        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            target: 'local',
        };

        await composeDevContainer(answers);

        const manifest = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'superposition.json'), 'utf-8')
        );
        expect(manifest.target).toBe('local');
    });
});
