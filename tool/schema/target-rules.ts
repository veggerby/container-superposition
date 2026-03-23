/**
 * Target-aware generation rules.
 *
 * Each non-local deployment target has a TargetRule implementation that:
 *  - patches devcontainer.json with target-specific fields
 *  - generates target-specific workspace files and user guidance
 *  - declares the files it owns (for stale-artifact cleanup on target switch)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DeploymentTarget, DevContainer, OverlayMetadata, Stack } from './types.js';

// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * Information available to a target rule when it runs.
 */
export interface TargetRuleContext {
    /** Selected overlay IDs (resolved, in application order). */
    overlays: string[];
    /** Metadata map for all selected overlays. */
    overlayMetadata: Map<string, OverlayMetadata>;
    /** Applied port offset (0 = none). */
    portOffset: number;
    /** Base stack used for generation. */
    stack: Stack;
    /** Absolute path to the output directory (e.g. <project>/.devcontainer). */
    outputPath: string;
    /** Absolute path to the project root (parent of outputPath). */
    projectRoot: string;
}

// ─── Interface ───────────────────────────────────────────────────────────────

/**
 * A TargetRule encapsulates all target-specific generation logic for one
 * deployment target.  The `local` rule is a no-op pass-through.
 */
export interface TargetRule {
    readonly target: DeploymentTarget;

    /**
     * Returns a partial DevContainer object that is deep-merged into the
     * composed devcontainer.json before it is written to disk.
     * Return an empty object for targets that need no devcontainer changes.
     */
    devcontainerPatch(context: TargetRuleContext): Partial<DevContainer>;

    /**
     * Returns a map of files to write.  Keys are relative to `context.outputPath`.
     * A key that starts with `../` is resolved relative to `context.projectRoot`
     * (one level above `.devcontainer/`) so it lands in the project root.
     */
    generateFiles(context: TargetRuleContext): Map<string, string>;

    /**
     * Lists the relative paths (same conventions as `generateFiles`) owned by
     * this rule.  Used to remove stale project-root files when the user switches
     * to a different target between runs.
     */
    ownedFiles(): string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Collect all exposed ports across selected overlays, applying the offset. */
function collectPorts(
    overlays: string[],
    overlayMetadata: Map<string, OverlayMetadata>,
    portOffset: number
): Array<{ port: number; service: string; description: string; protocol: string }> {
    const result: Array<{
        port: number;
        service: string;
        description: string;
        protocol: string;
    }> = [];

    for (const id of overlays) {
        const meta = overlayMetadata.get(id);
        if (!meta?.ports) continue;

        for (const p of meta.ports) {
            if (typeof p === 'number') {
                result.push({
                    port: p + portOffset,
                    service: id,
                    description: '',
                    protocol: 'http',
                });
            } else {
                result.push({
                    port: p.port + portOffset,
                    service: p.service ?? id,
                    description: p.description ?? '',
                    protocol: p.protocol ?? 'http',
                });
            }
        }
    }

    return result;
}

// ─── Local rule (no-op) ───────────────────────────────────────────────────────

class LocalTargetRule implements TargetRule {
    readonly target: DeploymentTarget = 'local';

    devcontainerPatch(_ctx: TargetRuleContext): Partial<DevContainer> {
        return {};
    }

    generateFiles(_ctx: TargetRuleContext): Map<string, string> {
        return new Map();
    }

    ownedFiles(): string[] {
        return [];
    }
}

// ─── Codespaces rule ─────────────────────────────────────────────────────────

class CodespacesTargetRule implements TargetRule {
    readonly target: DeploymentTarget = 'codespaces';

    devcontainerPatch(ctx: TargetRuleContext): Partial<DevContainer> {
        // Recommend a machine size based on the number of services selected.
        // More services → larger machine recommendation.
        const serviceOverlays = ctx.overlays.filter((id) => {
            const meta = ctx.overlayMetadata.get(id);
            return meta?.category === 'database' || meta?.category === 'observability';
        });

        let cpus = 2;
        let memoryGb = 4;

        if (serviceOverlays.length >= 4) {
            cpus = 8;
            memoryGb = 16;
        } else if (serviceOverlays.length >= 2) {
            cpus = 4;
            memoryGb = 8;
        }

        return {
            hostRequirements: {
                cpus,
                memory: `${memoryGb}gb`,
                storage: '32gb',
            },
        } as Partial<DevContainer>;
    }

