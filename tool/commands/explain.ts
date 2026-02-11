/**
 * Explain command - Deep dive into a specific overlay
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import type { OverlayMetadata, OverlaysConfig } from '../schema/types.js';

interface ExplainOptions {
    json?: boolean;
}

/**
 * Get overlay files from directory
 */
function getOverlayFiles(overlaysDir: string, overlayId: string): string[] {
    const overlayDir = path.join(overlaysDir, overlayId);
    if (!fs.existsSync(overlayDir)) {
        return [];
    }

    try {
        return fs
            .readdirSync(overlayDir)
            .filter((file) => !file.startsWith('.'))
            .sort();
    } catch (error) {
        return [];
    }
}

/**
 * Read and format devcontainer patch content
 */
function getDevcontainerPatch(overlaysDir: string, overlayId: string): any {
    const patchPath = path.join(overlaysDir, overlayId, 'devcontainer.patch.json');
    if (!fs.existsSync(patchPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(patchPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}

/**
 * Read docker-compose content
 */
function getDockerCompose(overlaysDir: string, overlayId: string): string | null {
    const composePath = path.join(overlaysDir, overlayId, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) {
        return null;
    }

    try {
        return fs.readFileSync(composePath, 'utf8');
    } catch (error) {
        return null;
    }
}

/**
 * Format overlay explanation as text
 */
function formatAsText(
    overlay: OverlayMetadata,
    overlaysDir: string,
    overlaysConfig: OverlaysConfig
): string {
    const lines: string[] = [];

    // Header
    lines.push(
        boxen(chalk.bold.cyan(`${overlay.name} (${overlay.id})`), {
            padding: 0.5,
            borderColor: 'cyan',
            borderStyle: 'round',
        })
    );

    // Description and metadata
    lines.push('');
    lines.push(chalk.bold('Description:'));
    lines.push(`  ${overlay.description}`);
    lines.push('');
    lines.push(chalk.bold('Category:') + ` ${overlay.category}`);

    if (overlay.tags && overlay.tags.length > 0) {
        lines.push(chalk.bold('Tags:') + ` ${overlay.tags.join(', ')}`);
    }

    // Stack compatibility
    lines.push('');
    lines.push(chalk.bold('Stack Compatibility:'));
    if (!overlay.supports || overlay.supports.length === 0) {
        lines.push('  ✓ All stacks (plain, compose)');
    } else {
        lines.push(`  ✓ ${overlay.supports.join(', ')}`);
    }

    // Dependencies
    lines.push('');
    lines.push(chalk.bold('Dependencies:'));
    if (overlay.requires && overlay.requires.length > 0) {
        lines.push(chalk.yellow('  Requires:') + ` ${overlay.requires.join(', ')}`);
    } else {
        lines.push('  No required dependencies');
    }

    if (overlay.suggests && overlay.suggests.length > 0) {
        lines.push(chalk.blue('  Suggests:') + ` ${overlay.suggests.join(', ')}`);
    }

    if (overlay.conflicts && overlay.conflicts.length > 0) {
        lines.push(chalk.red('  Conflicts:') + ` ${overlay.conflicts.join(', ')}`);
    }

    // Ports
    if (overlay.ports && overlay.ports.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Ports Exposed:'));
        for (const port of overlay.ports) {
            lines.push(`  ${port}`);
        }
    }

    // Files
    const files = getOverlayFiles(overlaysDir, overlay.id);
    if (files.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Files:'));
        for (const file of files) {
            lines.push(`  📄 ${file}`);
        }
    }

    // Devcontainer patches
    const patch = getDevcontainerPatch(overlaysDir, overlay.id);
    if (patch) {
        lines.push('');
        lines.push(chalk.bold('DevContainer Configuration:'));

        if (patch.features) {
            lines.push('  Features:');
            for (const [feature, config] of Object.entries(patch.features)) {
                lines.push(`    • ${feature}`);
                if (config && typeof config === 'object') {
                    const configStr = JSON.stringify(config, null, 2)
                        .split('\n')
                        .map((l) => '      ' + l)
                        .join('\n');
                    lines.push(chalk.dim(configStr));
                }
            }
        }

        if (patch.customizations?.vscode?.extensions) {
            const exts = patch.customizations.vscode.extensions;
            lines.push('  VS Code Extensions:');
            for (const ext of exts) {
                lines.push(`    • ${ext}`);
            }
        }

        if (patch.forwardPorts && patch.forwardPorts.length > 0) {
            lines.push('  Port Forwarding:');
            for (const port of patch.forwardPorts) {
                const attrs = patch.portsAttributes?.[port];
                const label = attrs?.label ? ` (${attrs.label})` : '';
                lines.push(`    • ${port}${label}`);
            }
        }

        if (patch.remoteEnv) {
            lines.push('  Environment Variables:');
            for (const [key, value] of Object.entries(patch.remoteEnv)) {
                lines.push(`    • ${key}=${value}`);
            }
        }
    }

    // Docker Compose
    const compose = getDockerCompose(overlaysDir, overlay.id);
    if (compose) {
        lines.push('');
        lines.push(chalk.bold('Docker Compose Services:'));
        lines.push(chalk.dim('  (Services will be added to docker-compose.yml)'));
        
        // Parse service names from compose file - look under 'services:' section
        const servicesSection = compose.match(/^services:\s*\n([\s\S]*?)(?=^\S|\n$)/m);
        if (servicesSection) {
            const serviceMatches = servicesSection[1].matchAll(/^\s{4}(\S+):/gm);
            for (const match of serviceMatches) {
                lines.push(`  🐳 ${match[1]}`);
            }
        }
    }

    return lines.join('\n');
}

/**
 * Execute explain command
 */
export async function explainCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    overlayId: string,
    options: ExplainOptions
) {
    try {
        // Find overlay
        const overlay = overlaysConfig.overlays.find((o) => o.id === overlayId);

        if (!overlay) {
            console.error(chalk.red(`✗ Overlay not found: ${overlayId}`));
            console.log(
                chalk.dim('\n💡 Use "container-superposition list" to see available overlays\n')
            );
            process.exit(1);
        }

        // Output as JSON
        if (options.json) {
            const files = getOverlayFiles(overlaysDir, overlayId);
            const patch = getDevcontainerPatch(overlaysDir, overlayId);
            const compose = getDockerCompose(overlaysDir, overlayId);

            const output = {
                ...overlay,
                files,
                devcontainerPatch: patch,
                dockerCompose: compose ? true : false,
            };

            console.log(JSON.stringify(output, null, 2));
            return;
        }

        // Output as formatted text
        console.log('\n' + formatAsText(overlay, overlaysDir, overlaysConfig) + '\n');
    } catch (error) {
        console.error(chalk.red('✗ Error explaining overlay:'), error);
        process.exit(1);
    }
}
