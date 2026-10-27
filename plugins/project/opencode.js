import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// OpenCode 1's native plugin API. No install-time or project-file writes.
export default async function ProjectConfigPlugin() {
    const prompt = await readFile(new URL('./commands/project-config.md', import.meta.url), 'utf8');
    const template = prompt.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    const skillsPath = fileURLToPath(new URL('./skills/', import.meta.url));

    return {
        async config(config) {
            if (config.command?.['project-config']) {
                throw new Error(
                    'Container Superposition: project-config command already exists; resolve the conflict before loading this plugin.'
                );
            }
            config.command ??= {};
            config.command['project-config'] = {
                description: 'Author or update Container Superposition project config',
                template,
            };
            config.skills ??= {};
            config.skills.paths ??= [];
            if (!config.skills.paths.includes(skillsPath)) config.skills.paths.push(skillsPath);
        },
    };
}
