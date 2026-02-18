/**
 * Summary utilities for post-generation output
 */

import chalk from 'chalk';
import boxen from 'boxen';
import type {
    QuestionnaireAnswers,
    OverlayMetadata,
    NormalizedPort,
    DeploymentTarget,
} from '../schema/types.js';
import { generateUrl } from './port-utils.js';

/**
 * Service information for summary
 */
export interface ServiceInfo {
    name: string;
    category: string;
    version?: string;
}

/**
 * Port information for summary
 */
export interface PortInfo {
    service: string;
    port: number;
    actualPort: number;
    url?: string;
    connectionString?: string;
}

/**
 * Summary of what was generated
 */
export interface GenerationSummary {
    files: string[];
    services: ServiceInfo[];
    ports: PortInfo[];
    warnings: string[];
    tips: string[];
    nextSteps: string[];
    portOffset: number;
    target: DeploymentTarget;
    isManifestOnly: boolean;
    manifestPath?: string;
    backupPath?: string;
}

/**
 * Detect warnings based on selected overlays and configuration
 */
export function detectWarnings(
    overlays: OverlayMetadata[],
    answers: QuestionnaireAnswers
): string[] {
    const warnings: string[] = [];

    // Check for docker-sock security warning
    const hasDockerSock = overlays.some((o) => o.id === 'docker-sock');
    if (hasDockerSock) {
        warnings.push(
            'docker-sock overlay provides root access to host Docker daemon\n  Use only for trusted code. Consider docker-in-docker for isolation.'
        );
    }

    // Check for target mismatch
    const target = answers.target || 'local';
    if (hasDockerSock && target === 'codespaces') {
        warnings.push(
            'docker-sock may not work in GitHub Codespaces\n  Consider using docker-in-docker instead.'
        );
    }

    // Check for high port count
    const portCount = overlays.reduce((count, o) => count + (o.ports?.length || 0), 0);
    if (portCount > 10) {
        warnings.push(
            `High port count (${portCount} ports) may cause conflicts\n  Consider using --port-offset to avoid conflicts with other projects.`
        );
    }

    // Check for no port offset with multiple services
    const hasServices = overlays.some(
        (o) => o.category === 'database' || o.category === 'observability'
    );
    if (hasServices && (!answers.portOffset || answers.portOffset === 0)) {
        warnings.push(
            'Running multiple devcontainers simultaneously may cause port conflicts\n  Use --port-offset 100 (or higher) to avoid conflicts.'
        );
    }

    return warnings;
}

/**
 * Generate helpful tips based on configuration
 */
export function generateTips(overlays: OverlayMetadata[], answers: QuestionnaireAnswers): string[] {
    const tips: string[] = [];

    // Suggest committing manifest
    if (!answers.preset) {
        tips.push('Commit superposition.json to enable team regeneration');
    }

    // Suggest customization directory
    const hasCustomDir = overlays.length > 3;
    if (hasCustomDir) {
        tips.push('Preserve customizations in .devcontainer/custom/');
    }

    // Suggest regen command
    tips.push('Regenerate anytime: npx container-superposition regen');

    return tips;
}

/**
 * Generate next steps based on mode
 */
export function generateNextSteps(isManifestOnly: boolean, isRegen: boolean): string[] {
    if (isManifestOnly) {
        return [
            'Review the generated superposition.json file',
            'Commit it to your repository',
            'Team members can run "npx container-superposition regen"',
        ];
    }

    if (isRegen) {
        return [
            'Rebuild container: F1 → "Dev Containers: Rebuild Container"',
            'Test changes manually',
            'Review any customizations in .devcontainer/custom/',
        ];
    }

    return [
        'Customize environment:\n     cp .devcontainer/.env.example .devcontainer/.env',
        'Open in VS Code:\n     code .',
        'Reopen in Container:\n     Press F1 → "Dev Containers: Reopen in Container"',
        'Verify setup:\n     npx container-superposition doctor',
    ];
}

/**
 * Convert overlay metadata to service info
 */
export function overlaysToServices(overlays: OverlayMetadata[]): ServiceInfo[] {
    return overlays.map((overlay) => {
        // Extract version from name if present (e.g., "PostgreSQL 16" -> version: "16")
        const versionMatch = overlay.name.match(/\d+(?:\.\d+)?/);
        const version = versionMatch ? versionMatch[0] : undefined;

        return {
            name: overlay.name,
            category: overlay.category,
            version,
        };
    });
}

/**
 * Convert normalized ports to port info with URLs
 */
export function portsToPortInfo(
    ports: NormalizedPort[],
    connectionStrings: Record<string, string>
): PortInfo[] {
    return ports.map((port) => {
        const service = port.service || 'unknown';
        const url = generateUrl(port);

        // Try to find connection string for this service
        let connectionString: string | undefined;
        if (connectionStrings[service]) {
            connectionString = connectionStrings[service];
        } else if (connectionStrings[`${service}-url`]) {
            connectionString = connectionStrings[`${service}-url`];
        }

        return {
            service,
            port: port.port,
            actualPort: port.actualPort,
            url,
            connectionString,
        };
    });
}

