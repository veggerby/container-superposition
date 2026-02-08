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
    
    // Set defaults for optional fields
    return {
      ...manifest,
      supports: manifest.supports || [],
      requires: manifest.requires || [],
      suggests: manifest.suggests || [],
      conflicts: manifest.conflicts || [],
      tags: manifest.tags || [],
      ports: manifest.ports || [],
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
    if (entry.name.startsWith('.') || entry.name === 'presets') {
      continue;
    }
    
    const overlayDir = path.join(overlaysDir, entry.name);
    const manifest = loadOverlayManifest(overlayDir);
    
    if (manifest) {
      // Validate ID matches directory name
      if (manifest.id !== entry.name) {
        console.warn(`Warning: Manifest ID '${manifest.id}' doesn't match directory name '${entry.name}'`);
        continue;
      }
      
      manifests.set(manifest.id, manifest);
    }
  }
  
  return manifests;
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
  
  // Group overlays by category
  const config: OverlaysConfig = {
    base_images: loadBaseImages(overlaysDir),
    base_templates: loadBaseTemplates(overlaysDir),
    language_overlays: [],
    database_overlays: [],
    observability_overlays: [],
    cloud_tool_overlays: [],
    dev_tool_overlays: [],
    preset_overlays: [],
  };
  
  for (const manifest of manifests.values()) {
    switch (manifest.category) {
      case 'language':
        config.language_overlays.push(manifest);
        break;
      case 'database':
        config.database_overlays.push(manifest);
        break;
      case 'observability':
        config.observability_overlays.push(manifest);
        break;
      case 'cloud':
        config.cloud_tool_overlays.push(manifest);
        break;
      case 'dev':
        config.dev_tool_overlays.push(manifest);
        break;
      case 'preset':
        config.preset_overlays?.push(manifest);
        break;
      default:
        console.warn(`Warning: Unknown category '${manifest.category}' for overlay '${manifest.id}'`);
    }
  }
  
  // Sort each category by order field (if present), then by name
  const sortByOrderThenName = (a: OverlayMetadata, b: OverlayMetadata) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return a.name.localeCompare(b.name);
  };
  
  config.language_overlays.sort(sortByOrderThenName);
  config.database_overlays.sort(sortByOrderThenName);
  config.observability_overlays.sort(sortByOrderThenName);
  config.cloud_tool_overlays.sort(sortByOrderThenName);
  config.dev_tool_overlays.sort(sortByOrderThenName);
  if (config.preset_overlays) {
    config.preset_overlays.sort(sortByOrderThenName);
  }
  
  return config;
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
    return yaml.load(content) as OverlaysConfig;
  }
  
  throw new Error('No overlay configuration found. Expected either .registry/ directory or index.yml');
}
