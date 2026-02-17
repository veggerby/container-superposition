import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { OverlaysConfig, OverlayMetadata } from '../schema/types.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

/**
 * Load overlay metadata using overlay loader
 */
function loadOverlaysConfigWrapper(): OverlaysConfig {
    return loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
}

/**
 * Get all overlay definitions as a flat array
 */
function getAllOverlayDefs(config: OverlaysConfig): OverlayMetadata[] {
    return config.overlays;
}

/**
 * Resolve dependencies for a set of overlays
 */
function resolveDependencies(
    requestedOverlays: string[],
    allOverlayDefs: OverlayMetadata[]
): { overlays: string[]; autoResolved: { added: string[]; reason: string } } {
    const overlayMap = new Map<string, OverlayMetadata>();
    allOverlayDefs.forEach((def) => overlayMap.set(def.id, def));

    const resolved = new Set<string>(requestedOverlays);
    const autoAdded: string[] = [];
    const resolutionReasons: string[] = [];

    // Resolve dependencies recursively
    const toProcess = [...requestedOverlays];
    const processed = new Set<string>();

    while (toProcess.length > 0) {
        const current = toProcess.shift()!;
        if (processed.has(current)) continue;
        processed.add(current);

        const overlayDef = overlayMap.get(current);
        if (!overlayDef || !overlayDef.requires || overlayDef.requires.length === 0) {
            continue;
        }

        // Add required dependencies
        for (const required of overlayDef.requires) {
            if (!resolved.has(required)) {
                resolved.add(required);
                autoAdded.push(required);
                resolutionReasons.push(`${required} (required by ${current})`);
                toProcess.push(required);
            }
        }
    }

    const reason = autoAdded.length > 0 ? resolutionReasons.join(', ') : '';

    return {
        overlays: Array.from(resolved),
        autoResolved: {
            added: autoAdded,
            reason,
        },
    };
}

describe('Overlay Dependency Resolution', () => {
    let overlaysConfig: OverlaysConfig;
    let allOverlayDefs: OverlayMetadata[];

    beforeAll(() => {
        overlaysConfig = loadOverlaysConfigWrapper();
        allOverlayDefs = getAllOverlayDefs(overlaysConfig);
    });

    it('should load overlays.yml successfully', () => {
        expect(overlaysConfig).toBeDefined();
        expect(overlaysConfig.overlays).toBeDefined();
        expect(overlaysConfig.overlays.length).toBeGreaterThan(0);
        expect(overlaysConfig.overlays.some((o) => o.category === 'language')).toBe(true);
        expect(overlaysConfig.overlays.some((o) => o.category === 'database')).toBe(true);
        expect(overlaysConfig.overlays.some((o) => o.category === 'observability')).toBe(true);
    });

    it('should have required metadata fields for all overlays', () => {
        allOverlayDefs.forEach((overlay) => {
            expect(overlay.id).toBeDefined();
            expect(overlay.name).toBeDefined();
            expect(overlay.description).toBeDefined();
            expect(overlay.category).toBeDefined();
            expect(overlay.requires).toBeDefined();
            expect(overlay.suggests).toBeDefined();
            expect(overlay.conflicts).toBeDefined();
            expect(overlay.tags).toBeDefined();
            expect(overlay.ports).toBeDefined();
        });
    });

    it('should auto-resolve grafana -> prometheus dependency', () => {
        const result = resolveDependencies(['grafana'], allOverlayDefs);

        expect(result.overlays).toContain('grafana');
        expect(result.overlays).toContain('prometheus');
        expect(result.autoResolved.added).toContain('prometheus');
        expect(result.autoResolved.reason).toContain('required by grafana');
    });

    it('should not duplicate overlays when dependency is already requested', () => {
        const result = resolveDependencies(['grafana', 'prometheus'], allOverlayDefs);

        expect(result.overlays).toContain('grafana');
        expect(result.overlays).toContain('prometheus');
        expect(result.autoResolved.added).toHaveLength(0);
    });

    it('should handle overlays with no dependencies', () => {
        const result = resolveDependencies(['postgres'], allOverlayDefs);

        expect(result.overlays).toContain('postgres');
        expect(result.overlays).toHaveLength(1);
        expect(result.autoResolved.added).toHaveLength(0);
    });

    it('should handle multiple overlays with no shared dependencies', () => {
        const result = resolveDependencies(['postgres', 'redis'], allOverlayDefs);

        expect(result.overlays).toContain('postgres');
        expect(result.overlays).toContain('redis');
        expect(result.overlays).toHaveLength(2);
        expect(result.autoResolved.added).toHaveLength(0);
    });

    it('should verify docker-in-docker conflicts with docker-sock', () => {
        const dockerInDocker = allOverlayDefs.find((o) => o.id === 'docker-in-docker');
        const dockerSock = allOverlayDefs.find((o) => o.id === 'docker-sock');

        expect(dockerInDocker?.conflicts).toContain('docker-sock');
        expect(dockerSock?.conflicts).toContain('docker-in-docker');
    });

    it('should verify grafana suggests loki and jaeger', () => {
        const grafana = allOverlayDefs.find((o) => o.id === 'grafana');

        expect(grafana?.suggests).toContain('loki');
        expect(grafana?.suggests).toContain('jaeger');
    });

    it('should verify otel-collector suggests jaeger and prometheus', () => {
        const otelCollector = allOverlayDefs.find((o) => o.id === 'otel-collector');

        expect(otelCollector?.suggests).toContain('jaeger');
        expect(otelCollector?.suggests).toContain('prometheus');
    });

    it('should verify port declarations are present', () => {
        const grafana = allOverlayDefs.find((o) => o.id === 'grafana');
        const postgres = allOverlayDefs.find((o) => o.id === 'postgres');
        const prometheus = allOverlayDefs.find((o) => o.id === 'prometheus');

        // Ports can now be numbers or objects with a port property
        const hasPort = (overlay: any, portNum: number) => {
            if (!overlay?.ports) return false;
            return overlay.ports.some((p: any) => (typeof p === 'number' ? p === portNum : p.port === portNum));
        };

        expect(hasPort(grafana, 3000)).toBe(true);
        expect(hasPort(postgres, 5432)).toBe(true);
        expect(hasPort(prometheus, 9090)).toBe(true);
    });

    it('should verify tags are present and meaningful', () => {
        const grafana = allOverlayDefs.find((o) => o.id === 'grafana');
        const postgres = allOverlayDefs.find((o) => o.id === 'postgres');

        expect(grafana?.tags).toContain('observability');
        expect(postgres?.tags).toContain('database');
    });
});
