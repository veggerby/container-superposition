import { describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const root = fileURLToPath(new URL('../../', import.meta.url));
const skillPath = './.pi/skills/project-config-authoring';
const promptPath = './.pi/prompts/project-config.md';
const json = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'));

// Static distribution contracts, not a substitute for harness-native installation tests.
describe('project-config harness packaging', () => {
    it('lists exactly one root plugin with matching marketplace and manifest identities', () => {
        const marketplace = json('.claude-plugin/marketplace.json');
        const plugin = json('.claude-plugin/plugin.json');
        expect(marketplace.name).toBe('container-superposition');
        expect(marketplace.owner.name).toBe('veggerby');
        expect(marketplace.plugins).toEqual([
            {
                name: plugin.name,
                source: './',
                description: expect.any(String),
            },
        ]);
        expect(plugin.name).toBe('container-superposition');
        expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('exports the same existing resources for Claude Code and Pi, not maintainer workflows', () => {
        const plugin = json('.claude-plugin/plugin.json');
        const { pi } = json('package.json');
        expect(plugin.commands).toEqual([promptPath]);
        expect(plugin.skills).toEqual([skillPath]);
        expect(pi.prompts).toEqual(plugin.commands);
        expect(pi.skills).toEqual(plugin.skills);
        expect(Object.keys(plugin).sort()).toEqual(
            [
                'name',
                'version',
                'description',
                'author',
                'repository',
                'license',
                'commands',
                'skills',
            ].sort()
        );
        for (const path of [promptPath, `${skillPath}/SKILL.md`]) {
            expect(path.startsWith('./')).toBe(true);
            expect(path.includes('..')).toBe(false);
            expect(existsSync(join(root, path))).toBe(true);
        }
        // Claude also scans these default component locations without a manifest entry.
        for (const path of [
            'skills',
            'commands',
            'agents',
            'hooks',
            '.mcp.json',
            '.lsp.json',
            'settings.json',
        ]) {
            expect(
                existsSync(join(root, path)),
                `unreviewed default plugin component: ${path}`
            ).toBe(false);
        }
    });

    it('keeps the Codex skill valid when copied alone outside the source repository', () => {
        const target = mkdtempSync(join(tmpdir(), 'cs-codex-skill-'));
        try {
            const destination = join(target, '.agents', 'skills', 'project-config-authoring');
            cpSync(join(root, skillPath), destination, { recursive: true });
            const content = readFileSync(join(destination, 'SKILL.md'), 'utf8');
            expect(content).toBe(readFileSync(join(root, skillPath, 'SKILL.md'), 'utf8'));
            const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            expect(frontmatter).not.toBeNull();
            expect(load(frontmatter![1])).toMatchObject({
                name: 'project-config-authoring',
                description: expect.any(String),
            });
            // Markdown references must not depend on the installation repository's files.
            const links = [...content.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
            expect(links.length).toBeGreaterThan(0);
            for (const link of links) expect(link).toMatch(/^https:\/\//);
        } finally {
            rmSync(target, { recursive: true, force: true });
        }
    });

    it('documents the exact marketplace, command, and standalone skill installation paths', () => {
        const guide = readFileSync(join(root, 'docs/agent-installation.md'), 'utf8');
        for (const contract of [
            '/plugin install container-superposition@container-superposition',
            '/container-superposition:project-config',
            'https://github.com/veggerby/container-superposition/tree/main/.pi/skills/project-config-authoring',
            '$project-config-authoring',
            'pi install git:github.com/veggerby/container-superposition',
        ])
            expect(guide).toContain(contract);
    });
});
