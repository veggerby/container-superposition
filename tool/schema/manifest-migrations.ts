/**
 * Manifest migration framework
 *
 * Provides automatic migration of superposition.json manifests when schema versions change.
 */

import type { SuperpositionManifest } from './types.js';

/**
 * Current manifest schema version
 */
export const CURRENT_MANIFEST_VERSION = '1';

/**
 * Migration definition
 */
export interface Migration {
    from: string;
    to: string;
    migrate: (manifest: any) => any;
    description: string;
}

/**
 * Registry of all available migrations
 */
const migrations: Migration[] = [
    // Add migrations here as schema evolves
    // Example:
    // {
    //     from: '1',
    //     to: '2',
    //     migrate: migrateV1ToV2,
    //     description: 'Split overlays into presets and overlays'
    // }
];

/**
 * Detect manifest version from the manifest object
 */
export function detectManifestVersion(manifest: any): string {
    // New format: has manifestVersion field
    if (manifest.manifestVersion) {
        return manifest.manifestVersion;
    }

    // Legacy format (v1): has version field only (tool version)
    // All manifests before versioning system are considered v1
    if (manifest.version && !manifest.manifestVersion) {
        return '1';
    }

    // Unknown format
    return '0';
}

/**
 * Check if a manifest is the current version
 */
export function isCurrentVersion(manifest: any): boolean {
    const version = detectManifestVersion(manifest);
    return version === CURRENT_MANIFEST_VERSION;
}

/**
 * Check if a manifest version is compatible (within N-1 support window)
 */
export function isCompatibleVersion(manifest: any): boolean {
    const version = detectManifestVersion(manifest);
    const versionNum = parseInt(version, 10);
    const currentNum = parseInt(CURRENT_MANIFEST_VERSION, 10);

    // Unknown version
    if (isNaN(versionNum)) {
        return false;
    }

    // Support current and previous version
    return versionNum >= currentNum - 1 && versionNum <= currentNum;
}

/**
 * Find migration path from one version to another
 */
function findMigrationPath(fromVersion: string, toVersion: string): Migration[] {
    const path: Migration[] = [];
    let currentVersion = fromVersion;

    // Find chain of migrations
    while (currentVersion !== toVersion) {
        const migration = migrations.find((m) => m.from === currentVersion);

        if (!migration) {
            // No migration path found
            return [];
        }

        path.push(migration);
        currentVersion = migration.to;

        // Prevent infinite loops
        if (path.length > 100) {
            return [];
        }
    }

    return path;
}

/**
 * Migrate a manifest to the current version
 *
 * @param manifest - The manifest to migrate
 * @returns The migrated manifest, or null if migration failed
 */
export function migrateManifest(manifest: any): SuperpositionManifest | null {
    const fromVersion = detectManifestVersion(manifest);

    // Already current version
    if (fromVersion === CURRENT_MANIFEST_VERSION) {
        return normalizeManifest(manifest);
    }

    // Check if compatible
    if (!isCompatibleVersion(manifest)) {
        console.error(
            `Manifest version ${fromVersion} is not compatible with current version ${CURRENT_MANIFEST_VERSION}`
        );
        return null;
    }

    // Find migration path
    const migrationPath = findMigrationPath(fromVersion, CURRENT_MANIFEST_VERSION);

    if (migrationPath.length === 0 && fromVersion !== CURRENT_MANIFEST_VERSION) {
        console.error(`No migration path found from version ${fromVersion} to ${CURRENT_MANIFEST_VERSION}`);
        return null;
    }

    // Apply migrations in sequence
    let result = manifest;
    for (const migration of migrationPath) {
        try {
            result = migration.migrate(result);
        } catch (error) {
            console.error(
                `Migration failed (${migration.from} → ${migration.to}): ${error instanceof Error ? error.message : String(error)}`
            );
            return null;
        }
    }

    return normalizeManifest(result);
}

/**
 * Normalize a manifest to ensure it has the correct structure
 * Handles legacy v1 manifests that need field renaming
 */
function normalizeManifest(manifest: any): SuperpositionManifest {
    // If this is a legacy v1 manifest, convert version -> generatedBy
    if (manifest.version && !manifest.manifestVersion && !manifest.generatedBy) {
        const { version, ...rest } = manifest;
        return {
            manifestVersion: '1',
            generatedBy: version,
            ...rest,
        };
    }

    // Already has new structure
    return manifest;
}

/**
 * Get description of changes between versions
 */
export function getMigrationDescription(fromVersion: string, toVersion: string): string[] {
    const path = findMigrationPath(fromVersion, toVersion);
    return path.map((m) => m.description);
}
