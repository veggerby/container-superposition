import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
    loadOverlaysConfig,
    loadOverlayManifest,
    loadOverlayManifests,
    loadBaseImages,
    loadBaseTemplates,
} from '../schema/overlay-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

describe('Overlay Loader', () => {
    describe('loadOverlayManifest', () => {
        it('should load a valid overlay manifest', () => {
            const nodejsDir = path.join(OVERLAYS_DIR, 'nodejs');
            const manifest = loadOverlayManifest(nodejsDir);

            expect(manifest).toBeDefined();
            expect(manifest?.id).toBe('nodejs');
            expect(manifest?.name).toBe('Node.js');
            expect(manifest?.category).toBe('language');
            expect(manifest?.description).toBeTruthy();
        });

        it('should return null for non-existent overlay', () => {
            const fakeDir = path.join(OVERLAYS_DIR, 'nonexistent-overlay');
            const manifest = loadOverlayManifest(fakeDir);

            expect(manifest).toBeNull();
        });

        it('should set default empty arrays for optional fields', () => {
            const nodejsDir = path.join(OVERLAYS_DIR, 'nodejs');
            const manifest = loadOverlayManifest(nodejsDir);

            expect(manifest?.supports).toEqual([]);
            expect(manifest?.requires).toEqual([]);
            expect(manifest?.suggests).toEqual([]);
            expect(manifest?.conflicts).toEqual([]);
            expect(manifest?.tags).toBeDefined();
            expect(manifest?.ports).toEqual([]);
        });
    });

    describe('loadOverlayManifests', () => {
        it('should load all overlay manifests from directory', () => {
            const manifests = loadOverlayManifests(OVERLAYS_DIR);

            // Test for known overlays rather than hard-coded count
            expect(manifests.size).toBeGreaterThan(0);
            expect(manifests.has('nodejs')).toBe(true);
            expect(manifests.has('python')).toBe(true);
            expect(manifests.has('postgres')).toBe(true);
            expect(manifests.has('redis')).toBe(true);
            expect(manifests.has('dotnet')).toBe(true);
            expect(manifests.has('grafana')).toBe(true);
        });

        it('should skip .registry and presets directories', () => {
            const manifests = loadOverlayManifests(OVERLAYS_DIR);

            expect(manifests.has('.registry')).toBe(false);
            expect(manifests.has('presets')).toBe(false);
        });

        it('should validate ID matches directory name', () => {
            const manifests = loadOverlayManifests(OVERLAYS_DIR);

            for (const [id, manifest] of manifests) {
                expect(manifest.id).toBe(id);
            }
        });
    });

    describe('loadBaseImages', () => {
        it('should load base images from registry', () => {
            const baseImages = loadBaseImages(OVERLAYS_DIR);

            expect(baseImages.length).toBeGreaterThan(0);
            expect(baseImages.some((img) => img.id === 'bookworm')).toBe(true);
            expect(baseImages.some((img) => img.id === 'alpine')).toBe(true);
            expect(baseImages.some((img) => img.id === 'ubuntu')).toBe(true);
        });

        it('should include package manager for each image', () => {
            const baseImages = loadBaseImages(OVERLAYS_DIR);

            for (const image of baseImages) {
                if (image.id !== 'custom') {
                    // custom may not have package_manager
                    expect(['apt', 'apk']).toContain(image.package_manager);
                }
            }
        });
    });

    describe('loadBaseTemplates', () => {
        it('should load base templates from registry', () => {
            const baseTemplates = loadBaseTemplates(OVERLAYS_DIR);

            expect(baseTemplates.length).toBe(2);
            expect(baseTemplates.some((t) => t.id === 'plain')).toBe(true);
            expect(baseTemplates.some((t) => t.id === 'compose')).toBe(true);
        });
    });

    describe('loadOverlaysConfig', () => {
        it('should build complete config from manifests', () => {
            const config = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);

            expect(config.base_images.length).toBeGreaterThan(0);
            expect(config.base_templates.length).toBe(2);
            expect(config.overlays.length).toBeGreaterThan(0);

            // Check that we have overlays from each category
            expect(config.overlays.some((o) => o.category === 'language')).toBe(true);
            expect(config.overlays.some((o) => o.category === 'database')).toBe(true);
            expect(config.overlays.some((o) => o.category === 'observability')).toBe(true);
            expect(config.overlays.some((o) => o.category === 'cloud')).toBe(true);
            expect(config.overlays.some((o) => o.category === 'dev')).toBe(true);
            expect(config.overlays.some((o) => o.category === 'preset')).toBe(true);
        });

        it('should load preset metadata', () => {
            const config = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);

            const presetOverlays = config.overlays.filter((o) => o.category === 'preset');
            expect(presetOverlays.length).toBeGreaterThan(0);

            // Check that presets have expected structure
            const preset = presetOverlays.find((p) => p.id === 'web-api');
            expect(preset).toBeDefined();
            expect(preset?.name).toBeTruthy();
            expect(preset?.description).toBeTruthy();
            expect(preset?.category).toBe('preset');
        });

        it('should correctly categorize overlays', () => {
            const config = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);

            // Language overlays
            expect(
                config.overlays.some((o) => o.id === 'nodejs' && o.category === 'language')
            ).toBe(true);
            expect(
                config.overlays.some((o) => o.id === 'python' && o.category === 'language')
            ).toBe(true);

            // Database overlays
            expect(
                config.overlays.some((o) => o.id === 'postgres' && o.category === 'database')
            ).toBe(true);
            expect(config.overlays.some((o) => o.id === 'redis' && o.category === 'database')).toBe(
                true
            );

            // Observability overlays
            expect(
                config.overlays.some((o) => o.id === 'prometheus' && o.category === 'observability')
            ).toBe(true);
            expect(
                config.overlays.some((o) => o.id === 'grafana' && o.category === 'observability')
            ).toBe(true);

            // Cloud tools
            expect(config.overlays.some((o) => o.id === 'aws-cli' && o.category === 'cloud')).toBe(
                true
            );
            expect(
                config.overlays.some((o) => o.id === 'kubectl-helm' && o.category === 'cloud')
            ).toBe(true);

            // Dev tools
            expect(
                config.overlays.some((o) => o.id === 'docker-sock' && o.category === 'dev')
            ).toBe(true);
            expect(config.overlays.some((o) => o.id === 'playwright' && o.category === 'dev')).toBe(
                true
            );
        });

        it('should sort overlays by order then name', () => {
            const config = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);

            // Check observability overlays are sorted (they have order fields)
            const obsOverlays = config.overlays.filter((o) => o.category === 'observability');
            for (let i = 0; i < obsOverlays.length - 1; i++) {
                const current = obsOverlays[i];
                const next = obsOverlays[i + 1];

                if (current.order !== undefined && next.order !== undefined) {
                    expect(current.order).toBeLessThanOrEqual(next.order);
                }
            }
        });

        it('should validate required fields in all overlays', () => {
            const config = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);

            for (const overlay of config.overlays) {
                expect(overlay.id).toBeTruthy();
                expect(overlay.name).toBeTruthy();
                expect(overlay.description).toBeTruthy();
                expect(overlay.category).toBeTruthy();
                expect([
                    'language',
                    'database',
                    'observability',
                    'cloud',
                    'dev',
                    'preset',
                ]).toContain(overlay.category);
            }
        });
    });

    describe('Backward compatibility', () => {
        it('should work with both manifest and index.yml approaches', () => {
            // This test validates that the loader works correctly
            // It will use manifests if .registry exists, otherwise fall back to index.yml
            const config = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);

            expect(config).toBeDefined();
            expect(config.overlays.length).toBeGreaterThan(0);
        });
    });
});
