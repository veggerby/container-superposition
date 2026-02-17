/**
 * Tests for manifest migration framework
 */

import { describe, it, expect } from 'vitest';
import {
    migrateManifest,
    needsMigration,
    detectManifestVersion,
    isVersionSupported,
    CURRENT_MANIFEST_VERSION,
    SUPPORTED_MANIFEST_VERSIONS,
} from '../schema/manifest-migrations.js';
import type { SuperpositionManifest } from '../schema/types.js';

describe('Manifest Migration Framework', () => {
    describe('detectManifestVersion', () => {
        it('should detect current format with manifestVersion field', () => {
            const manifest = {
                manifestVersion: '1',
                generatedBy: '0.1.2',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: ['nodejs'],
            };

            expect(detectManifestVersion(manifest)).toBe('1');
        });

        it('should detect legacy format with version field', () => {
            const manifest = {
                version: '0.1.0',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: ['nodejs'],
            };

            expect(detectManifestVersion(manifest)).toBe('1');
        });

        it('should return "0" for unknown format', () => {
            const manifest = {
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                overlays: [],
            };

            expect(detectManifestVersion(manifest)).toBe('0');
        });
    });

    describe('isVersionSupported', () => {
        it('should return true for supported versions', () => {
            SUPPORTED_MANIFEST_VERSIONS.forEach((version) => {
                expect(isVersionSupported(version)).toBe(true);
            });
        });

        it('should return false for unsupported versions', () => {
            expect(isVersionSupported('0')).toBe(false);
            expect(isVersionSupported('999')).toBe(false);
            expect(isVersionSupported('invalid')).toBe(false);
        });
    });

    describe('needsMigration', () => {
        it('should return false for current format', () => {
            const manifest = {
                manifestVersion: CURRENT_MANIFEST_VERSION,
                generatedBy: '0.1.2',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: ['nodejs'],
            };

            expect(needsMigration(manifest)).toBe(false);
        });

        it('should return true for legacy format', () => {
            const manifest = {
                version: '0.1.0',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: ['nodejs'],
            };

            expect(needsMigration(manifest)).toBe(true);
        });

        it('should return false for legacy format already migrated', () => {
            const manifest = {
                manifestVersion: '1',
                generatedBy: '0.1.0',
                version: '0.1.0', // Legacy field kept for backward compat
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: ['nodejs'],
            };

            expect(needsMigration(manifest)).toBe(false);
        });
    });

    describe('migrateManifest', () => {
        it('should migrate legacy format to current version', () => {
            const legacyManifest = {
                version: '0.1.0',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose' as const,
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: ['nodejs', 'postgres'],
                portOffset: 100,
                preset: 'web-api',
                presetChoices: { database: 'postgres' },
                autoResolved: {
                    added: ['dependency1'],
                    reason: 'Required by nodejs',
                },
                containerName: 'my-container',
                customizations: {
                    enabled: true,
                    location: '.devcontainer/custom',
                },
            };

            const migrated = migrateManifest(legacyManifest);

            // Should have new fields
            expect(migrated.manifestVersion).toBe('1');
            expect(migrated.generatedBy).toBe('0.1.0');
            expect(migrated.version).toBe('0.1.0'); // Legacy field preserved

            // Should preserve all original fields
            expect(migrated.generated).toBe(legacyManifest.generated);
            expect(migrated.baseTemplate).toBe(legacyManifest.baseTemplate);
            expect(migrated.baseImage).toBe(legacyManifest.baseImage);
            expect(migrated.overlays).toEqual(legacyManifest.overlays);
            expect(migrated.portOffset).toBe(legacyManifest.portOffset);
            expect(migrated.preset).toBe(legacyManifest.preset);
            expect(migrated.presetChoices).toEqual(legacyManifest.presetChoices);
            expect(migrated.autoResolved).toEqual(legacyManifest.autoResolved);
            expect(migrated.containerName).toBe(legacyManifest.containerName);
            expect(migrated.customizations).toEqual(legacyManifest.customizations);
        });

        it('should handle minimal legacy manifest', () => {
            const minimalManifest = {
                version: '0.1.0',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'plain' as const,
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: [],
            };

            const migrated = migrateManifest(minimalManifest);

            expect(migrated.manifestVersion).toBe('1');
            expect(migrated.generatedBy).toBe('0.1.0');
            expect(migrated.overlays).toEqual([]);
            expect(migrated.portOffset).toBeUndefined();
            expect(migrated.preset).toBeUndefined();
        });

        it('should return manifest unchanged if already current version', () => {
            const currentManifest: SuperpositionManifest = {
                manifestVersion: CURRENT_MANIFEST_VERSION,
                generatedBy: '0.1.2',
                version: '0.1.0',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: ['nodejs'],
            };

            const migrated = migrateManifest(currentManifest);

            expect(migrated).toEqual(currentManifest);
        });

        it('should throw error for unsupported version', () => {
            const unsupportedManifest = {
                manifestVersion: '999',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: [],
            };

            expect(() => migrateManifest(unsupportedManifest)).toThrow(
                /Manifest version 999 is not supported/
            );
        });

        it('should throw error for unknown format', () => {
            const unknownManifest = {
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose',
                overlays: [],
            };

            expect(() => migrateManifest(unknownManifest)).toThrow(
                /Manifest version 0 is not supported/
            );
        });

        it('should handle legacy manifest without version field', () => {
            const legacyManifest = {
                // No version or manifestVersion - should be treated as unknown
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose' as const,
                baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                overlays: ['nodejs'],
            };

            expect(() => migrateManifest(legacyManifest)).toThrow(
                /Manifest version 0 is not supported/
            );
        });
    });

    describe('Backward Compatibility', () => {
        it('should maintain all fields from legacy manifests', () => {
            const legacyWithAllFields = {
                version: '0.1.0',
                generated: '2026-02-17T00:00:00Z',
                baseTemplate: 'compose' as const,
                baseImage: 'custom-image:latest',
                overlays: ['overlay1', 'overlay2', 'overlay3'],
                portOffset: 200,
                preset: 'test-preset',
                presetChoices: {
                    choice1: 'value1',
                    choice2: 'value2',
                },
                autoResolved: {
                    added: ['dep1', 'dep2'],
                    reason: 'Test reason',
                },
                containerName: 'test-container',
                customizations: {
                    enabled: true,
                    location: 'custom-location',
                },
            };

            const migrated = migrateManifest(legacyWithAllFields);

            // Check all fields are preserved
            Object.keys(legacyWithAllFields).forEach((key) => {
                expect(migrated).toHaveProperty(key);
            });

            // New fields should be added
            expect(migrated).toHaveProperty('manifestVersion');
            expect(migrated).toHaveProperty('generatedBy');
        });
    });

    describe('Future Migration Chain', () => {
        it('should support migration chain structure', () => {
            // This test documents how future migrations would work
            // When we add v2, we'd add a migration like:
            // {
            //   from: '1',
            //   to: '2',
            //   description: 'Example migration',
            //   migrate: (m) => ({ ...m, manifestVersion: '2', newField: 'value' })
            // }

            // For now, we just verify the current version is supported
            expect(SUPPORTED_MANIFEST_VERSIONS).toContain(CURRENT_MANIFEST_VERSION);
            expect(CURRENT_MANIFEST_VERSION).toBe('1');
        });
    });
});
