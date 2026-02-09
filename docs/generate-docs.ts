#!/usr/bin/env node

/**
 * Auto-generate overlay documentation from overlays.yml
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { OverlayMetadata } from '../tool/schema/types.js';
import { loadOverlaysConfig } from '../tool/schema/overlay-loader.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve REPO_ROOT that works in both source and compiled output
const REPO_ROOT_CANDIDATES = [
    path.join(__dirname, '..'), // From source: docs -> root
    path.join(__dirname, '..', '..'), // From dist/docs -> root
];

const REPO_ROOT =
    REPO_ROOT_CANDIDATES.find(
        (candidate) =>
            fs.existsSync(path.join(candidate, 'templates')) &&
            fs.existsSync(path.join(candidate, 'overlays'))
    ) ?? REPO_ROOT_CANDIDATES[0];

const OUTPUT_PATH = path.join(REPO_ROOT, 'docs', 'overlays.md');

function formatOverlay(overlay: OverlayMetadata): string {
    const sections: string[] = [];

    // Header
    sections.push(`### ${overlay.name} (\`${overlay.id}\`)`);
    sections.push('');
    sections.push(overlay.description);
    sections.push('');

    // Metadata table
    sections.push('| Property | Value |');
    sections.push('|----------|-------|');
    sections.push(`| **Category** | ${overlay.category} |`);

    if (overlay.supports && overlay.supports.length > 0) {
        sections.push(`| **Supports** | ${overlay.supports.join(', ')} |`);
    }

    if (overlay.requires && overlay.requires.length > 0) {
        sections.push(`| **Requires** | ${overlay.requires.map((r) => `\`${r}\``).join(', ')} |`);
    }

    if (overlay.suggests && overlay.suggests.length > 0) {
        sections.push(`| **Suggests** | ${overlay.suggests.map((s) => `\`${s}\``).join(', ')} |`);
    }

    if (overlay.conflicts && overlay.conflicts.length > 0) {
        sections.push(`| **Conflicts** | ${overlay.conflicts.map((c) => `\`${c}\``).join(', ')} |`);
    }

    if (overlay.tags && overlay.tags.length > 0) {
        sections.push(`| **Tags** | ${overlay.tags.map((t) => `\`${t}\``).join(', ')} |`);
    }

    if (overlay.ports && overlay.ports.length > 0) {
        sections.push(`| **Ports** | ${overlay.ports.join(', ')} |`);
    }

    sections.push('');

    return sections.join('\n');
}

function generateDocumentation(config: OverlaysConfig): string {
    const sections: string[] = [];

    // Header
    sections.push('# Overlay Reference');
    sections.push('');
    sections.push('> **Auto-generated from `overlays.yml`** - Do not edit manually!');
    sections.push('');
    sections.push(
        'This document provides a comprehensive reference for all available overlays in container-superposition.'
    );
    sections.push('');
    sections.push('## Table of Contents');
    sections.push('');
    sections.push('- [Language Overlays](#language-overlays)');
    sections.push('- [Database Overlays](#database-overlays)');
    sections.push('- [Observability Overlays](#observability-overlays)');
    sections.push('- [Cloud Tool Overlays](#cloud-tool-overlays)');
    sections.push('- [Dev Tool Overlays](#dev-tool-overlays)');
    sections.push('');

    // Language overlays
    sections.push('## Language Overlays');
    sections.push('');
    config.overlays
        .filter((o) => o.category === 'language')
        .forEach((overlay) => {
            sections.push(formatOverlay(overlay));
        });

    // Database overlays
    sections.push('## Database Overlays');
    sections.push('');
    config.overlays
        .filter((o) => o.category === 'database')
        .forEach((overlay) => {
            sections.push(formatOverlay(overlay));
        });

    // Observability overlays
    sections.push('## Observability Overlays');
    sections.push('');
    config.overlays
        .filter((o) => o.category === 'observability')
        .forEach((overlay) => {
            sections.push(formatOverlay(overlay));
        });

    // Cloud tool overlays
    sections.push('## Cloud Tool Overlays');
    sections.push('');
    config.overlays
        .filter((o) => o.category === 'cloud')
        .forEach((overlay) => {
            sections.push(formatOverlay(overlay));
        });

    // Dev tool overlays
    sections.push('## Dev Tool Overlays');
    sections.push('');
    config.overlays
        .filter((o) => o.category === 'dev')
        .forEach((overlay) => {
            sections.push(formatOverlay(overlay));
        });

    // Dependency Model
    sections.push('## Dependency Model');
    sections.push('');
    sections.push('### Dependency Types');
    sections.push('');
    sections.push(
        '- **Requires**: Hard dependencies that must be present. The composer will automatically add these.'
    );
    sections.push(
        '- **Suggests**: Soft dependencies that work well together. Users may be prompted to add these.'
    );
    sections.push('- **Conflicts**: Mutually exclusive overlays. Cannot be used together.');
    sections.push('');
    sections.push('### Auto-Resolution');
    sections.push('');
    sections.push(
        'When you select an overlay with required dependencies, the composer automatically includes them.'
    );
    sections.push('For example, selecting `grafana` will automatically include `prometheus`.');
    sections.push('');
    sections.push('### Port Declarations');
    sections.push('');
    sections.push(
        'Each overlay declares its ports explicitly. When using port offset, all declared ports are shifted by the same offset.'
    );
    sections.push('');

    // Footer
    sections.push('---');
    sections.push('');
    sections.push(`*Documentation generated on ${new Date().toISOString()}*`);
    sections.push('');

    return sections.join('\n');
}

// Main execution
const overlaysDir = path.join(REPO_ROOT, 'overlays');
const indexYmlPath = path.join(overlaysDir, 'index.yml');
const config = loadOverlaysConfig(overlaysDir, indexYmlPath);
const documentation = generateDocumentation(config);

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Write documentation
fs.writeFileSync(OUTPUT_PATH, documentation);

console.log(`✅ Generated overlay documentation at ${OUTPUT_PATH}`);