    generateFiles(ctx: TargetRuleContext): Map<string, string> {
        const files = new Map<string, string>();

        const overlayNames = ctx.overlays
            .map((id) => ctx.overlayMetadata.get(id)?.name ?? id)
            .join(', ');

        const serviceOverlays = ctx.overlays.filter((id) => {
            const meta = ctx.overlayMetadata.get(id);
            return meta?.category === 'database' || meta?.category === 'observability';
        });

        let machineNote = '**2-core** machine (default)';
        if (serviceOverlays.length >= 4) {
            machineNote = '**8-core** machine (recommended — many services selected)';
        } else if (serviceOverlays.length >= 2) {
            machineNote = '**4-core** machine (recommended — multiple services selected)';
        }

        const ports = collectPorts(ctx.overlays, ctx.overlayMetadata, ctx.portOffset);
        const portSection =
            ports.length > 0
                ? `\n## Exposed Ports\n\n${ports.map((p) => `- **${p.port}** — ${p.service}${p.description ? ` (${p.description})` : ''}`).join('\n')}\n`
                : '';

        const content = `# GitHub Codespaces Setup

This devcontainer was generated with **\`--target codespaces\`** and is optimized for
[GitHub Codespaces](https://github.com/features/codespaces).

## Opening in a Codespace

1. Push this repository (including the \`.devcontainer/\` directory) to GitHub.
2. Click **Code → Codespaces → Create codespace on <branch>**.
3. GitHub will pick up \`.devcontainer/devcontainer.json\` automatically.

## Recommended Machine Type

The generated \`devcontainer.json\` includes \`hostRequirements\` recommending a
${machineNote} for the selected stack.

**Selected overlays**: ${overlayNames || '(none)'}

## Port Forwarding

Codespaces automatically forwards ports declared in \`devcontainer.json\`.
Forwarded ports appear in the **Ports** panel inside VS Code or the Codespaces UI.
${portSection}
## Notes

- **docker-sock** is not available in Codespaces — use \`docker-in-docker\` instead.
- Secrets can be added under *Settings → Codespaces → Secrets*.
- To set environment variables, copy \`.devcontainer/.env.example\` to \`.devcontainer/.env\`
  and add the file to your Codespaces secrets or repository environment.

## References

- [GitHub Codespaces documentation](https://docs.github.com/en/codespaces)
- [devcontainer.json reference — hostRequirements](https://containers.dev/implementors/json_reference/#hostRequirementsProperties)
`;

        files.set('CODESPACES.md', content);
        return files;
    }

    ownedFiles(): string[] {
        return ['CODESPACES.md'];
    }
}

// ─── Gitpod rule ─────────────────────────────────────────────────────────────

class GitpodTargetRule implements TargetRule {
    readonly target: DeploymentTarget = 'gitpod';

    devcontainerPatch(_ctx: TargetRuleContext): Partial<DevContainer> {
        return {};
    }

