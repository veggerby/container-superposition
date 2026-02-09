#!/usr/bin/env tsx

/**
 * Migration script: Split overlays/index.yml into per-overlay manifest files
 *
 * This script:
 * 1. Reads the central overlays/index.yml file
 * 2. Creates overlay.yml for each overlay in its directory
 * 3. Creates special metadata files (base-images.yml, base-templates.yml)
 * 4. Validates the migration
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OverlayMetadata {
    id: string;
    name: string;
    description: string;
    category: string;
    order?: number;
    image?: string | null;
    package_manager?: string;
    supports?: string[];
    requires?: string[];
    suggests?: string[];
    conflicts?: string[];
    tags?: string[];
    ports?: number[];
}

interface OverlaysConfig {
    base_images: OverlayMetadata[];
    base_templates: OverlayMetadata[];
    language_overlays: OverlayMetadata[];
    database_overlays: OverlayMetadata[];
    observability_overlays: OverlayMetadata[];
    cloud_tool_overlays: OverlayMetadata[];
    dev_tool_overlays: OverlayMetadata[];
    preset_overlays?: OverlayMetadata[];
}

const REPO_ROOT = path.join(__dirname, '..');
const INDEX_YML_PATH = path.join(REPO_ROOT, 'overlays', 'index.yml');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const REGISTRY_DIR = path.join(OVERLAYS_DIR, '.registry');

function loadIndexYml(): OverlaysConfig {
    console.log(chalk.cyan('📖 Reading overlays/index.yml...'));
    const content = fs.readFileSync(INDEX_YML_PATH, 'utf8');
    return yaml.load(content) as OverlaysConfig;
}

function createOverlayManifest(overlay: OverlayMetadata, overlayDir: string): void {
    const manifestPath = path.join(overlayDir, 'overlay.yml');

    // Remove fields not needed in overlay manifest
    const { image, package_manager, ...manifestData } = overlay;

    // Set default arrays for optional fields
    const manifest = {
        id: manifestData.id,
        name: manifestData.name,
        description: manifestData.description,
        category: manifestData.category,
        supports: manifestData.supports || [],
        requires: manifestData.requires || [],
        suggests: manifestData.suggests || [],
        conflicts: manifestData.conflicts || [],
        tags: manifestData.tags || [],
        ports: manifestData.ports || [],
        ...(manifestData.order !== undefined && { order: manifestData.order }),
    };

    const yamlContent = yaml.dump(manifest, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
    });

    fs.writeFileSync(manifestPath, yamlContent, 'utf8');
    console.log(chalk.green(`  ✓ Created ${manifestPath}`));
}

function createRegistryFiles(config: OverlaysConfig): void {
    console.log(chalk.cyan('\n📁 Creating .registry directory...'));

    if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
    }

    // Create base-images.yml
    const baseImagesContent = yaml.dump(
        { base_images: config.base_images },
        {
            indent: 2,
            lineWidth: 120,
            noRefs: true,
        }
    );
    fs.writeFileSync(path.join(REGISTRY_DIR, 'base-images.yml'), baseImagesContent, 'utf8');
    console.log(chalk.green(`  ✓ Created .registry/base-images.yml`));

    // Create base-templates.yml
    const baseTemplatesContent = yaml.dump(
        { base_templates: config.base_templates },
        {
            indent: 2,
            lineWidth: 120,
            noRefs: true,
        }
    );
    fs.writeFileSync(path.join(REGISTRY_DIR, 'base-templates.yml'), baseTemplatesContent, 'utf8');
    console.log(chalk.green(`  ✓ Created .registry/base-templates.yml`));

    // Create README in .registry
    const readmeContent = `# Registry Files

This directory contains special metadata files that don't fit into individual overlay manifests.

## Files

- **base-images.yml** - Available base container images (Debian, Alpine, Ubuntu, etc.)
- **base-templates.yml** - Base devcontainer templates (plain, compose)

These files are loaded during initialization to provide choices for base images and templates.

## Note

Preset metadata is still in \`overlays/index.yml\` for now, but full preset definitions remain in \`overlays/presets/*.yml\`.
`;
    fs.writeFileSync(path.join(REGISTRY_DIR, 'README.md'), readmeContent, 'utf8');
    console.log(chalk.green(`  ✓ Created .registry/README.md`));
}

function migrateOverlays(config: OverlaysConfig): void {
    console.log(chalk.cyan('\n🔄 Migrating overlays to individual manifests...\n'));

    const allOverlayCategories = [
        { name: 'language_overlays', overlays: config.language_overlays },
        { name: 'database_overlays', overlays: config.database_overlays },
        { name: 'observability_overlays', overlays: config.observability_overlays },
        { name: 'cloud_tool_overlays', overlays: config.cloud_tool_overlays },
        { name: 'dev_tool_overlays', overlays: config.dev_tool_overlays },
    ];

    let totalMigrated = 0;
    let totalSkipped = 0;

    for (const category of allOverlayCategories) {
        console.log(chalk.yellow(`\n${category.name}:`));

        for (const overlay of category.overlays) {
            const overlayDir = path.join(OVERLAYS_DIR, overlay.id);

            if (!fs.existsSync(overlayDir)) {
                console.log(chalk.red(`  ✗ Directory not found: ${overlay.id}`));
                totalSkipped++;
                continue;
            }

            if (fs.existsSync(path.join(overlayDir, 'overlay.yml'))) {
                console.log(chalk.dim(`  - ${overlay.id} (already exists, skipping)`));
                totalSkipped++;
                continue;
            }

            createOverlayManifest(overlay, overlayDir);
            totalMigrated++;
        }
    }

    console.log(chalk.cyan(`\n📊 Migration Summary:`));
    console.log(chalk.green(`  ✓ ${totalMigrated} overlays migrated`));
    console.log(chalk.dim(`  - ${totalSkipped} overlays skipped`));
}

function validateMigration(config: OverlaysConfig): void {
    console.log(chalk.cyan('\n✅ Validating migration...\n'));

    const allOverlayCategories = [
        { name: 'language_overlays', overlays: config.language_overlays },
        { name: 'database_overlays', overlays: config.database_overlays },
        { name: 'observability_overlays', overlays: config.observability_overlays },
        { name: 'cloud_tool_overlays', overlays: config.cloud_tool_overlays },
        { name: 'dev_tool_overlays', overlays: config.dev_tool_overlays },
    ];

    let errors = 0;
    let warnings = 0;

    for (const category of allOverlayCategories) {
        for (const overlay of category.overlays) {
            const overlayDir = path.join(OVERLAYS_DIR, overlay.id);
            const manifestPath = path.join(overlayDir, 'overlay.yml');

            if (!fs.existsSync(manifestPath)) {
                console.log(chalk.red(`  ✗ Missing manifest: ${overlay.id}/overlay.yml`));
                errors++;
                continue;
            }

            try {
                const content = fs.readFileSync(manifestPath, 'utf8');
                const manifest = yaml.load(content) as OverlayMetadata;

                // Validate ID matches directory name
                if (manifest.id !== overlay.id) {
                    console.log(
                        chalk.red(`  ✗ ID mismatch in ${overlay.id}: manifest has '${manifest.id}'`)
                    );
                    errors++;
                }

                // Validate required fields
                if (!manifest.name || !manifest.description || !manifest.category) {
                    console.log(chalk.red(`  ✗ Missing required fields in ${overlay.id}`));
                    errors++;
                }

                // Check for bidirectional conflicts
                if (manifest.conflicts && manifest.conflicts.length > 0) {
                    for (const conflictId of manifest.conflicts) {
                        const conflictDir = path.join(OVERLAYS_DIR, conflictId);
                        const conflictManifestPath = path.join(conflictDir, 'overlay.yml');

                        if (fs.existsSync(conflictManifestPath)) {
                            const conflictContent = fs.readFileSync(conflictManifestPath, 'utf8');
                            const conflictManifest = yaml.load(conflictContent) as OverlayMetadata;

                            if (
                                !conflictManifest.conflicts ||
                                !conflictManifest.conflicts.includes(overlay.id)
                            ) {
                                console.log(
                                    chalk.yellow(
                                        `  ⚠️  Non-bidirectional conflict: ${overlay.id} conflicts with ${conflictId}, but not vice versa`
                                    )
                                );
                                warnings++;
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(chalk.red(`  ✗ Failed to parse ${overlay.id}/overlay.yml: ${error}`));
                errors++;
            }
        }
    }

    // Validate registry files
    if (!fs.existsSync(path.join(REGISTRY_DIR, 'base-images.yml'))) {
        console.log(chalk.red(`  ✗ Missing .registry/base-images.yml`));
        errors++;
    }

    if (!fs.existsSync(path.join(REGISTRY_DIR, 'base-templates.yml'))) {
        console.log(chalk.red(`  ✗ Missing .registry/base-templates.yml`));
        errors++;
    }

    console.log(chalk.cyan(`\n📊 Validation Summary:`));
    if (errors === 0 && warnings === 0) {
        console.log(chalk.green(`  ✓ All validations passed!`));
    } else {
        if (errors > 0) {
            console.log(chalk.red(`  ✗ ${errors} errors found`));
        }
        if (warnings > 0) {
            console.log(chalk.yellow(`  ⚠️  ${warnings} warnings found`));
        }
    }
}

function main(): void {
    console.log(chalk.bold.cyan('\n🔧 Container Superposition - Overlay Migration Tool\n'));
    console.log(chalk.dim('This will split overlays/index.yml into per-overlay manifest files\n'));

    try {
        // Load the current index.yml
        const config = loadIndexYml();

        // Create registry directory and files
        createRegistryFiles(config);

        // Migrate each overlay
        migrateOverlays(config);

        // Validate the migration
        validateMigration(config);

        console.log(chalk.bold.green('\n✅ Migration completed successfully!\n'));
        console.log(chalk.dim('Next steps:'));
        console.log(chalk.dim('  1. Review generated overlay.yml files'));
        console.log(chalk.dim('  2. Update loader code to read from individual manifests'));
        console.log(chalk.dim('  3. Test with: npm run build && npm run init'));
        console.log(chalk.dim('  4. Archive overlays/index.yml once loader is updated\n'));
    } catch (error) {
        console.error(chalk.red(`\n❌ Migration failed: ${error}\n`));
        process.exit(1);
    }
}

main();
