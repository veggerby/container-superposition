import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type { OverlayMetadata } from '../schema/types.js';

/**
 * Closed declaration of every authored overlay manifest field. Keeping this
 * total over OverlayMetadata makes a new field an explicit resolver decision.
 */
export type ManifestFieldSemantics =
    | 'identity-display'
    | 'selection-compatibility'
    | 'parameter'
    | 'devcontainer-import'
    | 'compose-import';

export const OVERLAY_MANIFEST_FIELDS = {
    id: 'identity-display',
    name: 'identity-display',
    description: 'identity-display',
    category: 'identity-display',
    supports: 'selection-compatibility',
    requires: 'selection-compatibility',
    suggests: 'selection-compatibility',
    conflicts: 'selection-compatibility',
    tags: 'identity-display',
    ports: 'identity-display',
    order: 'identity-display',
    serviceOrder: 'selection-compatibility',
    imports: 'devcontainer-import',
    compose_imports: 'compose-import',
    minimal: 'selection-compatibility',
    hidden: 'selection-compatibility',
    repeatable: 'selection-compatibility',
    parameters: 'parameter',
} satisfies Record<keyof Omit<OverlayMetadata, 'origin'>, ManifestFieldSemantics>;

/** `origin` is loader/catalog provenance, never an authored manifest field. */
export const SYNTHESIZED_MANIFEST_FIELDS = ['origin'] as const;

export const OVERLAY_FILE_FAMILIES = {
    patch: 'devcontainer.patch.json',
    compose: 'docker-compose.yml',
    setup: 'setup.sh',
    verify: 'verify.sh',
    envExample: '.env.example',
    gitignore: '.gitignore',
    additional: 'additional-file',
} as const;

export type DevcontainerReferenceKind =
    | 'feature'
    | 'build-dockerfile'
    | 'build-context'
    | 'docker-compose-file';
export type DevcontainerReferenceClass = 'local-relative' | 'absolute' | 'remote';

export interface DevcontainerReference {
    kind: DevcontainerReferenceKind;
    classification: DevcontainerReferenceClass;
    value: string;
    pointer: string;
    sourcePath: string;
    declaredPath?: string;
}

interface EffectBase {
    overlayId: string;
    overlayDir: string;
    sourcePath: string;
    declaredPath?: string;
    ordinal?: number;
}

export type OverlayEffectNode =
    | (EffectBase & { kind: 'manifest'; field: keyof typeof OVERLAY_MANIFEST_FIELDS })
    | (EffectBase & {
          kind: 'patch';
          patch: Record<string, unknown>;
          references: DevcontainerReference[];
      })
    | (EffectBase & {
          kind: 'imported-patch';
          patch: Record<string, unknown>;
          references: DevcontainerReference[];
      })
    | (EffectBase & { kind: 'environment-import'; content: string })
    | (EffectBase & { kind: 'compose'; compose: Record<string, unknown> })
    | (EffectBase & { kind: 'compose-import'; compose: Record<string, unknown> })
    | (EffectBase & { kind: 'setup' | 'verify' | 'env-example' | 'gitignore' | 'additional' });

/**
 * Compatibility projection retained for existing materializers. `nodes` is the
 * authoritative semantic graph; these paths are derived from it.
 */
export interface OverlayEffectInventory {
    overlayId: string;
    overlayDir: string;
    patchPath?: string;
    composePath?: string;
    setupPath?: string;
    verifyPath?: string;
    envExamplePath?: string;
    gitignorePath?: string;
    imports: string[];
    composeImports: string[];
    additionalFiles: string[];
    nodes: OverlayEffectNode[];
}

function contained(root: string, candidate: string): boolean {
    const relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertRegularContained(root: string, candidate: string, label: string): void {
    if (!contained(root, candidate))
        throw new Error(`Path traversal rejected: ${label} escapes the effective catalog root.`);
    if (!fs.existsSync(candidate) || !fs.lstatSync(candidate).isFile()) {
        throw new Error(`${label} is missing or is not a regular file.`);
    }
    const realRoot = fs.realpathSync(root);
    const realCandidate = fs.realpathSync(candidate);
    if (!contained(realRoot, realCandidate))
        throw new Error(`${label} resolves through a symlink.`);
}

function listFiles(root: string, current = root): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolute = path.join(current, entry.name);
        if (entry.isSymbolicLink())
            throw new Error(`Overlay contains a symlink effect: ${path.relative(root, absolute)}`);
        if (entry.isDirectory()) files.push(...listFiles(root, absolute));
        else if (entry.isFile()) files.push(path.relative(root, absolute));
        else
            throw new Error(
                `Overlay contains an unsupported file effect: ${path.relative(root, absolute)}`
            );
    }
    return files;
}

