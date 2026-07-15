import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { composeDevContainer } from '../questionnaire/composer.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { loadProjectConfig, serializeProjectConfig } from '../schema/project-config.js';
import type { QuestionnaireAnswers } from '../schema/types.js';
import { deriveDefaultComposeNetworkName } from '../utils/compose-network.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);

function readCompose(outputPath: string): any {
    return yaml.load(fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')) as any;
}

function runInitCli(args: string[], cwd: string): string {
    return execFileSync(
        process.execPath,
        [TSX_CLI, path.join(REPO_ROOT, 'scripts', 'init.ts'), ...args],
        {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0' },
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }
    );
}

describe('Compose network name', () => {
    let workspaceDir: string;

    beforeEach(() => {
        workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-network-name-'));
    });

    afterEach(() => {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
    });

    it('loads and serializes composeNetworkName in superposition.yml', () => {
        const repoDir = path.join(workspaceDir, 'repo-config');
        fs.mkdirSync(repoDir, { recursive: true });
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                overlays: ['postgres'],
                composeNetworkName: 'team-a-devnet',
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded?.selection.composeNetworkName).toBe('team-a-devnet');

        const serialized = serializeProjectConfig(loaded!.selection);
        expect(serialized).toContain('composeNetworkName: team-a-devnet');
    });

    it('rejects composeNetworkName on plain stacks', () => {
        const repoDir = path.join(workspaceDir, 'repo-plain');
        fs.mkdirSync(repoDir, { recursive: true });
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                composeNetworkName: 'team-a-devnet',
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /composeNetworkName requires stack: compose/
        );
    });

    it('derives stable repo-specific default compose network names', () => {
        const repoA = path.join(workspaceDir, 'alpha-app');
        const repoB = path.join(workspaceDir, 'beta app');

        expect(deriveDefaultComposeNetworkName(repoA)).toBe('alpha-app-devnet');
        expect(deriveDefaultComposeNetworkName(repoB)).toBe('beta-app-devnet');
        expect(deriveDefaultComposeNetworkName(repoA)).not.toBe(
            deriveDefaultComposeNetworkName(repoB)
        );
        expect(deriveDefaultComposeNetworkName(repoA)).toBe('alpha-app-devnet');
    });

    it('writes the derived default compose network name into generated compose output', async () => {
        const repoDir = path.join(workspaceDir, 'repo-derived-default');
        const outputPath = path.join(repoDir, '.devcontainer');
        fs.mkdirSync(repoDir, { recursive: true });

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
        };

        await composeDevContainer(answers);

        expect(readCompose(outputPath).networks.devnet.name).toBe('repo-derived-default-devnet');
    });

    it('uses explicit composeNetworkName while keeping the logical devnet key', async () => {
        const repoDir = path.join(workspaceDir, 'repo-explicit');
        const outputPath = path.join(repoDir, '.devcontainer');
        fs.mkdirSync(repoDir, { recursive: true });

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
            composeNetworkName: 'team-a-devnet',
        };

        await composeDevContainer(answers);

        const compose = readCompose(outputPath);
        expect(compose.networks.devnet.name).toBe('team-a-devnet');
        expect(compose.services.devcontainer.networks).toContain('devnet');
        expect(compose.services.postgres.networks).toContain('devnet');
    });

    it('fails init before writes when composeNetworkName is used on a plain stack', () => {
        const repoDir = path.join(workspaceDir, 'repo-cli-plain');
        fs.mkdirSync(repoDir, { recursive: true });

        try {
            runInitCli(
                [
                    'init',
                    '--stack',
                    'plain',
                    '--language',
                    'nodejs',
                    '--compose-network-name',
                    'team-a-devnet',
                ],
                repoDir
            );
            throw new Error('Expected init to fail');
        } catch (error: any) {
            const stderr = error?.stderr ?? '';
            expect(stderr).toContain('composeNetworkName requires stack: compose');
            expect(fs.existsSync(path.join(repoDir, '.superposition.yml'))).toBe(false);
            expect(fs.existsSync(path.join(repoDir, '.devcontainer'))).toBe(false);
        }
    });

    it('surfaces the effective compose network name during replay', () => {
        const repoDir = path.join(workspaceDir, 'repo-cli-compose');
        fs.mkdirSync(repoDir, { recursive: true });
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                overlays: ['postgres'],
                composeNetworkName: 'team-a-devnet',
                outputPath: './.devcontainer',
            })
        );

        const output = runInitCli(['regen'], repoDir);
        expect(output).toContain('Compose network: team-a-devnet');
        expect(readCompose(path.join(repoDir, '.devcontainer')).networks.devnet.name).toBe(
            'team-a-devnet'
        );
    });
});
