#!/usr/bin/env node

/**
 * Auto-generate JSON Schema for superposition.yml.
 *
 * Enum values for stack, baseImage, target and editor are imported directly from the
 * exported constants in tool/schema/project-config.ts so they stay in sync with the
 * runtime validation logic.  Overlay IDs are read from the live overlay registry.
 *
 * Output: tool/schema/superposition.schema.json
 *
 * Run via: npm run schema:generate
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { OverlayMetadata } from '../tool/schema/types.js';
import { loadOverlaysConfig } from '../tool/schema/overlay-loader.js';
import {
    STACK_VALUES,
    BASE_IMAGE_VALUES,
    TARGET_VALUES,
    EDITOR_VALUES,
    PROJECT_ENV_TARGET_VALUES,
    PROJECT_MOUNT_TARGET_VALUES,
} from '../tool/schema/project-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root from both source (scripts/) and compiled (dist/scripts/) locations
const REPO_ROOT_CANDIDATES = [
    path.join(__dirname, '..'), // scripts/ -> root
    path.join(__dirname, '..', '..'), // dist/scripts/ -> root
];

const REPO_ROOT =
    REPO_ROOT_CANDIDATES.find(
        (c) => fs.existsSync(path.join(c, 'overlays')) && fs.existsSync(path.join(c, 'templates'))
    ) ?? REPO_ROOT_CANDIDATES[0];

const OUTPUT_PATH = path.join(REPO_ROOT, 'tool', 'schema', 'superposition.schema.json');

function buildSchema(overlays: OverlayMetadata[], presetIds: string[]): object {
    // Non-preset overlay IDs (only these are valid in the `overlays` array field)
    const overlayIds = overlays
        .filter((o) => o.category !== 'preset')
        .map((o) => o.id)
        .sort();

    // Per-category enums matching buildCategoryLookup() rules in project-config.ts:
    //   - database includes both 'database' and 'messaging' categories
    const languageIds = overlays
        .filter((o) => o.category === 'language')
        .map((o) => o.id)
        .sort();
    const databaseIds = overlays
        .filter((o) => o.category === 'database' || o.category === 'messaging')
        .map((o) => o.id)
        .sort();
    const observabilityIds = overlays
        .filter((o) => o.category === 'observability')
        .map((o) => o.id)
        .sort();
    const cloudIds = overlays
        .filter((o) => o.category === 'cloud')
        .map((o) => o.id)
        .sort();
    const devIds = overlays
        .filter((o) => o.category === 'dev')
        .map((o) => o.id)
        .sort();

    const mountTargetValues = [...PROJECT_MOUNT_TARGET_VALUES];
    const envTargetValues = [...PROJECT_ENV_TARGET_VALUES];

    const mountEntry = {
        oneOf: [
            {
                type: 'string',
                description: 'Raw mount string (escape hatch)',
                minLength: 1,
            },
            {
                type: 'object',
                description: 'Structured mount using source/destination fields',
                required: ['source', 'destination'],
                additionalProperties: false,
                properties: {
                    source: { type: 'string', description: 'Mount source path or volume name' },
                    destination: {
                        type: 'string',
                        description: 'Mount destination path inside the container',
                    },
                    type: {
                        type: 'string',
                        enum: ['bind', 'volume', 'tmpfs'],
                        description: 'Mount type (default: bind)',
                    },
                    consistency: {
                        type: 'string',
                        enum: ['consistent', 'cached', 'delegated'],
                        description: 'Mount consistency mode',
                    },
                    cached: {
                        type: 'boolean',
                        description: 'Shorthand for consistency: cached',
                    },
                    readOnly: {
                        type: 'boolean',
                        description: 'Make the mount read-only',
                    },
                    target: {
                        type: 'string',
                        enum: mountTargetValues,
                        description:
                            'Routing target: auto (default) always routes to devcontainer.json mounts[]; composeVolume routes to docker-compose volumes (compose stack only)',
                        default: 'auto',
                    },
                },
            },
            {
                type: 'object',
                description: 'Raw-value mount with optional routing target',
                required: ['value'],
                additionalProperties: false,
                properties: {
                    value: {
                        type: 'string',
                        description: 'Raw mount string',
                        minLength: 1,
                    },
                    target: {
                        type: 'string',
                        enum: mountTargetValues,
                        description: 'Routing target override',
                        default: 'auto',
                    },
                },
            },
        ],
    };

    const envVarEntry = {
        oneOf: [
            {
                type: 'string',
                description:
                    'String shorthand — target is auto-detected based on stack (plain→remoteEnv, compose→docker-compose environment)',
            },
            {
                type: 'object',
                description: 'Long form with explicit routing target',
                required: ['value'],
                additionalProperties: false,
                properties: {
                    value: {
                        type: 'string',
                        description: 'Variable value (supports ${VAR} and ${VAR:-default} syntax)',
                    },
                    target: {
                        type: 'string',
                        enum: envTargetValues,
                        description:
                            'auto (default): plain→remoteEnv, compose→docker-compose environment; remoteEnv: always devcontainer.json; composeEnv: always docker-compose (compose only)',
                        default: 'auto',
                    },
                },
            },
        ],
    };

    return {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: 'https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.schema.json',
        title: 'Superposition Project Configuration',
        description:
            'Schema for superposition.yml / .superposition.yml — the project configuration file for container-superposition. See https://github.com/veggerby/container-superposition for documentation.',
        type: 'object',
        additionalProperties: false,
        properties: {
            $schema: {
                type: 'string',
                description: 'JSON Schema reference URI',
            },
            stack: {
                type: 'string',
                enum: [...STACK_VALUES],
                description:
                    'Base devcontainer template: plain (single image) or compose (multi-service Docker Compose)',
            },
            baseImage: {
                type: 'string',
                enum: [...BASE_IMAGE_VALUES],
                description:
                    'Base OS image. Use "custom" together with customImage to specify an arbitrary image.',
                default: 'bookworm',
            },
            customImage: {
                type: 'string',
                description:
                    'Fully-qualified Docker image reference. Only valid when baseImage is "custom".',
                examples: ['ghcr.io/myorg/my-base:latest'],
            },
            containerName: {
                type: 'string',
                description: 'Sets the "name" field in devcontainer.json (displayed by VS Code)',
                examples: ['My Web API'],
            },
            overlays: {
                type: 'array',
                description:
                    'Flat list of overlay IDs to include. Preferred over the legacy category arrays. Dependency resolution runs automatically.',
                items: {
                    type: 'string',
                    enum: overlayIds,
                    description: 'Overlay identifier',
                },
                uniqueItems: true,
            },
            preset: {
                type: 'string',
                enum: presetIds,
                description:
                    'ID of a preset (meta-overlay) to expand. Use cs list --presets to browse available presets.',
            },
            presetChoices: {
                type: 'object',
                description:
                    'Parameter values passed to the selected preset. Keys depend on the preset definition.',
                additionalProperties: { type: 'string' },
            },
            outputPath: {
                type: 'string',
                description:
                    'Where to write the generated devcontainer files. Default: .devcontainer',
                default: './.devcontainer',
                examples: ['./.devcontainer'],
            },
            portOffset: {
                type: 'integer',
                minimum: 0,
                description:
                    'Shift all overlay-declared host ports by this integer. Useful for running multiple instances on one machine.',
                examples: [100, 200],
            },
            target: {
                type: 'string',
                enum: [...TARGET_VALUES],
                description:
                    'Deployment target profile. Applies environment-specific patches during generation.',
            },
            minimal: {
                type: 'boolean',
                description:
                    'When true, overlays marked with minimal: true in their overlay.yml are excluded. Useful for CI environments.',
            },
            editor: {
                type: 'string',
                enum: [...EDITOR_VALUES],
                description:
                    'Editor profile: vscode (default, includes extensions/settings), jetbrains (removes VS Code config), none (removes VS Code config)',
                default: 'vscode',
            },
            env: {
                type: 'object',
                description:
                    'Runtime environment variables. Routed to devcontainer.json remoteEnv or docker-compose environment based on stack and target.',
                additionalProperties: envVarEntry,
            },
            mounts: {
                oneOf: [
                    {
                        type: 'array',
                        description: 'List of filesystem mounts',
                        items: mountEntry,
                    },
                    {
                        type: 'object',
                        description: 'Named map of filesystem mounts',
                        additionalProperties: {
                            type: 'object',
                            description:
                                'Structured mount (named form; name is not serialized back)',
                            required: ['source', 'destination'],
                            additionalProperties: false,
                            properties: {
                                source: { type: 'string' },
                                destination: { type: 'string' },
                                type: { type: 'string', enum: ['bind', 'volume', 'tmpfs'] },
                                consistency: {
                                    type: 'string',
                                    enum: ['consistent', 'cached', 'delegated'],
                                },
                                cached: { type: 'boolean' },
                                readOnly: { type: 'boolean' },
                                target: {
                                    type: 'string',
                                    enum: mountTargetValues,
                                },
                            },
                        },
                    },
                ],
            },
            shell: {
                type: 'object',
                description:
                    'Declarative shell profile customizations (aliases and snippets). Use env for environment variables.',
                additionalProperties: false,
                properties: {
                    aliases: {
                        type: 'object',
                        description: 'Shell aliases written to .devcontainer/scripts/shell-init.sh',
                        additionalProperties: { type: 'string' },
                        examples: [{ k: 'kubectl', kgp: 'kubectl get pods' }],
                    },
                    snippets: {
                        type: 'array',
                        description:
                            'Shell snippet lines appended to shell-init.sh. Guard shell-specific syntax with $BASH_VERSION / $ZSH_VERSION.',
                        items: { type: 'string' },
                    },
                },
            },
            customizations: {
                type: 'object',
                description:
                    'Inline patches applied during generation (equivalent to .devcontainer/custom/ patches).',
                additionalProperties: false,
                properties: {
                    devcontainerPatch: {
                        type: 'object',
                        description:
                            'Deep-merged into devcontainer.json after all overlays are applied',
                    },
                    dockerComposePatch: {
                        type: 'object',
                        description:
                            'Deep-merged into docker-compose.yml after all overlays are applied (compose stack only)',
                    },
                    envTemplate: {
                        type: 'object',
                        description: 'Key/value pairs written to .devcontainer/.env.example',
                        additionalProperties: { type: 'string' },
                    },
                    environment: {
                        type: 'object',
                        description: 'Alias for envTemplate (deprecated; prefer envTemplate)',
                        additionalProperties: { type: 'string' },
                    },
                    scripts: {
                        type: 'object',
                        description: 'Shell commands appended to postCreate / postStart hooks',
                        additionalProperties: false,
                        properties: {
                            postCreate: {
                                type: 'array',
                                items: { type: 'string' },
                                description:
                                    'Commands run once after container creation (postCreateCommand)',
                            },
                            postStart: {
                                type: 'array',
                                items: { type: 'string' },
                                description:
                                    'Commands run each time the container starts (postStartCommand)',
                            },
                        },
                    },
                    files: {
                        type: 'array',
                        description: 'Extra files to write into the output directory',
                        items: {
                            type: 'object',
                            required: ['path', 'content'],
                            additionalProperties: false,
                            properties: {
                                path: { type: 'string', description: 'Destination path' },
                                content: { type: 'string', description: 'File content' },
                            },
                        },
                    },
                },
            },
            parameters: {
                type: 'object',
                description:
                    'Overlay parameter values. Keys correspond to parameters declared in overlay.yml. Values substitute {{cs.KEY}} tokens throughout generated files.',
                additionalProperties: {
                    oneOf: [{ type: 'string' }, { type: 'number' }],
                    description: 'Parameter value (strings and numbers are both accepted)',
                },
            },

            // ── Legacy category arrays (deprecated; prefer overlays: [...]) ─────────
            // Per-category enums match buildCategoryLookup() rules in project-config.ts.
            language: {
                type: 'array',
                description: 'Deprecated — use overlays: [...] instead',
                items: { type: 'string', enum: languageIds },
                deprecated: true,
            },
            database: {
                type: 'array',
                description: 'Deprecated — use overlays: [...] instead',
                items: { type: 'string', enum: databaseIds },
                deprecated: true,
            },
            observability: {
                type: 'array',
                description: 'Deprecated — use overlays: [...] instead',
                items: { type: 'string', enum: observabilityIds },
                deprecated: true,
            },
            cloudTools: {
                type: 'array',
                description: 'Deprecated — use overlays: [...] instead',
                items: { type: 'string', enum: cloudIds },
                deprecated: true,
            },
            devTools: {
                type: 'array',
                description: 'Deprecated — use overlays: [...] instead',
                items: { type: 'string', enum: devIds },
                deprecated: true,
            },
            playwright: {
                type: 'boolean',
                description: 'Deprecated — use overlays: [playwright] instead',
                deprecated: true,
            },
        },
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const overlaysDir = path.join(REPO_ROOT, 'overlays');
const indexYmlPath = path.join(overlaysDir, 'index.yml');
const config = loadOverlaysConfig(overlaysDir, indexYmlPath);

const nonPresetOverlays = config.overlays.filter((o) => o.category !== 'preset');
const presetIds = config.overlays
    .filter((o) => o.category === 'preset')
    .map((o) => o.id)
    .sort();

const schema = buildSchema(nonPresetOverlays, presetIds);
const schemaJson = JSON.stringify(schema, null, 4) + '\n';

const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, schemaJson, 'utf8');
console.log(`✅ Generated superposition.yml schema at ${OUTPUT_PATH}`);
console.log(
    `   Overlay IDs: ${nonPresetOverlays.length}  Preset IDs: ${presetIds.length}  Stack values: ${STACK_VALUES.join(', ')}  Base images: ${BASE_IMAGE_VALUES.length}`
);
