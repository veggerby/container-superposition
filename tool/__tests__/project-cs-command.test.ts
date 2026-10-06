import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import {
    buildAnswersFromManifest,
    buildAnswersFromProjectConfig,
    loadProjectConfig,
    serializeProjectConfig,
} from '../schema/project-config.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { mergeAnswers } from '../questionnaire/answers.js';
import { getToolVersion } from '../utils/version.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, path.join(OVERLAYS_DIR, 'index.yml'));

describe('project installCsCommand', () => {
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-cs-command-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('defaults to enabled and pins the installer for plain projects without nodejs', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', outputPath: './.devcontainer' })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
        expect(loaded.selection.installCsCommand).toBeUndefined();
        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
        );
        answers.outputPath = path.join(repoDir, '.devcontainer');
        await composeDevContainer(answers, OVERLAYS_DIR);

        const output = answers.outputPath;
        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(output, 'devcontainer.json'), 'utf8')
        );
        const installer = fs.readFileSync(
            path.join(output, 'scripts', 'setup-container-superposition.sh'),
            'utf8'
        );
        const manifest = JSON.parse(
            fs.readFileSync(path.join(output, 'superposition.json'), 'utf8')
        );

        expect(devcontainer.features['ghcr.io/devcontainers/features/node:1']).toEqual({
            version: 'lts',
        });
        expect(devcontainer.remoteEnv.PATH).toContain('${containerEnv:HOME}/.npm-global/bin');
        expect(devcontainer.postCreateCommand['setup-container-superposition']).toBe(
            'bash .devcontainer/scripts/setup-container-superposition.sh'
        );
        expect(installer).toContain(`CS_VERSION='${getToolVersion()}'`);
        expect(installer).toContain('cs --version');
        expect(manifest.installCsCommand).toBeUndefined();
    });

    it('preserves an explicit opt-out through project serialization and manifest replay', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'compose', overlays: ['postgres'], installCsCommand: false })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
        expect(loaded.selection.installCsCommand).toBe(false);
        expect(serializeProjectConfig(loaded.selection)).toContain('installCsCommand: false');

        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
        );
        answers.outputPath = path.join(repoDir, '.devcontainer');
        await composeDevContainer(answers, OVERLAYS_DIR);

        const output = answers.outputPath;
        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(output, 'devcontainer.json'), 'utf8')
        );
        const manifest = JSON.parse(
            fs.readFileSync(path.join(output, 'superposition.json'), 'utf8')
        );
        expect(devcontainer.features?.['ghcr.io/devcontainers/features/node:1']).toBeUndefined();
        expect(devcontainer.postCreateCommand?.['setup-container-superposition']).toBeUndefined();
        expect(
            fs.existsSync(path.join(output, 'scripts', 'setup-container-superposition.sh'))
        ).toBe(false);
        expect(manifest.installCsCommand).toBe(false);
        expect(buildAnswersFromManifest(manifest, overlaysConfig, output).installCsCommand).toBe(
            false
        );
    });

    it('rejects non-boolean values before generation and coexists with the nodejs overlay', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', installCsCommand: 'yes' })
        );
        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            'installCsCommand must be a boolean'
        );

        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'], installCsCommand: true })
        );
        const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
        );
        answers.outputPath = path.join(repoDir, '.devcontainer');
        await composeDevContainer(answers, OVERLAYS_DIR);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(answers.outputPath, 'devcontainer.json'), 'utf8')
        );
        expect(
            Object.keys(devcontainer.features).filter(
                (key) => key === 'ghcr.io/devcontainers/features/node:1'
            )
        ).toHaveLength(1);
        expect(
            devcontainer.features['ghcr.io/devcontainers/features/node:1'].nodeGypDependencies
        ).toBe(true);
    });
});
