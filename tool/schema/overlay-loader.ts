/**
 * Overlay registry loader
 *
 * This module provides functions to load overlay metadata from:
 * 1. Individual overlay.yml manifests (new approach)
 * 2. Fallback to central overlays/index.yml (backward compatibility)
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type { OverlayMetadata, OverlaysConfig, PackageManager } from './types.js';

/**
 * Load overlay manifest from individual overlay directory
 */
export function loadOverlayManifest(overlayDir: string): OverlayMetadata | null {
    const manifestPath = path.join(overlayDir, 'overlay.yml');

    if (!fs.existsSync(manifestPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = yaml.load(content) as OverlayMetadata;

        // Validate required fields
        if (!manifest.id || !manifest.name || !manifest.description || !manifest.category) {
            console.warn(`Warning: Invalid manifest in ${overlayDir}`);
            return null;
        }

        // Validate and coerce array fields to ensure they are actual arrays
        const ensureArray = (value: any): string[] => {
            if (Array.isArray(value)) {
                // Validate all elements are strings
                if (!value.every((item) => typeof item === 'string')) {
                    console.warn(`Warning: Non-string values in array field in ${overlayDir}`);
                    return value.filter((item) => typeof item === 'string');
                }
                return value;
            }
            if (typeof value === 'string') {
                // Single string value - wrap in array
                console.warn(
                    `Warning: Scalar value instead of array in ${overlayDir}, wrapping in array`
                );
                return [value];
            }
            return [];
        };

        const ensurePortsArray = (value: any): (number | import('./types.js').PortMetadata)[] => {
            if (Array.isArray(value)) {
                const normalized: (number | import('./types.js').PortMetadata)[] = [];
                let hadInvalidValues = false;

                for (const item of value) {
                    // Handle numeric port (legacy format)
                    if (typeof item === 'number' && Number.isFinite(item)) {
                        normalized.push(item);
                        continue;
                    }

                    // Accept numeric strings (common in YAML authored by hand)
                    if (typeof item === 'string' && /^\d+$/.test(item.trim())) {
                        normalized.push(Number(item.trim()));
                        continue;
                    }

                    // Handle rich port metadata object
                    if (typeof item === 'object' && item !== null && 'port' in item) {
                        const port = item.port;
                        if (typeof port === 'number' && Number.isFinite(port)) {
                            normalized.push(item as import('./types.js').PortMetadata);
                            continue;
                        }
                    }

                    hadInvalidValues = true;
                }

                if (hadInvalidValues) {
                    console.warn(`Warning: Invalid values in ports array in ${overlayDir}`);
                }

                return normalized;
            }
            return [];
        };

        const ensureBoolean = (value: any): boolean => {
            if (typeof value === 'boolean') {
                return value;
            }
            if (typeof value === 'string') {
                return value.toLowerCase() === 'true';
            }
            return false;
        };

        // Set defaults for optional fields with type validation
        return {
            ...manifest,
            supports: ensureArray(manifest.supports),
            requires: ensureArray(manifest.requires),
            suggests: ensureArray(manifest.suggests),
            conflicts: ensureArray(manifest.conflicts),
            tags: ensureArray(manifest.tags),
            ports: ensurePortsArray(manifest.ports),
            imports: ensureArray(manifest.imports),
            minimal: manifest.minimal !== undefined ? ensureBoolean(manifest.minimal) : false,
        };
    } catch (error) {
        console.warn(`Warning: Failed to parse manifest in ${overlayDir}:`, error);
        return null;
    }
}

/**
 * Scan overlay directories and load all manifests
 */
export function loadOverlayManifests(overlaysDir: string): Map<string, OverlayMetadata> {
    const manifests = new Map<string, OverlayMetadata>();

    if (!fs.existsSync(overlaysDir)) {
        return manifests;
    }

    const entries = fs.readdirSync(overlaysDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        // Skip special directories
        if (entry.name.startsWith('.')) {
            continue;
        }

        const overlayDir = path.join(overlaysDir, entry.name);
        const manifest = loadOverlayManifest(overlayDir);

        if (manifest) {
            // Validate ID matches directory name
            if (manifest.id !== entry.name) {
                console.warn(
                    `Warning: Manifest ID '${manifest.id}' doesn't match directory name '${entry.name}'`
                );
                continue;
            }

            manifests.set(manifest.id, manifest);
        }
    }

    return manifests;
}

/**
 * Load preset metadata from .presets directory
 */
export function loadPresetMetadata(overlaysDir: string): OverlayMetadata[] {
    const presetsDir = path.join(overlaysDir, '.presets');
    const presets: OverlayMetadata[] = [];

    if (!fs.existsSync(presetsDir)) {
        return presets;
    }

    try {
        const files = fs.readdirSync(presetsDir);

        for (const file of files) {
            if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
                continue;
            }

            const presetPath = path.join(presetsDir, file);
            const content = fs.readFileSync(presetPath, 'utf8');
            const preset = yaml.load(content) as any;

            // Extract metadata from preset definition
            if (preset.id && preset.name && preset.description) {
                presets.push({
                    id: preset.id,
                    name: preset.name,
                    description: preset.description,
                    category: 'preset',
                    supports: preset.supports || [],
                    requires: [],
                    suggests: [],
                    conflicts: [],
                    tags: preset.tags || [],
                    ports: [],
                });
            }
        }
    } catch (error) {
        console.warn('Warning: Failed to load preset metadata:', error);
    }

    return presets;
}

