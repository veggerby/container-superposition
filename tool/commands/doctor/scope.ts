import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { OverlaysConfig } from '../../schema/types.js';
import { loadProjectConfig } from '../../schema/project-config.js';
import type { DoctorMode } from '../../ux/semantics/types.js';
import type { DoctorOptions } from './types.js';

export interface DoctorContext {
    workingDir: string;
    outputPath: string;
    explicitManifestPath?: string;
    doctorMode: DoctorMode;
}

export function resolveDoctorContext(
    overlaysConfig: OverlaysConfig,
    options: DoctorOptions
): DoctorContext {
    if (options.fromManifest && options.fromProject) {
        console.error(
            chalk.red('✗ Error: --from-manifest and --from-project cannot be used together')
        );
        process.exit(1);
    }

    const workingDir = options.projectRoot ? path.resolve(options.projectRoot) : process.cwd();

    if (options.projectRoot) {
        if (!fs.existsSync(workingDir)) {
            console.error(chalk.red(`✗ Project root not found: ${workingDir}`));
            process.exit(1);
        }
        if (!fs.statSync(workingDir).isDirectory()) {
            console.error(chalk.red(`✗ Project root is not a directory: ${workingDir}`));
            process.exit(1);
        }
    }

    let outputPath: string;
    let explicitManifestPath: string | undefined;

    if (options.fromManifest) {
        const resolvedManifest = path.resolve(workingDir, options.fromManifest);
        if (!fs.existsSync(resolvedManifest)) {
            console.error(chalk.red(`✗ Could not find manifest file: ${resolvedManifest}`));
            process.exit(1);
        }
        explicitManifestPath = resolvedManifest;

        try {
            const raw = JSON.parse(fs.readFileSync(resolvedManifest, 'utf8'));
            const manifestOutputPath =
                typeof raw.outputPath === 'string' ? raw.outputPath : '.devcontainer';
            outputPath = path.resolve(path.dirname(resolvedManifest), manifestOutputPath);
        } catch {
            outputPath = path.dirname(resolvedManifest);
        }
    } else if (options.fromProject) {
        let projectConfig;
        try {
            projectConfig = loadProjectConfig(overlaysConfig, workingDir);
        } catch (error) {
            console.error(
                chalk.red(
                    `✗ Failed to load project config: ${error instanceof Error ? error.message : String(error)}`
                )
            );
            process.exit(1);
        }
        if (!projectConfig) {
            console.error(chalk.red('✗ Could not find project file'));
            console.error(chalk.gray('  Searched for: .superposition.yml, superposition.yml'));
            console.error(
                chalk.gray(
                    '  Use --from-project in a repository that has a project config file, or use --from-manifest <path> instead'
                )
            );
            process.exit(1);
        }
        outputPath = path.resolve(
            workingDir,
            projectConfig.selection.outputPath || '.devcontainer'
        );
    } else {
        outputPath = path.resolve(workingDir, options.output || './.devcontainer');
    }

    const doctorMode: DoctorMode = options.allOverlays
        ? 'Catalog validation'
        : options.fix
          ? options.dryRun
              ? 'Project fix preview'
              : 'Project safe fixes'
          : 'Project diagnosis';

    if (options.dryRun && !options.fix) {
        console.error(
            chalk.red('✗ Error: --dry-run requires --fix. Use: cs doctor --fix --dry-run')
        );
        process.exit(1);
    }

    return { workingDir, outputPath, explicitManifestPath, doctorMode };
}

export function resolveDoctorOverlayIds(
    overlaysConfig: OverlaysConfig,
    workingDir: string,
    outputPath: string,
    explicitManifestPath?: string,
    preferProjectFile = false
): string[] {
    if (preferProjectFile) {
        try {
            const projectConfig = loadProjectConfig(overlaysConfig, workingDir);
            if (projectConfig?.selection.overlays) {
                return [...projectConfig.selection.overlays];
            }
        } catch {
            // ignore and continue
        }
    }

    const manifestPath = explicitManifestPath ?? path.join(outputPath, 'superposition.json');
    if (fs.existsSync(manifestPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { overlays?: unknown };
            if (Array.isArray(raw.overlays)) {
                return raw.overlays.filter((value): value is string => typeof value === 'string');
            }
        } catch {
            // ignore and continue
        }
    }

    if (!preferProjectFile) {
        try {
            const projectConfig = loadProjectConfig(overlaysConfig, workingDir);
            if (projectConfig?.selection.overlays) {
                return [...projectConfig.selection.overlays];
            }
        } catch {
            // ignore and continue
        }
    }

    return [];
}

export function describeDoctorScope(input: {
    allOverlays?: boolean;
    fromManifest?: string;
    selectedOverlayIds: string[];
}): string {
    if (input.allOverlays) {
        return 'full overlay catalog';
    }
    if (input.fromManifest) {
        return `legacy manifest context (${input.selectedOverlayIds.length} selected overlays)`;
    }
    return `selected overlays for current project (${input.selectedOverlayIds.length})`;
}