/**
 * Format and print generation summary.
 *
 * @param summary The generation summary to render.
 * @param quiet   When true, suppresses all console output. This parameter is
 *                reserved for callers (for example, CLI commands or tests)
 *                that need to generate a summary object but handle user
 *                messaging themselves.
 */
export function printSummary(summary: GenerationSummary, quiet: boolean = false): void {
    // If quiet mode is enabled, skip printing while still allowing callers
    // to invoke this function consistently. See the JSDoc for intended usage.
    if (quiet) {
        return;
    }

    const lines: string[] = [];

    // Header
    const title = summary.isManifestOnly
        ? '📋 Manifest Generated'
        : summary.backupPath
          ? '🔄 DevContainer Regenerated'
          : '✨ DevContainer Generated';

    lines.push(chalk.bold.green(title));
    lines.push('');

    // Backup notification (for regen)
    if (summary.backupPath) {
        lines.push(chalk.yellow(`Backup created: ${summary.backupPath}`));
        lines.push('');
    }

    // Files created (manifest-only shows just manifest)
    if (summary.isManifestOnly) {
        lines.push(chalk.white('Manifest:'));
        lines.push(chalk.gray(`  ${summary.manifestPath || 'superposition.json'}`));
        lines.push('');
    } else {
        lines.push(chalk.white('Files created:'));
        for (const file of summary.files.slice(0, 8)) {
            lines.push(chalk.gray(`  ${file}`));
        }
        if (summary.files.length > 8) {
            lines.push(chalk.gray(`  ... and ${summary.files.length - 8} more`));
        }
        lines.push('');
    }

    // Services included
    if (summary.services.length > 0) {
        lines.push(chalk.white('Services included:'));
        const displayServices = summary.services.slice(0, 10);
        for (const service of displayServices) {
            const versionStr = service.version ? ` ${service.version}` : '';
            const categoryStr = chalk.dim(` (${service.category})`);
            lines.push(chalk.green(`  ✓ ${service.name}${versionStr}`) + categoryStr);
        }
        if (summary.services.length > 10) {
            lines.push(chalk.gray(`  ... and ${summary.services.length - 10} more`));
        }
        lines.push('');
    }

    // Port mappings and service URLs
    if (summary.ports.length > 0) {
        lines.push(chalk.white('🌐 Service Access'));
        lines.push('');

        // Group by HTTP services and database services
        const httpPorts = summary.ports.filter((p) => p.url);
        const dbPorts = summary.ports.filter((p) => p.connectionString && !p.url);

        // Show application/HTTP services first
        if (httpPorts.length > 0) {
            for (const port of httpPorts) {
                const label = port.service.charAt(0).toUpperCase() + port.service.slice(1);
                lines.push(chalk.cyan(`  ${label}:`));
                lines.push(chalk.gray(`    ${port.url}`));
            }
            lines.push('');
        }

        // Show database/infrastructure services
        if (dbPorts.length > 0) {
            lines.push(chalk.white('  Infrastructure:'));
            for (const port of dbPorts) {
                const label = port.service.charAt(0).toUpperCase() + port.service.slice(1);
                lines.push(chalk.cyan(`    ${label}:`));
                lines.push(chalk.gray(`      ${port.connectionString}`));
            }
            lines.push('');
        }

        // Port offset info
        if (summary.portOffset > 0) {
            lines.push(chalk.dim(`  Port offset: ${summary.portOffset}`));
        } else {
            lines.push(chalk.dim('  Port offset: 0 (use --port-offset to avoid conflicts)'));
        }
        lines.push('');
    }

    // Warnings
    if (summary.warnings.length > 0) {
        lines.push(chalk.yellow('⚠️  Warnings'));
        lines.push('');
        for (const warning of summary.warnings) {
            const warningLines = warning.split('\n');
            lines.push(chalk.yellow(`  • ${warningLines[0]}`));
            for (let i = 1; i < warningLines.length; i++) {
                lines.push(chalk.dim(`    ${warningLines[i]}`));
            }
        }
        lines.push('');
    }

    // Tips
    if (summary.tips.length > 0) {
        lines.push(chalk.cyan('💡 Tips'));
        lines.push('');
        for (const tip of summary.tips) {
            lines.push(chalk.gray(`  • ${tip}`));
        }
        lines.push('');
    }

    // Next steps
    lines.push(chalk.white('📝 Next Steps'));
    lines.push('');
    for (let i = 0; i < summary.nextSteps.length; i++) {
        const step = summary.nextSteps[i];
        const stepLines = step.split('\n');
        lines.push(chalk.gray(`  ${i + 1}. ${stepLines[0]}`));
        for (let j = 1; j < stepLines.length; j++) {
            lines.push(chalk.dim(`     ${stepLines[j]}`));
        }
    }

    // Footer
    if (!summary.isManifestOnly) {
        lines.push('');
        lines.push(
            chalk.dim(
                `Generated in .devcontainer/ • Manifest: ${summary.manifestPath || 'superposition.json'}`
            )
        );
    }

    // Print with boxen
    console.log(
        '\n' +
            boxen(lines.join('\n'), {
                padding: 1,
                borderColor: 'green',
                borderStyle: 'round',
                margin: 1,
            })
    );
}