    generateFiles(ctx: TargetRuleContext): Map<string, string> {
        const files = new Map<string, string>();

        const ports = collectPorts(ctx.overlays, ctx.overlayMetadata, ctx.portOffset);

        const portsSection =
            ports.length > 0
                ? ports
                      .map(
                          (p) =>
                              `  - port: ${p.port}\n    onOpen: notify-user\n    name: ${p.service}\n    description: ${p.description || p.service}`
                      )
                      .join('\n')
                : '';

        const devcontainerRef =
            ctx.stack === 'compose' ? '.devcontainer/devcontainer.json' : '.devcontainer';

        const gitpodYml = [
            '# Gitpod workspace configuration',
            '# Generated by container-superposition with --target gitpod',
            '#',
            '# See: https://www.gitpod.io/docs/references/gitpod-yml',
            '',
            'image:',
            `  file: ${devcontainerRef}`,
            '',
            'tasks:',
            '  - name: Setup',
            '    init: |',
            '      echo "Workspace initialized — run your setup commands here"',
            '    command: |',
            '      echo "Workspace ready"',
            '',
            ...(portsSection
                ? ['ports:', portsSection, '']
                : ['# ports: []  # No overlay ports declared', '']),
            'vscode:',
            '  extensions: []',
        ].join('\n');

        // .gitpod.yml must live in the repository root (one level above .devcontainer/)
        files.set('../.gitpod.yml', gitpodYml);

        const overlayNames = ctx.overlays
            .map((id) => ctx.overlayMetadata.get(id)?.name ?? id)
            .join(', ');

        const portSection =
            ports.length > 0
                ? `\n## Exposed Ports\n\n${ports.map((p) => `- **${p.port}** — ${p.service}${p.description ? ` (${p.description})` : ''}`).join('\n')}\n`
                : '';

        const repoUrl = '<!-- Replace with your repository URL -->';

        const gitpodMd = `# Gitpod Setup

This devcontainer was generated with **\`--target gitpod\`** and includes a
\`.gitpod.yml\` at the repository root for use with [Gitpod](https://www.gitpod.io).

## Opening in Gitpod

1. Push this repository (including \`.devcontainer/\` and \`.gitpod.yml\`) to a
   Git hosting provider supported by Gitpod (GitHub, GitLab, Bitbucket).
2. Prefix your repository URL with \`https://gitpod.io/#\`:

   \`\`\`
   https://gitpod.io/#${repoUrl}
   \`\`\`

   Or add an **Open in Gitpod** badge to your README:

   \`\`\`markdown
   [![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#${repoUrl})
   \`\`\`

**Selected overlays**: ${overlayNames || '(none)'}
${portSection}
## Notes

- **docker-sock** is not available in Gitpod — use \`docker-in-docker\` instead.
- Environment variables can be set under *Gitpod Settings → Variables*.
- Copy \`.devcontainer/.env.example\` to \`.devcontainer/.env\` and configure locally.
- The generated \`.gitpod.yml\` references your devcontainer via its \`image.file\`
  field — Gitpod reads devcontainer.json automatically.

## References

- [Gitpod documentation](https://www.gitpod.io/docs)
- [Gitpod .gitpod.yml reference](https://www.gitpod.io/docs/references/gitpod-yml)
- [Gitpod + devcontainers](https://www.gitpod.io/docs/references/ides-and-editors/vscode)
`;

        files.set('GITPOD.md', gitpodMd);
        return files;
    }

    ownedFiles(): string[] {
        // '../.gitpod.yml' resolves to project root; 'GITPOD.md' is in outputPath.
        return ['../.gitpod.yml', 'GITPOD.md'];
    }
}

// ─── DevPod rule ──────────────────────────────────────────────────────────────

class DevPodTargetRule implements TargetRule {
    readonly target: DeploymentTarget = 'devpod';

    devcontainerPatch(_ctx: TargetRuleContext): Partial<DevContainer> {
        return {};
    }

