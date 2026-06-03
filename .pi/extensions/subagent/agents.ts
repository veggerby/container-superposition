import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAgentDir, parseFrontmatter } from '@earendil-works/pi-coding-agent';

export type AgentScope = 'bundled' | 'user' | 'project' | 'all';
export type AgentSource = 'bundled' | 'user' | 'project';

export interface AgentConfig {
    name: string;
    description: string;
    tools?: string[];
    model?: string;
    systemPrompt: string;
    source: AgentSource;
    filePath: string;
}

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const bundledAgentsDir = path.resolve(extensionDir, '../../agents');

const normalizeTools = (value: unknown): string[] | undefined => {
    if (typeof value === 'string') {
        const tools = value
            .split(',')
            .map((tool) => tool.trim())
            .filter(Boolean);
        return tools.length > 0 ? tools : undefined;
    }

    if (Array.isArray(value)) {
        const tools = value
            .map((tool) => (typeof tool === 'string' ? tool.trim() : ''))
            .filter(Boolean);
        return tools.length > 0 ? tools : undefined;
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const tools = Object.entries(record)
            .filter(([, allowed]) => allowed === true)
            .map(([tool]) => tool.trim())
            .filter(Boolean);
        return tools.length > 0 ? tools : undefined;
    }

    return undefined;
};

const loadAgentsFromDir = (dir: string, source: AgentSource): AgentConfig[] => {
    if (!existsSync(dir)) {
        return [];
    }

    let entries: ReturnType<typeof readdirSync>;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }

    const agents: AgentConfig[] = [];

    for (const entry of entries) {
        if (!entry.name.endsWith('.md')) {
            continue;
        }

        if (!entry.isFile() && !entry.isSymbolicLink()) {
            continue;
        }

        const filePath = path.join(dir, entry.name);

        try {
            const content = readFileSync(filePath, 'utf8');
            const { frontmatter, body } = parseFrontmatter<Record<string, unknown>>(content);
            const name = typeof frontmatter.name === 'string' ? frontmatter.name.trim() : '';
            const description =
                typeof frontmatter.description === 'string' ? frontmatter.description.trim() : '';

            if (!name || !description) {
                continue;
            }

            agents.push({
                name,
                description,
                tools: normalizeTools(frontmatter.tools),
                model:
                    typeof frontmatter.model === 'string' && frontmatter.model.trim()
                        ? frontmatter.model.trim()
                        : undefined,
                systemPrompt: body.trim(),
                source,
                filePath,
            });
        } catch {
            continue;
        }
    }

    return agents;
};

const isDirectory = (targetPath: string): boolean => {
    try {
        return statSync(targetPath).isDirectory();
    } catch {
        return false;
    }
};

const findNearestProjectAgentsDir = (cwd: string): string | null => {
    let currentDir = cwd;

    while (true) {
        const candidate = path.join(currentDir, '.pi', 'agents');
        if (isDirectory(candidate)) {
            return candidate;
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            return null;
        }

        currentDir = parentDir;
    }
};

export interface AgentDiscoveryResult {
    agents: AgentConfig[];
    bundledAgentsDir: string;
    projectAgentsDir: string | null;
}

export const discoverAgents = (cwd: string, scope: AgentScope): AgentDiscoveryResult => {
    const userDir = path.join(getAgentDir(), 'agents');
    const projectAgentsDir = findNearestProjectAgentsDir(cwd);

    const bundledAgents = loadAgentsFromDir(bundledAgentsDir, 'bundled');
    const userAgents = scope === 'project' ? [] : loadAgentsFromDir(userDir, 'user');
    const projectAgents =
        scope === 'user' || scope === 'bundled' || !projectAgentsDir
            ? []
            : loadAgentsFromDir(projectAgentsDir, 'project');

    const orderedSources: AgentConfig[] =
        scope === 'bundled'
            ? [...bundledAgents]
            : scope === 'user'
              ? [...bundledAgents, ...userAgents]
              : scope === 'project'
                ? [...bundledAgents, ...projectAgents]
                : [...bundledAgents, ...userAgents, ...projectAgents];

    const deduped = new Map<string, AgentConfig>();
    for (const agent of orderedSources) {
        deduped.set(agent.name, agent);
    }

    return {
        agents: Array.from(deduped.values()),
        bundledAgentsDir,
        projectAgentsDir,
    };
};