/**
 * Load base images from registry file
 */
export function loadBaseImages(overlaysDir: string): Array<{
    id: string;
    name: string;
    description: string;
    image: string | null;
    package_manager?: PackageManager;
}> {
    const registryPath = path.join(overlaysDir, '.registry', 'base-images.yml');

    if (!fs.existsSync(registryPath)) {
        return [];
    }

    try {
        const content = fs.readFileSync(registryPath, 'utf8');
        const data = yaml.load(content) as { base_images: any[] };
        return data.base_images || [];
    } catch (error) {
        console.warn('Warning: Failed to load base images:', error);
        return [];
    }
}

/**
 * Load base templates from registry file
 */
export function loadBaseTemplates(overlaysDir: string): Array<{
    id: string;
    name: string;
    description: string;
}> {
    const registryPath = path.join(overlaysDir, '.registry', 'base-templates.yml');

    if (!fs.existsSync(registryPath)) {
        return [];
    }

    try {
        const content = fs.readFileSync(registryPath, 'utf8');
        const data = yaml.load(content) as { base_templates: any[] };
        return data.base_templates || [];
    } catch (error) {
        console.warn('Warning: Failed to load base templates:', error);
        return [];
    }
}

/**
 * Build OverlaysConfig from individual manifests
 */
export function buildOverlaysConfigFromManifests(overlaysDir: string): OverlaysConfig {
    const manifests = loadOverlayManifests(overlaysDir);
    const presetOverlays = loadPresetMetadata(overlaysDir);

    // Sort function used below
    const sortByOrderThenName = (a: OverlayMetadata, b: OverlayMetadata) => {
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.name.localeCompare(b.name);
    };

    // New approach: Single overlays array (category-agnostic)
    const allOverlays = [...manifests.values()];
    if (presetOverlays) {
        allOverlays.push(...presetOverlays);
    }
    allOverlays.sort(sortByOrderThenName);

    return {
        base_images: loadBaseImages(overlaysDir),
        base_templates: loadBaseTemplates(overlaysDir),
        overlays: allOverlays,
    };
}
/**
 * Load overlays config with fallback to index.yml
 */
export function loadOverlaysConfig(overlaysDir: string, indexYmlPath: string): OverlaysConfig {
    // First, try to load from individual manifests
    const registryPath = path.join(overlaysDir, '.registry', 'base-images.yml');

    if (fs.existsSync(registryPath)) {
        // New approach: load from individual manifests
        return buildOverlaysConfigFromManifests(overlaysDir);
    }

    // Fallback to old centralized index.yml
    if (fs.existsSync(indexYmlPath)) {
        const content = fs.readFileSync(indexYmlPath, 'utf8');
        const legacyConfig = yaml.load(content) as any;

        // Check if this is the new format (has 'overlays' field) or old format (per-category arrays)
        if (legacyConfig.overlays && Array.isArray(legacyConfig.overlays)) {
            // New format - already has overlays array
            return legacyConfig as OverlaysConfig;
        }

        // Old format - convert per-category arrays to single overlays array
        const allOverlays: OverlayMetadata[] = [];
        const categoryKeys = [
            'language_overlays',
            'database_overlays',
            'observability_overlays',
            'cloud_tool_overlays',
            'dev_tool_overlays',
            'preset_overlays',
        ];

        for (const key of categoryKeys) {
            if (legacyConfig[key] && Array.isArray(legacyConfig[key])) {
                allOverlays.push(...legacyConfig[key]);
            }
        }

        return {
            base_images: legacyConfig.base_images || [],
            base_templates: legacyConfig.base_templates || [],
            overlays: allOverlays,
        };
    }

    throw new Error(
        'No overlay configuration found. Expected either .registry/ directory or index.yml'
    );
}