    generateFiles(ctx: TargetRuleContext): Map<string, string> {
        const files = new Map<string, string>();

        const devcontainerPath =
            ctx.stack === 'compose' ? '.devcontainer/devcontainer.json' : '.devcontainer';

        const devpodYaml = [
            '# DevPod workspace configuration',
            '# Generated by container-superposition with --target devpod',
            '#',
            '# See: https://devpod.sh/docs/managing-workspaces/workspace-configuration',
            '',
            `devcontainerPath: ${devcontainerPath}`,
        ].join('\n');

        // devpod.yaml lives at the project root
        files.set('../devpod.yaml', devpodYaml);

        const overlayNames = ctx.overlays
            .map((id) => ctx.overlayMetadata.get(id)?.name ?? id)
            .join(', ');

        const ports = collectPorts(ctx.overlays, ctx.overlayMetadata, ctx.portOffset);
        const portSection =
            ports.length > 0
                ? `\n## Exposed Ports\n\n${ports.map((p) => `- **${p.port}** — ${p.service}${p.description ? ` (${p.description})` : ''}`).join('\n')}\n`
                : '';

        const devpodMd = `# DevPod Setup

This devcontainer was generated with **\`--target devpod\`** and includes a
\`devpod.yaml\` at the repository root for use with [DevPod](https://devpod.sh).

## Provisioning with DevPod

1. [Install DevPod](https://devpod.sh/docs/getting-started/install).
2. From the repository root run:

   \`\`\`bash
   devpod up .
   \`\`\`

   DevPod reads \`devpod.yaml\` and the referenced \`${devcontainerPath}\` automatically.

3. To use a specific provider:

   \`\`\`bash
   devpod up . --provider docker   # Local Docker
   devpod up . --provider aws      # AWS EC2
   \`\`\`

**Selected overlays**: ${overlayNames || '(none)'}
${portSection}
## Notes

- Copy \`.devcontainer/.env.example\` to \`.devcontainer/.env\` and edit credentials
  before running \`devpod up\`.
- DevPod respects \`hostRequirements\` in \`devcontainer.json\` for cloud providers.
- To stop and destroy the workspace: \`devpod delete <workspace-name>\`.

## References

- [DevPod documentation](https://devpod.sh/docs)
- [DevPod workspace configuration](https://devpod.sh/docs/managing-workspaces/workspace-configuration)
- [DevPod providers](https://devpod.sh/docs/managing-providers/add-provider)
`;

        files.set('DEVPOD.md', devpodMd);
        return files;
    }

    ownedFiles(): string[] {
        return ['../devpod.yaml', 'DEVPOD.md'];
    }
}

// ─── Registry ────────────────────────────────────────────────────────────────

const TARGET_RULES: Record<DeploymentTarget, TargetRule> = {
    local: new LocalTargetRule(),
    codespaces: new CodespacesTargetRule(),
    gitpod: new GitpodTargetRule(),
    devpod: new DevPodTargetRule(),
};

/**
 * Return the target rule for the given deployment target.
 * Throws a clear error when the target has no defined rule (future-proofing).
 */
export function getTargetRule(target: DeploymentTarget): TargetRule {
    const rule = TARGET_RULES[target];
    if (!rule) {
        const valid = Object.keys(TARGET_RULES).join(', ');
        throw new Error(`No target rule defined for '${target}'. Valid targets are: ${valid}`);
    }
    return rule;
}

/**
 * Resolve a path produced by TargetRule.generateFiles() to an absolute
 * filesystem path.
 *
 * Keys starting with '../' are resolved relative to projectRoot (i.e. the
 * repository root, one level above .devcontainer/).  All other keys are
 * resolved relative to outputPath (.devcontainer/).
 */
export function resolveTargetFilePath(
    key: string,
    outputPath: string,
    projectRoot: string
): string {
    if (key.startsWith('../')) {
        return path.join(projectRoot, key.slice(3));
    }
    return path.join(outputPath, key);
}

/**
 * Remove stale project-root artifacts left by a previous target.
 *
 * Only project-root files (keys starting with '../') are removed here; files
 * inside outputPath are handled automatically by cleanupStaleFiles via the
 * FileRegistry.
 *
 * @param previousTarget  Target used in the previous generation run.
 * @param nextTarget      Target for the current generation run.
 * @param projectRoot     Absolute path to the project root.
 */
export function removeStaleTargetArtifacts(
    previousTarget: DeploymentTarget,
    nextTarget: DeploymentTarget,
    projectRoot: string
): void {
    if (previousTarget === nextTarget) {
        return;
    }

    const previousRule = TARGET_RULES[previousTarget];
    if (!previousRule) {
        return;
    }

    for (const ownedKey of previousRule.ownedFiles()) {
        if (!ownedKey.startsWith('../')) {
            continue; // outputPath files handled by FileRegistry
        }
        const absPath = path.join(projectRoot, ownedKey.slice(3));
        if (fs.existsSync(absPath)) {
            fs.unlinkSync(absPath);
        }
    }
}
