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

    it('defaults to the manifest generator version for plain projects without nodejs', async () => {
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
        expect(installer).toContain(`CS_PACKAGE_SELECTION='${manifest.generatedBy}'`);
        expect(installer).toContain(`CS_EXPECTED_VERSION='${manifest.generatedBy}'`);
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

    it.each(['0.1.13', 'prerelease', 'latest', '2024-release', '_next', '-next', 'foo..bar'])(
        'preserves npm selection %s through manifest replay and generation',
        async (selection) => {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                yaml.dump({ stack: 'compose', installCsCommand: selection })
            );
            const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
            expect(loaded.selection.installCsCommand).toBe(selection);
            expect(
                (yaml.load(serializeProjectConfig(loaded.selection)) as Record<string, unknown>)
                    .installCsCommand
            ).toBe(selection);
            const answers = mergeAnswers(
                buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
            );
            answers.outputPath = path.join(repoDir, '.devcontainer');
            await composeDevContainer(answers, OVERLAYS_DIR);
            const installer = fs.readFileSync(
                path.join(answers.outputPath, 'scripts', 'setup-container-superposition.sh'),
                'utf8'
            );
            expect(installer).toContain(`CS_PACKAGE_SELECTION='${selection}'`);
            expect(installer).toContain(
                `CS_EXPECTED_VERSION='${selection === '0.1.13' ? selection : ''}'`
            );
            const manifest = JSON.parse(
                fs.readFileSync(path.join(answers.outputPath, 'superposition.json'), 'utf8')
            );
            expect(manifest.installCsCommand).toBe(selection);
            expect(
                buildAnswersFromManifest(manifest, overlaysConfig, answers.outputPath)
                    .installCsCommand
            ).toBe(selection);
        }
    );

    it('treats explicit true as the generator version', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            'stack: plain\ninstallCsCommand: true\n'
        );
        const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
        );
        answers.outputPath = path.join(repoDir, '.devcontainer');
        await composeDevContainer(answers, OVERLAYS_DIR);
        expect(
            fs.readFileSync(
                path.join(answers.outputPath, 'scripts', 'setup-container-superposition.sh'),
                'utf8'
            )
        ).toContain(`CS_PACKAGE_SELECTION='${getToolVersion()}'`);
    });

    it('uses the configured output path for the lifecycle installer command', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', outputPath: './generated-from-project' })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
        );
        answers.outputPath = path.join(repoDir, 'generated-from-project');
        await composeDevContainer(answers, OVERLAYS_DIR);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(answers.outputPath, 'devcontainer.json'), 'utf8')
        );
        expect(devcontainer.postCreateCommand['setup-container-superposition']).toBe(
            'bash generated-from-project/scripts/setup-container-superposition.sh'
        );
    });

    it('rejects unsafe package selections before generation and coexists with the nodejs overlay', async () => {
        for (const invalid of [
            '',
            'latest; echo bad',
            '@scope/package',
            '../local',
            '1.2',
            '1.2.x',
            'v1',
            'v1.2',
            'x',
            'X',
            123,
            null,
            [],
        ]) {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                yaml.dump({ stack: 'plain', installCsCommand: invalid })
            );
            expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
                'installCsCommand must be a boolean or npm version/dist-tag'
            );
        }

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
