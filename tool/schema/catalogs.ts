import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import yaml from 'js-yaml';
import { loadOverlaysConfig } from './overlay-loader.js';
import type {
    CatalogDeclaration,
    CatalogDeclarationSource,
    CatalogReceiptEntry,
    OverlaysConfig,
} from './types.js';
import { resolveRepoPath } from '../utils/paths.js';

const QUALIFIED_ID_PATTERN = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const COMMIT_PATTERN = /^[a-f0-9]{7,40}$/i;
const CHECKSUM_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const FLOATING_REFS = new Set(['main', 'master', 'latest', 'head', 'trunk']);
const DEFAULT_CATALOGS_CACHE_ROOT = path.join(os.tmpdir(), 'container-superposition-catalogs');
const BUILT_IN_REPO_ANCHOR = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');

export interface OverlaysContext {
    overlaysDir: string;
    presetsDir: string;
    overlaysConfig: OverlaysConfig;
    catalogs: CatalogReceiptEntry[];
}

function projectConfigCandidates(repoRoot: string): string[] {
    return ['.superposition.yml', 'superposition.yml'].map((file) => path.join(repoRoot, file));
}

function loadProjectDocument(repoRoot: string): Record<string, unknown> | null {
    const projectPath = projectConfigCandidates(repoRoot).find((candidate) =>
        fs.existsSync(candidate)
    );
    if (!projectPath) {
        return null;
    }

    const parsed = yaml.load(fs.readFileSync(projectPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Project config ${path.basename(projectPath)} must be a YAML object`);
    }

    return parsed as Record<string, unknown>;
}

function expectPlainObject(value: unknown, fieldName: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${fieldName} must be a YAML object`);
    }
    return value as Record<string, unknown>;
}

function expectString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${fieldName} must be a non-empty string`);
    }
    return value;
}

function expectOptionalString(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    return expectString(value, fieldName);
}

function rejectInlineCredentials(url: string, fieldName: string): void {
    try {
        const parsed = new URL(url);
        if (/^https?:$/i.test(parsed.protocol) && (parsed.username || parsed.password)) {
            throw new Error(`${fieldName} must not embed credentials; use ambient auth instead`);
        }
        if (/^ssh:$/i.test(parsed.protocol) && parsed.password) {
            throw new Error(`${fieldName} must not embed credentials; use ambient auth instead`);
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('must not embed credentials')) {
            throw error;
        }
    }
}

function resolveRepoRelativePath(repoRoot: string, rawPath: string, fieldName: string): string {
    if (path.isAbsolute(rawPath)) {
        throw new Error(`${fieldName} must be repo-relative in v1`);
    }

    const resolved = path.resolve(repoRoot, rawPath);
    const relative = path.relative(repoRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`${fieldName} must stay within the repository root`);
    }

    return resolved;
}

export function isNamespaceQualifiedId(value: string): boolean {
    return QUALIFIED_ID_PATTERN.test(value);
}

export function parseCatalogDeclarations(
    value: unknown,
    repoRoot: string
): CatalogDeclaration[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new Error('catalogs must be an array');
    }

    const seenIds = new Set<string>();
    const seenNamespaces = new Set<string>();

    return value.map((entry, index) => {
        const record = expectPlainObject(entry, `catalogs[${index}]`);
        const id = expectString(record.id, `catalogs[${index}].id`);
        const namespace = expectString(record.namespace, `catalogs[${index}].namespace`);
        if (!NAMESPACE_PATTERN.test(namespace)) {
            throw new Error(`catalogs[${index}].namespace must match ${NAMESPACE_PATTERN.source}`);
        }
        if (seenIds.has(id)) {
            throw new Error(`catalogs[${index}].id duplicates catalog id '${id}'`);
        }
        if (seenNamespaces.has(namespace)) {
            throw new Error(
                `catalogs[${index}].namespace duplicates namespace '${namespace}'. Namespaces must be unique per project.`
            );
        }
        seenIds.add(id);
        seenNamespaces.add(namespace);

        const source = expectPlainObject(record.source, `catalogs[${index}].source`);
        const type = expectString(
            source.type,
            `catalogs[${index}].source.type`
        ) as CatalogDeclarationSource['type'];
        const subpath = expectOptionalString(source.subpath, `catalogs[${index}].source.subpath`);

        switch (type) {
            case 'git': {
                const url = expectString(source.url, `catalogs[${index}].source.url`);
                rejectInlineCredentials(url, `catalogs[${index}].source.url`);
                const commit = expectString(source.commit, `catalogs[${index}].source.commit`);
                if (!COMMIT_PATTERN.test(commit)) {
                    throw new Error(`catalogs[${index}].source.commit must be a git commit SHA`);
                }
                const ref = expectOptionalString(source.ref, `catalogs[${index}].source.ref`);
                if (ref && FLOATING_REFS.has(ref.toLowerCase())) {
                    throw new Error(
                        `catalogs[${index}].source.ref must be immutable; floating refs like '${ref}' are rejected`
                    );
                }
                return {
                    id,
                    namespace,
                    source: { type, url, ref, commit, subpath },
                } satisfies CatalogDeclaration;
            }
            case 'archive': {
                const url = expectString(source.url, `catalogs[${index}].source.url`);
                rejectInlineCredentials(url, `catalogs[${index}].source.url`);
                if (!/^https:\/\//i.test(url) && !/^file:\/\//i.test(url)) {
                    throw new Error(
                        `catalogs[${index}].source.url must use https:// in normal use (file:// is accepted for local validation and tests)`
                    );
                }
                const checksum = expectString(
                    source.checksum,
                    `catalogs[${index}].source.checksum`
                );
                if (!CHECKSUM_PATTERN.test(checksum)) {
                    throw new Error(`catalogs[${index}].source.checksum must use sha256:<64 hex>`);
                }
                return {
                    id,
                    namespace,
                    source: { type, url, checksum, subpath },
                } satisfies CatalogDeclaration;
            }
            case 'path': {
                const catalogPath = expectString(source.path, `catalogs[${index}].source.path`);
                const resolvedPath = resolveRepoRelativePath(
                    repoRoot,
                    catalogPath,
                    `catalogs[${index}].source.path`
                );
                return {
                    id,
                    namespace,
                    source: { type, path: catalogPath, resolvedPath, subpath },
                } satisfies CatalogDeclaration;
            }
            default:
                throw new Error(
                    `catalogs[${index}].source.type must be one of: git, archive, path`
                );
        }
    });
}

