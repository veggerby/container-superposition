/**
 * Manifest migration framework
 *
 * Handles automatic migration of superposition.json manifests between schema versions.
 * Migrations are pure functions that transform manifests from one version to another.
 */

import type { SuperpositionManifest } from './types.js';

/**
 * Current manifest schema version
 * Only increment when schema changes require migration
 */
export const CURRENT_MANIFEST_VERSION = '1';

/**
 * Supported manifest versions (current + N-1)
 * Older versions require manual intervention
 */
export const SUPPORTED_MANIFEST_VERSIONS = ['1'];

/**
 * Migration function signature
 */
export interface Migration {
    from: string;
    to: string;
    description: string;
    migrate: (manifest: any) => any;
}

/**
 * Registry of all migrations
 * Migrations form a chain: v1 → v2 → v3, etc.
 */
const MIGRATIONS: Migration[] = [
    // Future migrations will be added here
    // Example:
    // {
    //     from: '1',
    //     to: '2',
    //     description: 'Split overlays into presets and overlays',
    //     migrate: (m) => ({
    //         ...m,
    //         manifestVersion: '2',
    //         // apply transformations
    //     }),
    // },
];

/**
 * Detect manifest version from any manifest format
 */
export function detectManifestVersion(manifest: any): string {
    // New format: manifestVersion field
    if (manifest.manifestVersion) {
        return manifest.manifestVersion;
    }

    // Legacy format: version field represents manifest format
    if (manifest.version) {
        // Legacy manifests use version '0.1.0' for manifest format
        return '1'; // Map legacy to version 1
    }

    // Unknown/invalid format
    return '0';
}

/**
 * Check if a manifest version is supported
 */
export function isVersionSupported(version: string): boolean {
    return SUPPORTED_MANIFEST_VERSIONS.includes(version);
}

/**
 * Get migration path from one version to another
 */
function getMigrationPath(fromVersion: string, toVersion: string): Migration[] {
    const path: Migration[] = [];
    let currentVersion = fromVersion;

    // Build migration chain
    while (currentVersion !== toVersion) {
        const migration = MIGRATIONS.find((m) => m.from === currentVersion);
        if (!migration) {
            throw new Error(
                `No migration path from version ${fromVersion} to ${toVersion}. ` +
                    `Stuck at version ${currentVersion}.`
            );
        }
        path.push(migration);
        currentVersion = migration.to;
    }

    return path;
}

/**
 * Migrate manifest to current version
 *
 * @param manifest - Manifest in any supported version
 * @returns Migrated manifest in current version
 * @throws Error if manifest version is unsupported or migration fails
 */
export function migrateManifest(manifest: any): SuperpositionManifest {
    const currentVersion = detectManifestVersion(manifest);

    // Handle legacy format (version field, no manifestVersion)
    if (currentVersion === '1' && !manifest.manifestVersion) {
        // This is a legacy v0.1.0 manifest - migrate to new format
        const migrated: SuperpositionManifest = {
            manifestVersion: '1',
            generatedBy: manifest.version || 'unknown',
            version: manifest.version, // Keep for backward compatibility
            generated: manifest.generated,
            baseTemplate: manifest.baseTemplate,
            baseImage: manifest.baseImage,
            overlays: manifest.overlays,
            portOffset: manifest.portOffset,
            preset: manifest.preset,
            presetChoices: manifest.presetChoices,
            autoResolved: manifest.autoResolved,
            containerName: manifest.containerName,
            customizations: manifest.customizations,
        };
        return migrated;
    }

    // Check if version is supported
    if (!isVersionSupported(currentVersion)) {
        throw new Error(
            `Manifest version ${currentVersion} is not supported. ` +
                `Supported versions: ${SUPPORTED_MANIFEST_VERSIONS.join(', ')}. ` +
                `Please upgrade your tool or regenerate the manifest.`
        );
    }

    // Already at current version
    if (currentVersion === CURRENT_MANIFEST_VERSION) {
        return manifest as SuperpositionManifest;
    }

    // Apply migration chain
    const migrationPath = getMigrationPath(currentVersion, CURRENT_MANIFEST_VERSION);
    let migrated = { ...manifest };

    for (const migration of migrationPath) {
        try {
            migrated = migration.migrate(migrated);
        } catch (error) {
            throw new Error(
                `Migration from ${migration.from} to ${migration.to} failed: ` +
                    `${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    return migrated as SuperpositionManifest;
}

/**
 * Check if a manifest needs migration
 */
export function needsMigration(manifest: any): boolean {
    const currentVersion = detectManifestVersion(manifest);

    // Legacy format always needs migration
    if (currentVersion === '1' && !manifest.manifestVersion) {
        return true;
    }

    return currentVersion !== CURRENT_MANIFEST_VERSION;
}

/**
 * Get human-readable migration summary
 */
export function getMigrationSummary(manifest: any): string {
    const currentVersion = detectManifestVersion(manifest);

    if (currentVersion === '1' && !manifest.manifestVersion) {
        return `Legacy manifest (v${manifest.version || 'unknown'}) → v${CURRENT_MANIFEST_VERSION}`;
    }

    if (currentVersion === CURRENT_MANIFEST_VERSION) {
        return 'No migration needed';
    }

    try {
        const path = getMigrationPath(currentVersion, CURRENT_MANIFEST_VERSION);
        const steps = path.map((m) => `${m.from} → ${m.to}`).join(', ');
        return `Migration path: ${steps}`;
    } catch (error) {
        return `Unsupported version ${currentVersion}`;
    }
}
