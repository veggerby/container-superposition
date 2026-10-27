import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load } from 'js-yaml';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pluginPath = './plugins/project';
const skillPath = `${pluginPath}/skills/project-config-authoring`;
const promptPath = `${pluginPath}/commands/project-config.md`;
const json = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'));

// Static package contracts complement the source-matched native installation checks.
describe('project-config harness packaging', () => {
    it('routes Claude, Copilot, and Codex marketplaces to one canonical plugin tree', () => {
        const claude = json('.claude-plugin/marketplace.json');
        const copilot = json('.github/plugin/marketplace.json');
        const codex = json('.agents/plugins/marketplace.json');
        const manifest = json(`${pluginPath}/.claude-plugin/plugin.json`);
        const codexManifest = json(`${pluginPath}/.codex-plugin/plugin.json`);
        expect(manifest.name).toBe('project');
        expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(codexManifest).toMatchObject({
            name: manifest.name,
            version: manifest.version,
            skills: './skills',
        });
        expect(manifest.commands).toEqual(['./commands']);
        expect(manifest.skills).toEqual(['./skills']);
        for (const catalog of [claude, copilot, codex]) {
            expect(catalog.name).toBe('container-superposition');
            expect(catalog.name).not.toBe(manifest.name);
            expect(catalog.plugins).toHaveLength(1);
            expect(catalog.plugins[0].name).toBe(manifest.name);
        }
        for (const catalog of [claude, copilot]) {
            expect(catalog.owner.name).toBe('veggerby');
            expect(catalog.plugins[0].source).toBe(pluginPath);
        }
        expect(codex.plugins[0]).toMatchObject({
            source: { source: 'local', path: pluginPath },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
        });
    });

    it('loads the local root Pi package and selects exactly the canonical skill and command', () => {
        const settings = json('.pi/settings.json');
        const { pi } = json('package.json');
        expect(settings.packages).toContain('..');
        expect(resolve(root, '.pi', '..')).toBe(resolve(root));
        expect(pi.skills).toEqual([skillPath]);
        expect(pi.prompts).toEqual([promptPath]);
        expect(Object.keys(pi).sort()).toEqual(['prompts', 'skills']);
        for (const path of [promptPath, `${skillPath}/SKILL.md`]) {
            expect(existsSync(join(root, path))).toBe(true);
        }
        // No automatic local-discovery shadow of either packaged resource.
        expect(existsSync(join(root, '.pi/prompts/project-config.md'))).toBe(false);
        expect(existsSync(join(root, '.pi/skills/project-config-authoring'))).toBe(false);
    });

    it('contains only the native metadata, adapter, and one copy of each instruction resource', () => {
        expect(readdirSync(join(root, pluginPath)).sort()).toEqual([
            '.claude-plugin',
            '.codex-plugin',
            'commands',
            'opencode.js',
            'skills',
        ]);
        expect(readdirSync(join(root, pluginPath, 'skills'))).toEqual(['project-config-authoring']);
        expect(readdirSync(join(root, pluginPath, 'commands'))).toEqual(['project-config.md']);
        expect(existsSync(join(root, '.claude-plugin/plugin.json'))).toBe(false);
        const pkg = json('package.json');
        expect(pkg.name).toBe('container-superposition');
        expect(pkg.exports['./server']).toBe(`${pluginPath}/opencode.js`);
        expect(pkg.exports['.']).toBe(`./${pkg.main}`);
        expect(pkg.exports['./*']).toBe('./*');
        expect(pkg.files).toContain('plugins/project/');
        expect(existsSync(join(root, 'plugins/project-config'))).toBe(false);
        expect(pkg.scripts['agents:generate']).toBeUndefined();
        for (const manifest of [
            json(`${pluginPath}/.claude-plugin/plugin.json`),
            json(`${pluginPath}/.codex-plugin/plugin.json`),
        ]) {
            for (const field of ['agents', 'hooks', 'mcpServers', 'lspServers', 'extensions']) {
                expect(manifest[field]).toBeUndefined();
            }
        }
    });

    it('keeps the OpenCode server entry eligible for Git-backed source archives', () => {
        const result = spawnSync(
            'git',
            ['check-ignore', '--no-index', '--quiet', 'plugins/project/opencode.js'],
            {
                cwd: root,
                encoding: 'utf8',
            }
        );
        expect(result.error).toBeUndefined();
        expect(result.stderr).toBe('');
        expect(result.status).toBe(1); // 1 means not ignored; build-output *.js must not hide this source.
    });

    it('keeps the authoring skill self-contained outside the source repository', () => {
        const target = mkdtempSync(join(tmpdir(), 'cs-authoring-skill-'));
        try {
            const destination = join(target, '.agents', 'skills', 'project-config-authoring');
            cpSync(join(root, skillPath), destination, { recursive: true });
            const content = readFileSync(join(destination, 'SKILL.md'), 'utf8');
            const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            expect(frontmatter).not.toBeNull();
            expect(load(frontmatter![1])).toMatchObject({
                name: 'project-config-authoring',
                description: expect.any(String),
            });
            const links = [...content.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
            expect(links.length).toBeGreaterThan(0);
            for (const link of links) expect(link).toMatch(/^https:\/\//);
        } finally {
            rmSync(target, { recursive: true, force: true });
        }
    });

    it('loads the OpenCode command and skill from an isolated installed plugin tree', async () => {
        const target = mkdtempSync(join(tmpdir(), 'cs-opencode-payload-'));
        try {
            cpSync(join(root, pluginPath), target, { recursive: true });
            cpSync(join(root, 'package.json'), join(target, 'package.json'));
            const { default: plugin } = await import(
                pathToFileURL(join(target, 'opencode.js')).href
            );
            const hooks = await plugin();
            const existing = { template: 'preserved command' };
            const config = { command: { existing }, skills: { paths: ['/existing/skills'] } };
            await hooks.config(config);
            expect(config.command.existing).toBe(existing);
            expect(config.skills.paths).toEqual([
                '/existing/skills',
                fileURLToPath(new URL('./skills/', pathToFileURL(join(target, 'opencode.js')))),
            ]);
            const command = (config.command as Record<string, { template: string }>)[
                'project-config'
            ];
            expect(command.template).toBe(
                readFileSync(join(root, promptPath), 'utf8').replace(
                    /^---\r?\n[\s\S]*?\r?\n---\r?\n/,
                    ''
                )
            );
            expect(command.template).toContain('$ARGUMENTS');
            const snapshot = JSON.stringify(config);
            await expect(hooks.config(config)).rejects.toThrow(
                'project-config command already exists'
            );
            expect(JSON.stringify(config)).toBe(snapshot);
            rmSync(join(target, 'commands/project-config.md'));
            await expect(plugin()).rejects.toThrow();
        } finally {
            rmSync(target, { recursive: true, force: true });
        }
    });

    it.each(['pi', 'claude-code', 'codex', 'opencode', 'github-copilot'])(
        'documents optional skill-only GitHub installation from the canonical plugin directory for %s',
        (agent) => {
            const guide = readFileSync(join(root, 'docs/agent-installation.md'), 'utf8');
            expect(guide).toContain(
                `gh skill install veggerby/container-superposition plugins/project/skills/project-config-authoring@main --agent ${agent} --scope project`
            );
        }
    );

    it('documents native distribution and the local Pi package separately from skill-only installation', () => {
        const guide = readFileSync(join(root, 'docs/agent-installation.md'), 'utf8');
        for (const contract of [
            '/plugin install project@container-superposition',
            '/project:project-config',
            'copilot plugin install project@container-superposition',
            'codex plugin add project@container-superposition',
            "opencode plugin 'https://github.com/veggerby/container-superposition/archive/refs/heads/main.tar.gz'",
            'pi install git:github.com/veggerby/container-superposition',
            '"packages": [".."]',
            'skill-only',
        ])
            expect(guide).toContain(contract);
        expect(guide).not.toContain('agents:generate');
        expect(guide).not.toContain('.pi/skills/project-config-authoring');
    });
});