export function loadProjectCatalogDeclarations(repoRoot: string): CatalogDeclaration[] | undefined {
    const document = loadProjectDocument(repoRoot);
    if (!document) {
        return undefined;
    }
    return parseCatalogDeclarations(document.catalogs, repoRoot);
}

export function getBuiltInOverlaysDir(): string {
    return resolveRepoPath('overlays', BUILT_IN_REPO_ANCHOR);
}

function ensureDirectory(targetPath: string): void {
    fs.mkdirSync(targetPath, { recursive: true });
}

function hashToken(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function applyCatalogSubpath(rootDir: string, subpath: string | undefined): string {
    if (!subpath) {
        return rootDir;
    }
    const resolved = path.resolve(rootDir, subpath);
    const relative = path.relative(rootDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Catalog subpath must stay within the fetched catalog root: ${subpath}`);
    }
    return resolved;
}

function downloadFile(url: string, destination: string): void {
    ensureDirectory(path.dirname(destination));
    execFileSync('curl', ['-L', '--fail', '--silent', '--show-error', url, '-o', destination], {
        stdio: 'pipe',
    });
}

function materializeArchiveSource(
    source: Extract<CatalogDeclarationSource, { type: 'archive' }>,
    cacheRoot: string
): { rootDir: string; resolvedIdentity: string } {
    const identity = `${source.url}#${source.checksum}`;
    const sourceHash = hashToken(identity);
    const extractedRoot = path.join(cacheRoot, 'archive', sourceHash, 'catalog');
    if (!fs.existsSync(extractedRoot)) {
        const workingDir = path.join(cacheRoot, 'archive', sourceHash);
        ensureDirectory(workingDir);
        const archivePath = path.join(workingDir, 'catalog.tgz');
        if (!fs.existsSync(archivePath)) {
            if (source.url.startsWith('file://')) {
                const localPath = new URL(source.url).pathname;
                fs.copyFileSync(localPath, archivePath);
            } else {
                downloadFile(source.url, archivePath);
            }
        }
        const actualChecksum =
            'sha256:' +
            crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
        if (actualChecksum.toLowerCase() !== source.checksum.toLowerCase()) {
            throw new Error(
                `Archive checksum mismatch for ${source.url}. Expected ${source.checksum}, got ${actualChecksum}`
            );
        }
        ensureDirectory(extractedRoot);
        execFileSync('tar', ['-xzf', archivePath, '-C', extractedRoot], { stdio: 'pipe' });
    }
    return {
        rootDir: applyCatalogSubpath(extractedRoot, source.subpath),
        resolvedIdentity: source.checksum,
    };
}

function materializeGitSource(
    source: Extract<CatalogDeclarationSource, { type: 'git' }>,
    cacheRoot: string
): { rootDir: string; resolvedIdentity: string } {
    const identity = `${source.url}#${source.commit}`;
    const sourceHash = hashToken(identity);
    const checkoutRoot = path.join(cacheRoot, 'git', sourceHash, 'checkout');
    if (!fs.existsSync(checkoutRoot)) {
        ensureDirectory(path.dirname(checkoutRoot));
        execFileSync('git', ['clone', '--quiet', source.url, checkoutRoot], { stdio: 'pipe' });
        execFileSync(
            'git',
            ['-C', checkoutRoot, 'checkout', '--quiet', '--detach', source.commit],
            {
                stdio: 'pipe',
            }
        );
        const actualCommit = execFileSync('git', ['-C', checkoutRoot, 'rev-parse', 'HEAD'], {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        if (!actualCommit.toLowerCase().startsWith(source.commit.toLowerCase())) {
            throw new Error(
                `Resolved git commit ${actualCommit} did not match requested commit ${source.commit}`
            );
        }
    }
    return {
        rootDir: applyCatalogSubpath(checkoutRoot, source.subpath),
        resolvedIdentity: source.commit,
    };
}

function materializePathSource(
    source: Extract<CatalogDeclarationSource, { type: 'path' }>,
    repoRoot: string
): {
    rootDir: string;
    resolvedIdentity: string;
} {
    const basePath = source.resolvedPath;
    const rootDir = applyCatalogSubpath(basePath, source.subpath);
    if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
        throw new Error(`Catalog path does not exist: ${rootDir}`);
    }
    return {
        rootDir,
        resolvedIdentity: `path:${path.relative(repoRoot, rootDir) || '.'}`,
    };
}

function materializeCatalogSource(
    declaration: CatalogDeclaration,
    cacheRoot: string,
    repoRoot: string
): { rootDir: string; resolvedIdentity: string } {
    switch (declaration.source.type) {
        case 'git':
            return materializeGitSource(declaration.source, cacheRoot);
        case 'archive':
            return materializeArchiveSource(declaration.source, cacheRoot);
        case 'path':
            return materializePathSource(declaration.source, repoRoot);
    }
}

function catalogOverlayDirectories(catalogRoot: string): string[] {
    if (!fs.existsSync(catalogRoot)) {
        return [];
    }
    return fs
        .readdirSync(catalogRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => path.join(catalogRoot, entry.name))
        .filter((overlayDir) => fs.existsSync(path.join(overlayDir, 'overlay.yml')));
}

function rewriteOverlayReference(value: string, localIds: Set<string>, namespace: string): string {
    return localIds.has(value) ? `${namespace}/${value}` : value;
}

function rewriteSharedImportPath(importPath: string, namespace: string): string {
    if (!importPath.startsWith('.shared/')) {
        return importPath;
    }
    return `.shared/${namespace}/${importPath.slice('.shared/'.length)}`;
}

function copyCatalogSharedFiles(sourceRoot: string, mergedRoot: string, namespace: string): void {
    const sharedRoot = path.join(sourceRoot, '.shared');
    if (!fs.existsSync(sharedRoot)) {
        return;
    }
    const targetRoot = path.join(mergedRoot, '.shared', namespace);
    ensureDirectory(path.dirname(targetRoot));
    fs.cpSync(sharedRoot, targetRoot, { recursive: true });
}

function rewritePresetDefinition(
    rawPreset: Record<string, unknown>,
    namespace: string,
    localIds: Set<string>
): Record<string, unknown> {
    const preset = { ...rawPreset };
    const originalId = expectString(rawPreset.id, 'preset.id');
    preset.id = `${namespace}/${originalId}`;

    const selects = expectPlainObject(rawPreset.selects, `preset ${originalId}.selects`);
    if (Array.isArray(selects.required)) {
        selects.required = selects.required.map((entry, index) =>
            rewriteOverlayReference(
                expectString(entry, `preset ${originalId}.selects.required[${index}]`),
                localIds,
                namespace
            )
        );
    }
    if (
        selects.userChoice &&
        typeof selects.userChoice === 'object' &&
        !Array.isArray(selects.userChoice)
    ) {
        for (const value of Object.values(selects.userChoice as Record<string, unknown>)) {
            const choice = expectPlainObject(value, `preset ${originalId}.selects.userChoice`);
            if (Array.isArray(choice.options)) {
                choice.options = choice.options.map((entry, index) =>
                    rewriteOverlayReference(
                        expectString(
                            entry,
                            `preset ${originalId}.selects.userChoice.options[${index}]`
                        ),
                        localIds,
                        namespace
                    )
                );
            }
            if (typeof choice.defaultOption === 'string') {
                choice.defaultOption = rewriteOverlayReference(
                    choice.defaultOption,
                    localIds,
                    namespace
                );
            }
        }
    }
    preset.selects = selects;

    if (
        preset.parameters &&
        typeof preset.parameters === 'object' &&
        !Array.isArray(preset.parameters)
    ) {
        for (const parameter of Object.values(preset.parameters as Record<string, unknown>)) {
            const parameterRecord = expectPlainObject(parameter, `preset ${originalId}.parameters`);
            if (Array.isArray(parameterRecord.options)) {
                for (const option of parameterRecord.options) {
                    const optionRecord = expectPlainObject(
                        option,
                        `preset ${originalId}.parameters.options`
                    );
                    if (Array.isArray(optionRecord.overlays)) {
                        optionRecord.overlays = optionRecord.overlays.map((entry, index) =>
                            rewriteOverlayReference(
                                expectString(
                                    entry,
                                    `preset ${originalId}.parameters.options.overlays[${index}]`
                                ),
                                localIds,
                                namespace
                            )
                        );
                    }
                }
            }
        }
    }

    return preset;
}

function mergeCatalogIntoRoot(
    mergedRoot: string,
    declaration: CatalogDeclaration,
    catalogRoot: string
): void {
    const overlayDirs = catalogOverlayDirectories(catalogRoot);
    const localIds = new Set<string>(overlayDirs.map((overlayDir) => path.basename(overlayDir)));

    copyCatalogSharedFiles(catalogRoot, mergedRoot, declaration.namespace);

    for (const overlayDir of overlayDirs) {
        const localId = path.basename(overlayDir);
        const qualifiedId = `${declaration.namespace}/${localId}`;
        const targetOverlayDir = path.join(mergedRoot, qualifiedId);
        if (fs.existsSync(targetOverlayDir)) {
            throw new Error(`Catalog collision: duplicate qualified overlay id '${qualifiedId}'`);
        }

        fs.cpSync(overlayDir, targetOverlayDir, { recursive: true });
        const manifestPath = path.join(targetOverlayDir, 'overlay.yml');
        const manifest = expectPlainObject(
            yaml.load(fs.readFileSync(manifestPath, 'utf8')),
            manifestPath
        );
        manifest.id = qualifiedId;
        for (const relationKey of ['requires', 'suggests', 'conflicts'] as const) {
            const current = manifest[relationKey];
            if (Array.isArray(current)) {
                manifest[relationKey] = current.map((entry, index) =>
                    rewriteOverlayReference(
                        expectString(entry, `${qualifiedId}.${relationKey}[${index}]`),
                        localIds,
                        declaration.namespace
                    )
                );
            }
        }
        for (const importKey of ['imports', 'compose_imports'] as const) {
            const current = manifest[importKey];
            if (Array.isArray(current)) {
                manifest[importKey] = current.map((entry, index) =>
                    rewriteSharedImportPath(
                        expectString(entry, `${qualifiedId}.${importKey}[${index}]`),
                        declaration.namespace
                    )
                );
            }
        }
        (manifest as Record<string, unknown>).origin = {
            catalogId: declaration.id,
            namespace: declaration.namespace,
            sourceKind: 'external',
        };
        fs.writeFileSync(
            manifestPath,
            yaml.dump(manifest, { lineWidth: 120, noRefs: true }),
            'utf8'
        );
    }

    const presetsRoot = path.join(catalogRoot, '.presets');
    if (fs.existsSync(presetsRoot)) {
        const presetFiles = fs
            .readdirSync(presetsRoot, { withFileTypes: true })
            .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
            .map((entry) => path.join(presetsRoot, entry.name));

        for (const presetPath of presetFiles) {
            const rawPreset = expectPlainObject(
                yaml.load(fs.readFileSync(presetPath, 'utf8')),
                presetPath
            );
            const rewritten = rewritePresetDefinition(rawPreset, declaration.namespace, localIds);
            const localPresetId = expectString(rawPreset.id, `${presetPath} id`);
            const targetPresetPath = path.join(
                mergedRoot,
                '.presets',
                declaration.namespace,
                `${localPresetId}.yml`
            );
            ensureDirectory(path.dirname(targetPresetPath));
            fs.writeFileSync(
                targetPresetPath,
                yaml.dump(rewritten, { lineWidth: 120, noRefs: true }),
                'utf8'
            );
        }
    }
}

function buildMergedCatalogRoot(
    builtInOverlaysDir: string,
    declarations: CatalogDeclaration[],
    cacheRoot: string,
    repoRoot: string
): { mergedRoot: string; catalogs: CatalogReceiptEntry[] } {
    const resolvedCatalogs = [] as Array<{
        declaration: CatalogDeclaration;
        rootDir: string;
        resolvedIdentity: string;
    }>;

    for (const declaration of declarations) {
        const materialized = materializeCatalogSource(declaration, cacheRoot, repoRoot);
        resolvedCatalogs.push({ declaration, ...materialized });
    }

    const mergedKey = hashToken(
        JSON.stringify(
            resolvedCatalogs.map((entry) => ({
                id: entry.declaration.id,
                namespace: entry.declaration.namespace,
                identity: entry.resolvedIdentity,
            }))
        )
    );
    const mergedRoot = path.join(cacheRoot, 'merged', mergedKey, 'overlays');
    if (!fs.existsSync(mergedRoot)) {
        ensureDirectory(path.dirname(mergedRoot));
        fs.cpSync(builtInOverlaysDir, mergedRoot, { recursive: true });
        for (const entry of resolvedCatalogs) {
            mergeCatalogIntoRoot(mergedRoot, entry.declaration, entry.rootDir);
        }
    }

    return {
        mergedRoot,
        catalogs: resolvedCatalogs.map(({ declaration, resolvedIdentity }) => ({
            id: declaration.id,
            namespace: declaration.namespace,
            sourceType: declaration.source.type,
            resolvedIdentity,
        })),
    };
}

export function resolveOverlaysContext(
    repoRoot: string = process.cwd(),
    builtInOverlaysDir: string = getBuiltInOverlaysDir(),
    declarations?: CatalogDeclaration[]
): OverlaysContext {
    const catalogDeclarations = declarations ?? loadProjectCatalogDeclarations(repoRoot) ?? [];
    if (catalogDeclarations.length === 0) {
        return {
            overlaysDir: builtInOverlaysDir,
            presetsDir: path.join(builtInOverlaysDir, '.presets'),
            overlaysConfig: loadOverlaysConfig(
                builtInOverlaysDir,
                path.join(builtInOverlaysDir, 'index.yml')
            ),
            catalogs: [],
        };
    }

    const { mergedRoot, catalogs } = buildMergedCatalogRoot(
        builtInOverlaysDir,
        catalogDeclarations,
        DEFAULT_CATALOGS_CACHE_ROOT,
        repoRoot
    );

    return {
        overlaysDir: mergedRoot,
        presetsDir: path.join(mergedRoot, '.presets'),
        overlaysConfig: loadOverlaysConfig(mergedRoot, path.join(mergedRoot, 'index.yml')),
        catalogs,
    };
}
