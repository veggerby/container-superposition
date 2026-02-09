/**
 * Custom patches loader - loads user customizations from .devcontainer/custom/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { CustomizationConfig, DevContainer } from './types.js';

/**
 * Check if custom directory exists
 */
export function hasCustomDirectory(outputPath: string): boolean {
    const customDir = path.join(outputPath, 'custom');
    return fs.existsSync(customDir);
}

/**
 * Load custom patches from .devcontainer/custom/ directory
 */
export function loadCustomPatches(outputPath: string): CustomizationConfig | null {
    const customDir = path.join(outputPath, 'custom');

    if (!fs.existsSync(customDir)) {
        return null;
    }

    const config: CustomizationConfig = {};

    // Load devcontainer.patch.json
    const devcontainerPatchPath = path.join(customDir, 'devcontainer.patch.json');
    if (fs.existsSync(devcontainerPatchPath)) {
        try {
            const content = fs.readFileSync(devcontainerPatchPath, 'utf-8');
            config.devcontainerPatch = JSON.parse(content) as DevContainer;
        } catch (error) {
            console.warn(`⚠️  Failed to parse ${devcontainerPatchPath}:`, error);
        }
    }

    // Load docker-compose.patch.yml
    const dockerComposePatchPath = path.join(customDir, 'docker-compose.patch.yml');
    if (fs.existsSync(dockerComposePatchPath)) {
        try {
            const content = fs.readFileSync(dockerComposePatchPath, 'utf-8');
            config.dockerComposePatch = yaml.load(content);
        } catch (error) {
            console.warn(`⚠️  Failed to parse ${dockerComposePatchPath}:`, error);
        }
    }

    // Load environment.env
    const envPath = path.join(customDir, 'environment.env');
    if (fs.existsSync(envPath)) {
        try {
            const content = fs.readFileSync(envPath, 'utf-8');
            config.environmentVars = parseEnvFile(content);
        } catch (error) {
            console.warn(`⚠️  Failed to parse ${envPath}:`, error);
        }
    }

    // Load scripts
    const scriptsDir = path.join(customDir, 'scripts');
    if (fs.existsSync(scriptsDir)) {
        config.scripts = {
            postCreate: [],
            postStart: [],
        };

        // Determine the custom directory path relative to workspace root
        // outputPath is typically .devcontainer, so custom is .devcontainer/custom
        const outputDirName = path.basename(outputPath);
        const customRelPath = path.join(outputDirName, 'custom', 'scripts').replace(/\\/g, '/');

        // Check for post-create.sh
        const postCreatePath = path.join(scriptsDir, 'post-create.sh');
        if (fs.existsSync(postCreatePath)) {
            config.scripts.postCreate!.push(`bash ${customRelPath}/post-create.sh`);
        }

        // Check for post-start.sh
        const postStartPath = path.join(scriptsDir, 'post-start.sh');
        if (fs.existsSync(postStartPath)) {
            config.scripts.postStart!.push(`bash ${customRelPath}/post-start.sh`);
        }
    }

    // Scan for custom files to copy
    const filesDir = path.join(customDir, 'files');
    if (fs.existsSync(filesDir)) {
        config.files = [];
        scanCustomFiles(filesDir, filesDir, config.files);
    }

    return config;
}

/**
 * Parse environment file into key-value pairs
 */
function parseEnvFile(content: string): Record<string, string> {
    const env: Record<string, string> = {};

    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        // Parse KEY=VALUE format
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();

            // Preserve the value as-is (including quotes if present)
            env[key] = value;
        }
    }

    return env;
}

/**
 * Recursively scan custom files directory
 */
function scanCustomFiles(
    baseDir: string,
    currentDir: string,
    files: Array<{ source: string; destination: string }>
): void {
    const entries = fs.readdirSync(currentDir);

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanCustomFiles(baseDir, fullPath, files);
        } else if (stat.isFile()) {
            const relativePath = path.relative(baseDir, fullPath);
            files.push({
                source: fullPath,
                destination: relativePath,
            });
        }
    }
}

/**
 * Get list of custom scripts that need to be executable
 */
export function getCustomScriptPaths(outputPath: string): string[] {
    const customDir = path.join(outputPath, 'custom');
    const scriptsDir = path.join(customDir, 'scripts');

    if (!fs.existsSync(scriptsDir)) {
        return [];
    }

    const scripts: string[] = [];

    const postCreatePath = path.join(scriptsDir, 'post-create.sh');
    if (fs.existsSync(postCreatePath)) {
        scripts.push(postCreatePath);
    }

    const postStartPath = path.join(scriptsDir, 'post-start.sh');
    if (fs.existsSync(postStartPath)) {
        scripts.push(postStartPath);
    }

    return scripts;
}
