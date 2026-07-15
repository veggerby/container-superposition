import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    buildAnswersFromGlobalInitDefaults,
    loadGlobalDefaults,
    mergeInitDefaultsWithCliInputs,
    serializeLocalProjectConfig,
} from '../schema/project-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function runCli(args: string[], cwd: string, homeDir: string) {
    const result = spawnSync(
        process.execPath,
        [TSX_CLI, path.join(REPO_ROOT, 'scripts', 'init.ts'), ...args],
        {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0', HOME: homeDir },
            encoding: 'utf8',
        }
    );

    return {
        status: result.status ?? 1,
        stdout: result.stdout,
        stderr: result.stderr,
    };
}

describe('Global init defaults', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;
    let homeDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'global-defaults-repo-'));
        homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'global-defaults-home-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
        fs.rmSync(homeDir, { recursive: true, force: true });
    });

    it('loads supported global defaults and merges overlay defaults with CLI selections', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                initDefaults: {
                    devcontainerGitignore: true,
                    overlays: ['git-helpers'],
                    outputPath: './global-output',
                },
                localConfigTemplate: {
                    mounts: [
                        {
                            source: '${HOME}/.pi',
                            destination: '/home/vscode/.pi',
                            type: 'bind',
                            target: 'devcontainerMount',
                        },
                    ],
                },
            })
        );

        const loaded = loadGlobalDefaults(overlaysConfig, homeDir);
        expect(loaded?.path).toBe(path.join(homeDir, '.container-superposition.yml'));
        expect(loaded?.selection.initDefaults?.devcontainerGitignore).toBe(true);
        expect((loaded?.selection.localConfigTemplate as any)?.mounts).toHaveLength(1);

        const seeded = buildAnswersFromGlobalInitDefaults(
            loaded?.selection.initDefaults,
            overlaysConfig
        );
        const merged = mergeInitDefaultsWithCliInputs(seeded, {
            language: ['nodejs'],
            outputPath: './cli-output',
        });

        expect(merged.devTools).toContain('git-helpers');
        expect(merged.language).toContain('nodejs');
        expect(merged.outputPath).toBe('./cli-output');
        expect(serializeLocalProjectConfig(loaded!.selection.localConfigTemplate!)).toContain(
            'superposition.local.schema.json'
        );
    });

    it('loads stack-aware local config templates without expanding authored literals', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                localConfigTemplate: {
                    common: {
                        shell: {
                            aliases: {
                                ll: 'ls -alF',
                            },
                        },
                    },
                    compose: {
                        mounts: [
                            {
                                source: 'superposition-bash-history',
                                destination: '/commandhistory',
                                type: 'volume',
                                target: 'composeVolume',
                            },
                        ],
                        shell: {
                            snippets: ['export HISTFILE=${HOME}/.bash_history'],
                        },
                    },
                },
            })
        );

        const loaded = loadGlobalDefaults(overlaysConfig, homeDir);
        expect((loaded?.selection.localConfigTemplate as any)?.common?.shell?.aliases?.ll).toBe(
            'ls -alF'
        );
        expect((loaded?.selection.localConfigTemplate as any)?.compose?.mounts?.[0]?.target).toBe(
            'composeVolume'
        );
        expect((loaded?.selection.localConfigTemplate as any)?.compose?.shell?.snippets?.[0]).toBe(
            'export HISTFILE=${HOME}/.bash_history'
        );
    });

    it('rejects mixed-shape stack-aware local config templates before repo writes', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                localConfigTemplate: {
                    env: { DEBUG: 'true' },
                    compose: {
                        mounts: [
                            {
                                source: 'named-volume',
                                destination: '/data',
                                target: 'composeVolume',
                            },
                        ],
                    },
                },
            })
        );

        expect(() => loadGlobalDefaults(overlaysConfig, homeDir)).toThrow(
            'Unsupported local config template keys in localConfigTemplate: env'
        );
    });

    it('rejects unsupported global keys and unknown overlays', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                initDefaults: { overlays: ['not-a-real-overlay'] },
                unexpected: true,
            })
        );

        expect(() => loadGlobalDefaults(overlaysConfig, homeDir)).toThrow(
            'Invalid global defaults file'
        );
        expect(() => loadGlobalDefaults(overlaysConfig, homeDir)).toThrow(
            'Allowed top-level keys: $schema, initDefaults, localConfigTemplate.'
        );
    });

    it('applies global defaults on eligible clean init and creates a local template once', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                initDefaults: {
                    devcontainerGitignore: true,
                    overlays: ['git-helpers'],
                },
                localConfigTemplate: {
                    mounts: [
                        {
                            source: '${HOME}/.pi',
                            destination: '/home/vscode/.pi',
                            type: 'bind',
                            target: 'devcontainerMount',
                        },
                    ],
                },
            })
        );

        const result = runCli(['init', '--no-interactive'], repoDir, homeDir);
        expect(result.status).toBe(0);

        const projectConfig = yaml.load(
            fs.readFileSync(path.join(repoDir, '.superposition.yml'), 'utf8')
        ) as any;
        expect(projectConfig.devcontainerGitignore).toBe(true);
        expect(projectConfig.overlays).toContain('git-helpers');

        const localConfig = fs.readFileSync(path.join(repoDir, 'superposition.local.yml'), 'utf8');
        expect(localConfig).toContain('superposition.local.schema.json');
        expect(localConfig).toContain('/home/vscode/.pi');
        expect(fs.readFileSync(path.join(repoDir, '.gitignore'), 'utf8')).toContain(
            'superposition.local.yml'
        );
    });

    it('writes common + plain local defaults for plain init and ignores compose-only branch content', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                localConfigTemplate: {
                    common: {
                        shell: {
                            aliases: {
                                ll: 'ls -alF',
                            },
                        },
                    },
                    plain: {
                        mounts: [
                            {
                                source: '${HOME}/.pi',
                                destination: '/home/vscode/.pi',
                                type: 'bind',
                                target: 'devcontainerMount',
                            },
                        ],
                    },
                    compose: {
                        mounts: [
                            {
                                source: 'superposition-bash-history',
                                destination: '/commandhistory',
                                type: 'volume',
                                target: 'composeVolume',
                            },
                        ],
                    },
                },
            })
        );

        const result = runCli(
            ['init', '--stack', 'plain', '--language', 'nodejs'],
            repoDir,
            homeDir
        );
        expect(result.status).toBe(0);

        const localConfig = yaml.load(
            fs.readFileSync(path.join(repoDir, 'superposition.local.yml'), 'utf8')
        ) as any;
        expect(localConfig.shell.aliases.ll).toBe('ls -alF');
        expect(localConfig.mounts).toEqual([
            {
                source: '${HOME}/.pi',
                destination: '/home/vscode/.pi',
                type: 'bind',
                target: 'devcontainerMount',
            },
        ]);
        expect(JSON.stringify(localConfig)).not.toContain('composeVolume');
    });

    it('writes common + compose local defaults for compose init and preserves authored literals', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                localConfigTemplate: {
                    common: {
                        shell: {
                            aliases: {
                                ll: 'ls -alF',
                            },
                        },
                    },
                    compose: {
                        mounts: [
                            {
                                source: 'superposition-bash-history',
                                destination: '/commandhistory',
                                type: 'volume',
                                target: 'composeVolume',
                            },
                        ],
                        shell: {
                            snippets: [
                                '[ -n "$BASH_VERSION" ] && export HISTFILE=/commandhistory/.bash_history',
                                '[ -n "$BASH_VERSION" ] && export PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }history -a"',
                            ],
                        },
                    },
                },
            })
        );

        const result = runCli(
            ['init', '--stack', 'compose', '--language', 'nodejs'],
            repoDir,
            homeDir
        );
        expect(result.status).toBe(0);

        const localConfigText = fs.readFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            'utf8'
        );
        expect(localConfigText).toContain('superposition-bash-history');
        expect(localConfigText).toContain('composeVolume');
        expect(localConfigText).toContain('export HISTFILE=/commandhistory/.bash_history');
        expect(localConfigText).toContain(
            'export PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }history -a"'
        );
        expect(localConfigText).toContain('ll: ls -alF');
    });

    it('fails selected plain-stack local templates with compose-only mounts before repo writes', () => {
        fs.mkdirSync(path.join(repoDir, '.devcontainer'), { recursive: true });
        fs.writeFileSync(
            path.join(repoDir, '.devcontainer', 'devcontainer.json'),
            '{"before":true}\n'
        );
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                localConfigTemplate: {
                    plain: {
                        mounts: [
                            {
                                source: 'named-volume',
                                destination: '/data',
                                target: 'composeVolume',
                            },
                        ],
                    },
                },
            })
        );

        const result = runCli(
            ['init', '--stack', 'plain', '--language', 'nodejs'],
            repoDir,
            homeDir
        );
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Project mount target "composeVolume"');
        expect(result.stderr).toContain('requires stack: compose');
        expect(fs.existsSync(path.join(repoDir, '.superposition.yml'))).toBe(false);
        expect(fs.existsSync(path.join(repoDir, 'superposition.local.yml'))).toBe(false);
        expect(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'), 'utf8')
        ).toBe('{"before":true}\n');
    });

    it('does not overwrite an existing repo local config when global local templates are present', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            'env:\n  EXISTING: "true"\n'
        );
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                localConfigTemplate: {
                    common: {
                        shell: {
                            aliases: {
                                ll: 'ls -alF',
                            },
                        },
                    },
                    compose: {
                        mounts: [
                            {
                                source: 'superposition-bash-history',
                                destination: '/commandhistory',
                                type: 'volume',
                                target: 'composeVolume',
                            },
                        ],
                    },
                },
            })
        );

        const result = runCli(
            ['init', '--stack', 'compose', '--language', 'nodejs'],
            repoDir,
            homeDir
        );
        expect(result.status).toBe(0);
        expect(fs.readFileSync(path.join(repoDir, 'superposition.local.yml'), 'utf8')).toBe(
            'env:\n  EXISTING: "true"\n'
        );
    });

    it('ignores global defaults when --ignore-global-defaults is set', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                initDefaults: {
                    devcontainerGitignore: true,
                    overlays: ['git-helpers'],
                },
                localConfigTemplate: {
                    env: { DEBUG: 'true' },
                },
            })
        );

        const result = runCli(
            ['init', '--stack', 'plain', '--language', 'nodejs', '--ignore-global-defaults'],
            repoDir,
            homeDir
        );
        expect(result.status).toBe(0);

        const projectConfig = yaml.load(
            fs.readFileSync(path.join(repoDir, '.superposition.yml'), 'utf8')
        ) as any;
        expect(projectConfig.overlays).toEqual(['nodejs']);
        expect(projectConfig.devcontainerGitignore).toBeUndefined();
        expect(fs.existsSync(path.join(repoDir, 'superposition.local.yml'))).toBe(false);
    });

    it('fails eligible init before repo writes when global defaults are invalid', () => {
        fs.mkdirSync(path.join(repoDir, '.devcontainer'), { recursive: true });
        fs.writeFileSync(
            path.join(repoDir, '.devcontainer', 'devcontainer.json'),
            '{"before":true}\n'
        );
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            'initDefaults:\n  overlays: not-an-array\n'
        );

        const result = runCli(
            ['init', '--stack', 'plain', '--language', 'nodejs'],
            repoDir,
            homeDir
        );
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('.container-superposition.yml');
        expect(result.stderr).toContain('initDefaults.overlays must be an array');
        expect(fs.existsSync(path.join(repoDir, '.superposition.yml'))).toBe(false);
        expect(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'), 'utf8')
        ).toBe('{"before":true}\n');
    });

    it('fails non-interactive init before repo writes when global default overlays conflict', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                initDefaults: {
                    overlays: ['nodejs'],
                },
            })
        );

        const result = runCli(
            ['init', '--stack', 'compose', '--observability', 'grafana', '--no-interactive'],
            repoDir,
            homeDir
        );

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Conflicting overlays detected from global defaults file');
        expect(result.stderr).toContain('.container-superposition.yml');
        expect(result.stderr).toContain('grafana');
        expect(result.stderr).toContain('nodejs');
        expect(result.stderr).toContain('--ignore-global-defaults');
        expect(fs.existsSync(path.join(repoDir, '.superposition.yml'))).toBe(false);
        expect(fs.existsSync(path.join(repoDir, '.devcontainer'))).toBe(false);
        expect(fs.existsSync(path.join(repoDir, 'superposition.local.yml'))).toBe(false);
    });

    it('ignores invalid global defaults for project-file replay and regen', () => {
        fs.writeFileSync(path.join(homeDir, '.container-superposition.yml'), 'unexpected: true\n');
        fs.writeFileSync(
            path.join(repoDir, '.superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'], outputPath: './project-output' })
        );

        const fromProject = runCli(
            ['init', '--from-project', '--no-interactive'],
            repoDir,
            homeDir
        );
        expect(fromProject.status).toBe(0);
        expect(fs.existsSync(path.join(repoDir, 'project-output', 'superposition.json'))).toBe(
            true
        );

        const regen = runCli(['regen'], repoDir, homeDir);
        expect(regen.status).toBe(0);
        expect(fs.existsSync(path.join(repoDir, 'project-output', 'superposition.json'))).toBe(
            true
        );
    });

    it('does not scaffold a local template for manifest-only init paths', () => {
        fs.writeFileSync(
            path.join(homeDir, '.container-superposition.yml'),
            yaml.dump({
                localConfigTemplate: {
                    common: {
                        shell: {
                            aliases: {
                                ll: 'ls -alF',
                            },
                        },
                    },
                },
            })
        );

        const result = runCli(
            [
                'init',
                '--stack',
                'plain',
                '--language',
                'nodejs',
                '--no-scaffold',
                '--no-interactive',
            ],
            repoDir,
            homeDir
        );

        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(repoDir, '.devcontainer', 'superposition.json'))).toBe(true);
        expect(fs.existsSync(path.join(repoDir, 'superposition.local.yml'))).toBe(false);
        expect(result.stdout).not.toContain('Local config created: superposition.local.yml');
    });

    it('ignores invalid global defaults for manifest-driven init', () => {
        fs.writeFileSync(path.join(homeDir, '.container-superposition.yml'), 'unexpected: true\n');
        fs.writeFileSync(
            path.join(repoDir, 'superposition.json'),
            JSON.stringify(
                {
                    manifestVersion: '1',
                    generatedBy: 'test',
                    generated: new Date().toISOString(),
                    baseTemplate: 'plain',
                    baseImage: 'bookworm',
                    overlays: ['nodejs'],
                },
                null,
                2
            )
        );

        const fromManifest = runCli(
            ['init', '--from-manifest', './superposition.json', '--no-interactive'],
            repoDir,
            homeDir
        );

        expect(fromManifest.status).toBe(0);
        expect(fromManifest.stderr).not.toContain('Invalid global defaults file');
    });

    it('ignores invalid global defaults for plan and doctor', () => {
        fs.writeFileSync(path.join(homeDir, '.container-superposition.yml'), 'unexpected: true\n');

        const plan = runCli(['plan', '--stack', 'plain', '--overlays', 'nodejs'], repoDir, homeDir);
        expect(plan.status).toBe(0);
        expect(plan.stderr).not.toContain('Invalid global defaults file');

        fs.writeFileSync(
            path.join(repoDir, '.superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'], outputPath: './project-output' })
        );
        const regen = runCli(['regen'], repoDir, homeDir);
        expect(regen.status).toBe(0);

        const doctor = runCli(['doctor'], repoDir, homeDir);
        expect(doctor.status).toBe(0);
        expect(doctor.stderr).not.toContain('Invalid global defaults file');
    });
});