function objectDocument(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${label} must contain an object document.`);
    }
    return value as Record<string, unknown>;
}

function parseDocument(source: string, label: string): Record<string, unknown> {
    const ext = path.extname(source).toLowerCase();
    try {
        return objectDocument(
            ext === '.json'
                ? JSON.parse(fs.readFileSync(source, 'utf8'))
                : yaml.load(fs.readFileSync(source, 'utf8')),
            label
        );
    } catch (error) {
        throw new Error(
            `Unable to parse ${label}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

function referenceClass(value: string): DevcontainerReferenceClass {
    if (value.startsWith('./') || value.startsWith('../') || value === '.' || value === '..')
        return 'local-relative';
    if (path.isAbsolute(value)) return 'absolute';
    return 'remote';
}

/** Walk exactly the documented devcontainer path-bearing surface. */
export function discoverDevcontainerReferences(
    document: Record<string, unknown>,
    sourcePath: string,
    declaredPath?: string
): DevcontainerReference[] {
    const references: DevcontainerReference[] = [];
    const add = (kind: DevcontainerReferenceKind, value: unknown, pointer: string) => {
        if (typeof value === 'string')
            references.push({
                kind,
                classification: referenceClass(value),
                value,
                pointer,
                sourcePath,
                declaredPath,
            });
    };
    if (
        document.features &&
        typeof document.features === 'object' &&
        !Array.isArray(document.features)
    ) {
        for (const source of Object.keys(document.features as Record<string, unknown>))
            add(
                'feature',
                source,
                `/features/${source.replaceAll('~', '~0').replaceAll('/', '~1')}`
            );
    }
    if (document.build && typeof document.build === 'object' && !Array.isArray(document.build)) {
        const build = document.build as Record<string, unknown>;
        add('build-dockerfile', build.dockerfile, '/build/dockerfile');
        add('build-context', build.context, '/build/context');
    }
    const compose = document.dockerComposeFile;
    if (typeof compose === 'string') add('docker-compose-file', compose, '/dockerComposeFile');
    else if (Array.isArray(compose))
        compose.forEach((entry, index) =>
            add('docker-compose-file', entry, `/dockerComposeFile/${index}`)
        );
    return references;
}

function readStringArray(
    raw: Record<string, unknown>,
    field: 'imports' | 'compose_imports',
    overlayId: string
): string[] {
    const value = raw[field];
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
        throw new Error(`Overlay '${overlayId}' has a non-string ${field} effect.`);
    return value as string[];
}

function resolveSharedImport(
    overlaysDir: string,
    overlayId: string,
    declaredPath: string,
    expected: 'devcontainer' | 'compose'
): string {
    if (!declaredPath.startsWith('.shared/'))
        throw new Error(
            `Path traversal rejected in overlay '${overlayId}': import '${declaredPath}' is outside the shared catalog directory.`
        );
    const source = path.resolve(overlaysDir, declaredPath);
    const sharedRoot = path.resolve(overlaysDir, '.shared');
    assertRegularContained(sharedRoot, source, `Overlay '${overlayId}' import '${declaredPath}'`);
    const ext = path.extname(source).toLowerCase();
    const allowed = expected === 'compose' ? ['.yaml', '.yml'] : ['.json', '.yaml', '.yml', '.env'];
    if (!allowed.includes(ext))
        throw new Error(
            `Unsupported import type '${ext}' for '${declaredPath}' (overlay: ${overlayId}).`
        );
    return source;
}

/** Resolve one overlay into a pure ordered semantic graph rooted at the effective registry. */
function resolveOverlayEffects(overlaysDir: string, overlayId: string): OverlayEffectInventory {
    const overlayDir = path.resolve(overlaysDir, overlayId);
    if (!contained(path.resolve(overlaysDir), overlayDir) || !fs.existsSync(overlayDir))
        throw new Error(`Overlay '${overlayId}' is not available in the effective catalog.`);
    const manifestPath = path.join(overlayDir, 'overlay.yml');
    assertRegularContained(
        path.resolve(overlaysDir),
        manifestPath,
        `Overlay '${overlayId}' manifest`
    );
    const raw = objectDocument(
        yaml.load(fs.readFileSync(manifestPath, 'utf8')),
        `Overlay '${overlayId}' manifest`
    );
    for (const key of Object.keys(raw)) {
        if (
            !(key in OVERLAY_MANIFEST_FIELDS) &&
            !SYNTHESIZED_MANIFEST_FIELDS.includes(
                key as (typeof SYNTHESIZED_MANIFEST_FIELDS)[number]
            )
        ) {
            throw new Error(`Overlay '${overlayId}' has unsupported manifest field '${key}'.`);
        }
    }
    const imports = readStringArray(raw, 'imports', overlayId);
    const composeImports = readStringArray(raw, 'compose_imports', overlayId);
    const files = listFiles(overlayDir);
    const nodes: OverlayEffectNode[] = Object.keys(raw)
        .filter((field) => field in OVERLAY_MANIFEST_FIELDS)
        .map((field) => ({
            overlayId,
            overlayDir,
            sourcePath: manifestPath,
            kind: 'manifest',
            field: field as keyof typeof OVERLAY_MANIFEST_FIELDS,
        }));
    const addFile = (
        kind: Extract<OverlayEffectNode['kind'], 'setup' | 'verify' | 'env-example' | 'gitignore'>,
        filename: string
    ) => {
        if (files.includes(filename))
            nodes.push({
                overlayId,
                overlayDir,
                sourcePath: path.join(overlayDir, filename),
                kind,
            });
    };
    for (const [ordinal, declaredPath] of imports.entries()) {
        const sourcePath = resolveSharedImport(
            overlaysDir,
            overlayId,
            declaredPath,
            'devcontainer'
        );
        if (path.extname(sourcePath).toLowerCase() === '.env')
            nodes.push({
                overlayId,
                overlayDir,
                sourcePath,
                declaredPath,
                ordinal,
                kind: 'environment-import',
                content: fs.readFileSync(sourcePath, 'utf8'),
            });
        else {
            const patch = parseDocument(
                sourcePath,
                `import '${declaredPath}' for overlay '${overlayId}'`
            );
            nodes.push({
                overlayId,
                overlayDir,
                sourcePath,
                declaredPath,
                ordinal,
                kind: 'imported-patch',
                patch,
                references: discoverDevcontainerReferences(patch, sourcePath, declaredPath),
            });
        }
    }
    for (const [ordinal, declaredPath] of composeImports.entries()) {
        const sourcePath = resolveSharedImport(overlaysDir, overlayId, declaredPath, 'compose');
        nodes.push({
            overlayId,
            overlayDir,
            sourcePath,
            declaredPath,
            ordinal,
            kind: 'compose-import',
            compose: parseDocument(
                sourcePath,
                `compose import '${declaredPath}' for overlay '${overlayId}'`
            ),
        });
    }
    if (files.includes(OVERLAY_FILE_FAMILIES.patch)) {
        const sourcePath = path.join(overlayDir, OVERLAY_FILE_FAMILIES.patch);
        const patch = parseDocument(sourcePath, `patch for overlay '${overlayId}'`);
        nodes.push({
            overlayId,
            overlayDir,
            sourcePath,
            kind: 'patch',
            patch,
            references: discoverDevcontainerReferences(patch, sourcePath),
        });
    }
    if (files.includes(OVERLAY_FILE_FAMILIES.compose))
        nodes.push({
            overlayId,
            overlayDir,
            sourcePath: path.join(overlayDir, OVERLAY_FILE_FAMILIES.compose),
            kind: 'compose',
            compose: parseDocument(
                path.join(overlayDir, OVERLAY_FILE_FAMILIES.compose),
                `compose for overlay '${overlayId}'`
            ),
        });
    addFile('setup', OVERLAY_FILE_FAMILIES.setup);
    addFile('verify', OVERLAY_FILE_FAMILIES.verify);
    addFile('env-example', OVERLAY_FILE_FAMILIES.envExample);
    addFile('gitignore', OVERLAY_FILE_FAMILIES.gitignore);
    const reserved = new Set([
        'overlay.yml',
        'README.md',
        'devcontainer.patch.json',
        'docker-compose.yml',
        'setup.sh',
        'verify.sh',
        '.env.example',
        '.gitignore',
    ]);
    for (const file of files.filter((entry) => !reserved.has(entry)))
        nodes.push({
            overlayId,
            overlayDir,
            sourcePath: path.join(overlayDir, file),
            declaredPath: file,
            kind: 'additional',
        });
    const byKind = (kind: OverlayEffectNode['kind']) => nodes.filter((node) => node.kind === kind);
    const firstPath = (kind: OverlayEffectNode['kind']) => byKind(kind)[0]?.sourcePath;
    return {
        overlayId,
        overlayDir,
        patchPath: firstPath('patch'),
        composePath: firstPath('compose'),
        setupPath: firstPath('setup'),
        verifyPath: firstPath('verify'),
        envExamplePath: firstPath('env-example'),
        gitignorePath: firstPath('gitignore'),
        imports,
        composeImports,
        additionalFiles: byKind('additional').map((node) => node.declaredPath!),
        nodes,
    };
}

/** Inventory every known effect from the resolved effective catalog root. */
export function inventoryOverlayEffects(
    overlaysDir: string,
    overlayIds: string[]
): OverlayEffectInventory[] {
    return overlayIds.map((overlayId) => resolveOverlayEffects(overlaysDir, overlayId));
}

export function assertNever(value: never): never {
    throw new Error(`Unhandled overlay semantic effect: ${JSON.stringify(value)}`);
}
