/**
 * Utility functions for version management
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the current tool version from package.json
 * Works in both source (TypeScript) and compiled (JavaScript) contexts
 */
export function getToolVersion(): string {
    try {
        // Try multiple paths to handle different execution contexts
        const packageJsonCandidates = [
            // From tool/utils/ (source)
            path.join(__dirname, '..', '..', 'package.json'),
            // From dist/tool/utils/ (compiled)
            path.join(__dirname, '..', '..', '..', 'package.json'),
        ];

        const packageJsonPath =
            packageJsonCandidates.find((candidate) => fs.existsSync(candidate)) ??
            packageJsonCandidates[0];

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version || 'unknown';
    } catch (error) {
        return 'unknown';
    }
}
