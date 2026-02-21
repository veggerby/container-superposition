/**
 * Explain command - Deep dive into a specific overlay
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import yaml from 'js-yaml';
import type { OverlayMetadata, OverlaysConfig, PresetParameter } from '../schema/types.js';

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
            .filter((file) => file === '.env.example' || !file.startsWith('.'))
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
 * Read docker-compose content and parse services
 */
function getDockerComposeServices(overlaysDir: string, overlayId: string): string[] {
    const composePath = path.join(overlaysDir, overlayId, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) {
        return [];
    }

    try {
        const content = fs.readFileSync(composePath, 'utf8');
        const parsed = yaml.load(content) as any;

        // Extract service names from the services section
        if (parsed && parsed.services && typeof parsed.services === 'object') {
            return Object.keys(parsed.services);
        }

        return [];
    } catch (error) {
        return [];
    }
}

/**
 * Load preset definition from YAML file (for showing parameters in explain)
 */
function loadPresetDefinition(overlaysDir: string, presetId: string): Record<string, any> | null {
    const presetPath = path.join(overlaysDir, '.presets', `${presetId}.yml`);
    if (!fs.existsSync(presetPath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(presetPath, 'utf8');
        return yaml.load(content) as Record<string, any>;
    } catch {
        return null;
    }
}

/**
 * Format preset parameters section
 */
function formatPresetParameters(
    parameters: Record<string, PresetParameter>,
    lines: string[]
): void {
    lines.push('');
    lines.push(chalk.bold('Preset Parameters:'));
    lines.push(
        chalk.dim(
            '  Customize this preset with --preset-param key=value (e.g., --preset-param broker=nats)'
        )
    );

    for (const [key, param] of Object.entries(parameters)) {
        lines.push('');
        const desc = param.description ? ` — ${param.description}` : '';
        lines.push(
            `  ${chalk.cyan('--preset-param')} ${chalk.bold(key + '=...')}${chalk.dim(desc)}`
        );
        lines.push(chalk.dim(`    Default: ${param.default}`));
        lines.push(chalk.dim('    Options:'));
        for (const opt of param.options) {
            const marker = opt.id === param.default ? chalk.green(' (default)') : '';
            const optDesc = opt.description ? chalk.dim(` — ${opt.description}`) : '';
            const overlaysList =
                opt.overlays.length > 0 ? chalk.dim(` [${opt.overlays.join(', ')}]`) : '';
            lines.push(`      • ${chalk.white(opt.id)}${marker}${overlaysList}${optDesc}`);
        }
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

    // For preset overlays, show selects and parameters
    if (overlay.category === 'preset') {
        const presetDef = loadPresetDefinition(overlaysDir, overlay.id);
        if (presetDef) {
            // Show required overlays
            if (presetDef.selects?.required && presetDef.selects.required.length > 0) {
                lines.push('');
                lines.push(chalk.bold('Always Included Overlays:'));
                lines.push(`  ${presetDef.selects.required.join(', ')}`);
            }

            // Show user choices (single-select overlays)
            if (
                presetDef.selects?.userChoice &&
                Object.keys(presetDef.selects.userChoice).length > 0
            ) {
                lines.push('');
                lines.push(chalk.bold('User Choices:'));
                for (const [key, choice] of Object.entries(
                    presetDef.selects.userChoice as Record<string, any>
                )) {
                    const opts = (choice.options as string[]).join(', ');
                    const def = choice.defaultOption
                        ? chalk.green(` (default: ${choice.defaultOption})`)
                        : '';
                    lines.push(`  ${chalk.cyan(key)}${def}: ${opts}`);
                }
            }

            // Show parameterized slots
            if (presetDef.parameters && Object.keys(presetDef.parameters).length > 0) {
                formatPresetParameters(
                    presetDef.parameters as Record<string, PresetParameter>,
                    lines
                );
            }

            // Usage examples
            lines.push('');
            lines.push(chalk.bold('Usage Examples:'));
            lines.push(chalk.dim(`  container-superposition init --preset ${overlay.id}`));
            if (presetDef.parameters) {
                const paramExamples = Object.entries(
                    presetDef.parameters as Record<string, PresetParameter>
                )
                    .slice(0, 2)
                    .map(([k, p]) => {
                        const nonDefault = p.options.find((o) => o.id !== p.default);
                        return nonDefault
                            ? `--preset-param ${k}=${nonDefault.id}`
                            : `--preset-param ${k}=${p.default}`;
                    });
                if (paramExamples.length > 0) {
                    lines.push(
                        chalk.dim(
                            `  container-superposition init --preset ${overlay.id} ${paramExamples.join(' ')}`
                        )
                    );
                }
            }
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
    const services = getDockerComposeServices(overlaysDir, overlay.id);
    if (services.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Docker Compose Services:'));
        lines.push(chalk.dim('  (Services will be added to docker-compose.yml)'));

        for (const serviceName of services) {
            lines.push(`  🐳 ${serviceName}`);
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
            const services = getDockerComposeServices(overlaysDir, overlayId);

            // For presets, include the full preset definition
            const presetDef =
                overlay.category === 'preset' ? loadPresetDefinition(overlaysDir, overlayId) : null;

            const output: Record<string, any> = {
                ...overlay,
                files,
                devcontainerPatch: patch,
                dockerComposeServices: services,
            };

            if (presetDef) {
                output.presetDefinition = presetDef;
            }

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
