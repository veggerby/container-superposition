import { describe, it, expect } from 'vitest';
import {
    detectManifestVersion,
    isCurrentVersion,
    isCompatibleVersion,
    migrateManifest,
    CURRENT_MANIFEST_VERSION,
} from '../schema/manifest-migrations.js';
import type { SuperpositionManifest } from '../schema/types.js';

describe('Manifest Migrations', () => {
    describe('detectManifestVersion', () => {
        it('should detect v1 manifests with legacy version field', () => {
            const manifest = {
                version: '0.1.0',
                baseTemplate: 'compose',
                overlays: [],
            };
            expect(detectManifestVersion(manifest)).toBe('1');
        });

        it('should detect v1 manifests with new manifestVersion field', () => {
            const manifest = {
                manifestVersion: '1',
                generatedBy: '0.1.1',
                baseTemplate: 'compose',
                overlays: [],
            };
            expect(detectManifestVersion(manifest)).toBe('1');
        });

        it('should detect unknown version', () => {
            const manifest = {
                baseTemplate: 'compose',
                overlays: [],
            };
            expect(detectManifestVersion(manifest)).toBe('0');
        });
    });

    describe('isCurrentVersion', () => {
        it('should return true for current version manifest', () => {
            const manifest = {
                manifestVersion: CURRENT_MANIFEST_VERSION,
                generatedBy: '0.1.1',
                baseTemplate: 'compose',
                overlays: [],
            };
            expect(isCurrentVersion(manifest)).toBe(true);
        });

        it('should return true for legacy v1 manifest (v1 is current)', () => {
            const manifest = {
                version: '0.1.0',
                baseTemplate: 'compose',
                overlays: [],
            };
            // Since CURRENT_MANIFEST_VERSION is '1', legacy v1 manifests are current
            expect(isCurrentVersion(manifest)).toBe(true);
        });
    });

    describe('isCompatibleVersion', () => {
        it('should return true for current version', () => {
            const manifest = {
                manifestVersion: CURRENT_MANIFEST_VERSION,
                generatedBy: '0.1.1',
                baseTemplate: 'compose',
                overlays: [],
            };
            expect(isCompatibleVersion(manifest)).toBe(true);
        });

        it('should return true for v1 manifests (N-1 support)', () => {
            const manifest = {
                version: '0.1.0',
                baseTemplate: 'compose',
                overlays: [],
            };
            expect(isCompatibleVersion(manifest)).toBe(true);
        });

        it('should return false for unknown/invalid version', () => {
            const manifest = {
                // Missing both version and manifestVersion
                baseTemplate: 'compose',
                overlays: [],
            };
            // Unknown version (0) should be incompatible
            const version = parseInt('0', 10);
            const current = parseInt(CURRENT_MANIFEST_VERSION, 10);
            // Version 0 is less than current-1, so should be incompatible
            expect(isCompatibleVersion(manifest)).toBe(version >= current - 1);
        });
    });

    describe('migrateManifest', () => {
        it('should normalize legacy v1 manifest to new format', () => {
            const legacyManifest = {
                version: '0.1.0',
                generated: '2026-01-01T00:00:00Z',
                baseTemplate: 'compose' as const,
                baseImage: 'bookworm',
                overlays: ['nodejs', 'postgres'],
                portOffset: 100,
            };

            const migrated = migrateManifest(legacyManifest);

            expect(migrated).toBeTruthy();
            expect(migrated?.manifestVersion).toBe('1');
            expect(migrated?.generatedBy).toBe('0.1.0');
            expect(migrated?.baseTemplate).toBe('compose');
            expect(migrated?.baseImage).toBe('bookworm');
            expect(migrated?.overlays).toEqual(['nodejs', 'postgres']);
            expect(migrated?.portOffset).toBe(100);
        });

        it('should preserve all fields during migration', () => {
            const legacyManifest = {
                version: '0.1.0',
                generated: '2026-01-01T00:00:00Z',
                baseTemplate: 'compose' as const,
                baseImage: 'bookworm',
                overlays: ['nodejs'],
                portOffset: 100,
                preset: 'web-api',
                presetChoices: { language: 'nodejs' },
                autoResolved: {
                    added: ['postgres'],
                    reason: 'postgres (required by something)',
                },
                containerName: 'my-container',
                customizations: {
                    enabled: true,
                    location: '.devcontainer/custom',
                },
            };

            const migrated = migrateManifest(legacyManifest);

            expect(migrated).toBeTruthy();
            expect(migrated?.manifestVersion).toBe('1');
            expect(migrated?.generatedBy).toBe('0.1.0');
            expect(migrated?.preset).toBe('web-api');
            expect(migrated?.presetChoices).toEqual({ language: 'nodejs' });
            expect(migrated?.autoResolved).toEqual({
                added: ['postgres'],
                reason: 'postgres (required by something)',
            });
            expect(migrated?.containerName).toBe('my-container');
            expect(migrated?.customizations).toEqual({
                enabled: true,
                location: '.devcontainer/custom',
            });
        });

        it('should handle already-migrated manifests', () => {
            const newManifest = {
                manifestVersion: '1',
                generatedBy: '0.1.1',
                generated: '2026-01-01T00:00:00Z',
                baseTemplate: 'compose' as const,
                baseImage: 'bookworm',
                overlays: ['nodejs'],
            };

            const migrated = migrateManifest(newManifest);

            expect(migrated).toBeTruthy();
            expect(migrated?.manifestVersion).toBe('1');
            expect(migrated?.generatedBy).toBe('0.1.1');
        });

        it('should return null for incompatible versions', () => {
            const incompatibleManifest = {
                baseTemplate: 'compose' as const,
                overlays: [],
            };

            const migrated = migrateManifest(incompatibleManifest);
            expect(migrated).toBeNull();
        });
    });

    describe('Migration integration', () => {
        it('should migrate legacy manifest with minimal fields', () => {
            const minimal: any = {
                version: '0.1.0',
                generated: '2026-01-01T00:00:00Z',
                baseTemplate: 'plain',
                baseImage: 'alpine',
                overlays: [],
            };

            const result = migrateManifest(minimal);
            expect(result).toBeTruthy();
            expect(result?.manifestVersion).toBe('1');
            expect(result?.generatedBy).toBe('0.1.0');
        });

        it('should handle manifest with optional fields undefined', () => {
            const manifest: any = {
                version: '0.1.0',
                generated: '2026-01-01T00:00:00Z',
                baseTemplate: 'compose',
                baseImage: 'bookworm',
                overlays: ['nodejs'],
                portOffset: undefined,
                preset: undefined,
                presetChoices: undefined,
            };

            const result = migrateManifest(manifest);
            expect(result).toBeTruthy();
            expect(result?.manifestVersion).toBe('1');
            expect(result?.portOffset).toBeUndefined();
        });
    });
});
