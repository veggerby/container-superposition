import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import yaml from 'js-yaml';
import { execFileSync } from 'child_process';
import { deepMerge } from '../utils/merge.js';
import {
    PROJECT_CONFIG_FILENAMES,
    SUPERPOSITION_LOCAL_SCHEMA_URL,
    parseLocalProjectConfigDocument,
    type LocalProjectConfigSelection,
} from '../schema/project-config.js';
import type { ProjectMount } from '../schema/types.js';
import {
    getExactGitignoreBlock,
    removeExactGitignoreBlock,
    upsertExactGitignoreBlock,
} from '../utils/gitignore.js';

const LOCAL_DIR = '.container-superposition';
const INPUT_REL = `${LOCAL_DIR}/amendment.yml`;
const STATE_REL = `${LOCAL_DIR}/amendment-state.json`;
const SUPPORT_DIR_REL = `${LOCAL_DIR}/amendment`;
const STATE_VERSION = 1;
const EXCLUDE_SECTION = 'container-superposition local amendment';
const MANAGED_AUTHORITY_PATHS = [
    ...PROJECT_CONFIG_FILENAMES,
    'superposition.json',
    '.devcontainer/superposition.json',
    'superposition.local.yml',
    '.superposition.local.yml',
];

export interface AmendOptions {
    projectRoot?: string;
    base?: string;
    json?: boolean;
    purge?: boolean;
}

type AmendAction = 'init' | 'refresh' | 'inspect' | 'remove';

type JsonObject = Record<string, any>;

interface BaseInfo {
    absPath: string;
    relPath: string;
    dirRel: string;
    alternateAbsPath: string;
    alternateRelPath: string;
    hash: string;
    config: JsonObject;
    composeFiles: string[];
    service?: string;
}

interface AmendState {
    formatVersion: number;
    basePath: string;
    baseSha256: string;
    inputSha256: string;
    generatedArtifacts: string[];
    generatedArtifactSha256: Record<string, string>;
    mode: 'plain' | 'compose';
}

interface Model {
    projectRoot: string;
    base: BaseInfo;
    inputAbsPath: string;
    inputRelPath: string;
    stateAbsPath: string;
    stateRelPath: string;
    supportDirAbsPath: string;
    supportDirRelPath: string;
    git: GitProtection;
    state: AmendState | null;
}

interface IgnoreProvenance {
    path: string;
    ignored: boolean;
    source?: string;
    line?: number;
    pattern?: string;
    expected: boolean;
}

interface GitProtection {
    inGit: boolean;
    excludePath?: string;
    tracked: string[];
    protectedPaths: string[];
    ignoreProvenance: IgnoreProvenance[];
    warning?: string;
}

function sha256(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function toPosix(value: string): string {
    return value.split(path.sep).join('/');
}

function rel(root: string, abs: string): string {
    return toPosix(path.relative(root, abs));
}

function contained(root: string, candidate: string): boolean {
    const relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function ensureNoSymlinkComponents(root: string, candidate: string): void {
    const rootReal = fs.realpathSync(root);
    const absolute = path.resolve(candidate);
    if (!contained(rootReal, absolute)) throw new Error(`Path escapes repository: ${candidate}`);
    const resolved = fs.existsSync(absolute) ? fs.realpathSync(absolute) : absolute;
    if (!contained(rootReal, resolved)) throw new Error(`Path escapes repository: ${candidate}`);
    const relativeParts = path.relative(rootReal, absolute).split(path.sep).filter(Boolean);
    let current = rootReal;
    for (const part of relativeParts) {
        current = path.join(current, part);
        if (!fs.existsSync(current)) continue;
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink()) {
            throw new Error(
                `Refusing to use path through symlink component: ${rel(rootReal, current)}`
            );
        }
    }
}

function expectedArtifactAllowlist(model: Omit<Model, 'state'> | Model): Set<string> {
    return new Set([
        model.base.alternateRelPath,
        `${SUPPORT_DIR_REL}/shell.sh`,
        `${SUPPORT_DIR_REL}/shell-init.sh`,
        `${SUPPORT_DIR_REL}/docker-compose.override.yml`,
    ]);
}

function assertExpectedArtifactName(model: Omit<Model, 'state'> | Model, artifact: string): void {
    if (
        path.isAbsolute(artifact) ||
        artifact.includes('..') ||
        !expectedArtifactAllowlist(model).has(artifact)
    ) {
        throw new Error(`Unexpected generated artifact path in receipt: ${artifact}`);
    }
}

function validateArtifactPath(model: Omit<Model, 'state'> | Model, artifact: string): string {
    assertExpectedArtifactName(model, artifact);
    const abs = path.resolve(model.projectRoot, artifact);
    if (!contained(model.projectRoot, abs)) {
        throw new Error(`Unsafe generated artifact path in receipt: ${artifact}`);
    }
    ensureNoSymlinkComponents(model.projectRoot, abs);
    return abs;
}

function stripJsoncForBaseDevcontainer(content: string): string {
    let withoutComments = '';
    let inString = false;
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let index = 0; index < content.length; index += 1) {
        const char = content[index];
        const next = content[index + 1];

        if (inLineComment) {
            if (char === '\r' || char === '\n') {
                inLineComment = false;
                withoutComments += char;
            }
            continue;
        }

        if (inBlockComment) {
            if (char === '*' && next === '/') {
                inBlockComment = false;
                index += 1;
                continue;
            }
            withoutComments += char === '\r' || char === '\n' ? char : ' ';
            continue;
        }

        if (inString) {
            withoutComments += char;
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            withoutComments += char;
            continue;
        }

        if (char === '/' && next === '/') {
            inLineComment = true;
            index += 1;
            continue;
        }

        if (char === '/' && next === '*') {
            inBlockComment = true;
            withoutComments += '  ';
            index += 1;
            continue;
        }

        withoutComments += char;
    }

    if (inBlockComment) {
        throw new Error('Unterminated JSONC block comment');
    }

    let output = '';
    inString = false;
    escaped = false;
    for (let index = 0; index < withoutComments.length; index += 1) {
        const char = withoutComments[index];
        if (inString) {
            output += char;
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }
        if (char === '"') {
            inString = true;
            output += char;
            continue;
        }
        if (char === ',') {
            let lookahead = index + 1;
            while (/\s/.test(withoutComments[lookahead] ?? '')) lookahead += 1;
            if (withoutComments[lookahead] === '}' || withoutComments[lookahead] === ']') {
                continue;
            }
        }
        output += char;
    }

    return output;
}

function readJsonObject(filePath: string): JsonObject {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stripJsoncForBaseDevcontainer(fs.readFileSync(filePath, 'utf8')));
    } catch (error) {
        throw new Error(
            `Could not parse ${filePath} as JSON/JSONC devcontainer configuration: ${error instanceof Error ? error.message : String(error)}`
        );
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${filePath} must contain a JSON object devcontainer configuration.`);
    }
    return parsed as JsonObject;
}

function discoverProjectRoot(input?: string): string {
    const root = path.resolve(input ?? process.cwd());
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        throw new Error(`Project root does not exist or is not a directory: ${root}`);
    }
    return fs.realpathSync(root);
}

function ensureNoSharedAuthority(projectRoot: string): void {
    const conflicts = MANAGED_AUTHORITY_PATHS.filter((name) =>
        fs.existsSync(path.join(projectRoot, name))
    );
    if (conflicts.length > 0) {
        throw new Error(
            `Local amendment is only for non-adopting repositories. Found shared Container Superposition authority: ${conflicts.join(', ')}. Use regen for managed projects or adopt for team migration.`
        );
    }
}

function resolveBase(projectRoot: string, baseOption?: string): BaseInfo {
    const defaultCandidates = [
        path.join(projectRoot, '.devcontainer', 'devcontainer.json'),
        path.join(projectRoot, '.devcontainer.json'),
    ].filter((candidate) => fs.existsSync(candidate));

    let baseAbs: string;
    if (baseOption) {
        baseAbs = path.resolve(projectRoot, baseOption);
        if (!fs.existsSync(baseAbs) || !fs.statSync(baseAbs).isFile()) {
            throw new Error(
                `--base must point to an existing devcontainer.json file inside the repository: ${baseOption}`
            );
        }
    } else {
        if (defaultCandidates.length === 0) {
            throw new Error(
                'No supported existing devcontainer was found. Add .devcontainer/devcontainer.json, use --base, use adopt for team migration, or use init for a new managed setup.'
            );
        }
        if (defaultCandidates.length > 1) {
            throw new Error(
                'Found both .devcontainer/devcontainer.json and .devcontainer.json. Select one with amend init --base <path> before any writes.'
            );
        }
        baseAbs = defaultCandidates[0];
    }

    ensureNoSymlinkComponents(projectRoot, baseAbs);
    baseAbs = fs.realpathSync(baseAbs);
    if (!contained(projectRoot, baseAbs)) {
        throw new Error(
            `Base devcontainer must be inside the repository and must not resolve through a symlink escape: ${baseOption ?? baseAbs}`
        );
    }
    if (
        path.basename(baseAbs) !== 'devcontainer.json' &&
        path.basename(baseAbs) !== '.devcontainer.json'
    ) {
        throw new Error(
            `--base must name devcontainer.json or .devcontainer.json: ${rel(projectRoot, baseAbs)}`
        );
    }

    const baseRel = rel(projectRoot, baseAbs);
    const config = readJsonObject(baseAbs);
    const dir = path.dirname(baseAbs);
    const alternateName =
        path.basename(baseAbs) === '.devcontainer.json'
            ? '.devcontainer.superposition-local.json'
            : 'devcontainer.superposition-local.json';
    const alternateAbs = path.join(dir, alternateName);
    const composeFiles = normalizeComposeFiles(projectRoot, dir, config);
    const service =
        typeof config.service === 'string' && config.service.trim()
            ? config.service.trim()
            : undefined;
    if (composeFiles.length > 0 && !service) {
        throw new Error(
            `Compose-backed devcontainers require a string service field before local compose amendments can be applied. Fix ${baseRel} or use adopt for migration.`
        );
    }
    return {
        absPath: baseAbs,
        relPath: baseRel,
        dirRel: rel(projectRoot, dir),
        alternateAbsPath: alternateAbs,
        alternateRelPath: rel(projectRoot, alternateAbs),
        hash: sha256(fs.readFileSync(baseAbs)),
        config,
        composeFiles,
        service,
    };
}

function normalizeComposeFiles(projectRoot: string, baseDir: string, config: JsonObject): string[] {
    const value = config.dockerComposeFile;
    if (value === undefined) return [];
    const entries = typeof value === 'string' ? [value] : Array.isArray(value) ? value : null;
    if (
        !entries ||
        entries.length === 0 ||
        entries.some((entry) => typeof entry !== 'string' || entry.trim() === '')
    ) {
        throw new Error(
            'dockerComposeFile must be a non-empty string or non-empty array of strings for amend.'
        );
    }
    return entries.map((entry) => {
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(entry)) {
            throw new Error(
                `Remote dockerComposeFile entries are not supported by amend: ${entry}`
            );
        }
        const abs = path.resolve(baseDir, entry);
        if (!contained(projectRoot, abs) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
            throw new Error(
                `dockerComposeFile entry does not resolve to an existing repository file: ${entry}`
            );
        }
        ensureNoSymlinkComponents(projectRoot, abs);
        return rel(projectRoot, abs);
    });
}

function loadState(model: Omit<Model, 'state'>): AmendState | null {
    ensureLocalStatePathSafe(model);
    if (!fs.existsSync(model.stateAbsPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(model.stateAbsPath, 'utf8')) as unknown;
    const state = validateStateSchema(parsed, model);
    if (state.basePath !== model.base.relPath) {
        throw new Error(
            `Existing amendment receipt is for ${state.basePath}, not ${model.base.relPath}. Use amend remove with the original base or resolve local state manually.`
        );
    }
    return state;
}

function validateStateSchema(parsed: unknown, model: Omit<Model, 'state'>): AmendState {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Invalid amendment receipt schema in ${model.stateRelPath}.`);
    }
    const state = parsed as Partial<AmendState>;
    const allowedKeys = new Set([
        'formatVersion',
        'basePath',
        'baseSha256',
        'inputSha256',
        'generatedArtifacts',
        'generatedArtifactSha256',
        'mode',
    ]);
    for (const key of Object.keys(state)) {
        if (!allowedKeys.has(key)) throw new Error(`Unexpected key in amendment receipt: ${key}`);
    }
    if (state.formatVersion !== STATE_VERSION) {
        throw new Error(
            `Unsupported amendment receipt version in ${model.stateRelPath}. Remove it manually or upgrade Container Superposition.`
        );
    }
    if (
        typeof state.basePath !== 'string' ||
        typeof state.baseSha256 !== 'string' ||
        typeof state.inputSha256 !== 'string' ||
        !Array.isArray(state.generatedArtifacts) ||
        (state.mode !== 'plain' && state.mode !== 'compose') ||
        !state.generatedArtifactSha256 ||
        typeof state.generatedArtifactSha256 !== 'object' ||
        Array.isArray(state.generatedArtifactSha256)
    ) {
        throw new Error(`Invalid amendment receipt schema in ${model.stateRelPath}.`);
    }
    const seen = new Set<string>();
    for (const artifact of state.generatedArtifacts) {
        if (typeof artifact !== 'string' || seen.has(artifact)) {
            throw new Error(`Invalid generated artifact entry in ${model.stateRelPath}.`);
        }
        seen.add(artifact);
        validateArtifactPath(model, artifact);
        if (typeof state.generatedArtifactSha256[artifact] !== 'string') {
            throw new Error(`Missing generated artifact hash for ${artifact}.`);
        }
    }
    for (const artifact of Object.keys(state.generatedArtifactSha256)) {
        if (!seen.has(artifact))
            throw new Error(`Unexpected generated artifact hash for ${artifact}.`);
    }
    return state as AmendState;
}

function readReceiptBasePath(projectRoot: string): string | undefined {
    const localDirPath = path.join(projectRoot, LOCAL_DIR);
    const statePath = path.join(projectRoot, STATE_REL);
    ensureNoSymlinkComponents(projectRoot, localDirPath);
    ensureNoSymlinkComponents(projectRoot, statePath);
    if (!fs.existsSync(statePath)) return undefined;
    try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Partial<AmendState>;
        return typeof state.basePath === 'string' ? state.basePath : undefined;
    } catch {
        return undefined;
    }
}

function resolveModel(options: AmendOptions): Model {
    const projectRoot = discoverProjectRoot(options.projectRoot);
    ensureNoSharedAuthority(projectRoot);
    const base = resolveBase(projectRoot, options.base ?? readReceiptBasePath(projectRoot));
    const inputAbsPath = path.join(projectRoot, INPUT_REL);
    const stateAbsPath = path.join(projectRoot, STATE_REL);
    const supportDirAbsPath = path.join(projectRoot, SUPPORT_DIR_REL);
    const partial = {
        projectRoot,
        base,
        inputAbsPath,
        inputRelPath: INPUT_REL,
        stateAbsPath,
        stateRelPath: STATE_REL,
        supportDirAbsPath,
        supportDirRelPath: SUPPORT_DIR_REL,
        git: {
            inGit: false,
            tracked: [],
            protectedPaths: [],
            ignoreProvenance: [],
        } as GitProtection,
    };
    ensureLocalStatePathSafe(partial);
    const git = inspectGit(projectRoot, [
        INPUT_REL,
        STATE_REL,
        SUPPORT_DIR_REL,
        base.alternateRelPath,
    ]);
    const model = { ...partial, git };
    return { ...model, state: loadState(model) };
}

function execGit(projectRoot: string, args: string[]): string | null {
    try {
        return execFileSync('git', ['-C', projectRoot, ...args], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
    } catch {
        return null;
    }
}

function inspectIgnoreProvenance(
    projectRoot: string,
    candidate: string,
    expectedSource?: string
): IgnoreProvenance {
    const output = execGit(projectRoot, ['check-ignore', '-v', '--', candidate]);
    if (!output) return { path: candidate, ignored: false, expected: false };
    const match = output.trim().match(/^(.*):(\d+):([^\t]+)\t(.+)$/);
    if (!match) return { path: candidate, ignored: true, expected: false };
    const [, source, line, pattern] = match;
    const sourceAbs = path.resolve(projectRoot, source);
    return {
        path: candidate,
        ignored: true,
        source,
        line: Number(line),
        pattern,
        expected: expectedSource ? sourceAbs === expectedSource : false,
    };
}

function inspectGit(projectRoot: string, candidates: string[]): GitProtection {
    const worktree = execGit(projectRoot, ['rev-parse', '--show-toplevel']);
    if (worktree === null) {
        return {
            inGit: false,
            tracked: [],
            protectedPaths: candidates,
            ignoreProvenance: [],
            warning:
                'This is not a Git worktree; Container Superposition cannot install local Git exclude protection. Keep amendment files local-only.',
        };
    }
    const exclude = execGit(projectRoot, ['rev-parse', '--git-path', 'info/exclude'])?.trim();
    const trackedOutput = execGit(projectRoot, ['ls-files', '--', ...candidates]);
    const excludePath = exclude ? path.resolve(projectRoot, exclude) : undefined;
    return {
        inGit: true,
        excludePath,
        tracked: (trackedOutput ?? '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        protectedPaths: candidates,
        ignoreProvenance: candidates.map((candidate) =>
            inspectIgnoreProvenance(projectRoot, candidate, excludePath)
        ),
    };
}

function ensureLocalStatePathSafe(
    model: Pick<Model, 'projectRoot' | 'inputAbsPath' | 'stateAbsPath' | 'supportDirAbsPath'>
): void {
    ensureNoSymlinkComponents(model.projectRoot, model.inputAbsPath);
    ensureNoSymlinkComponents(model.projectRoot, model.stateAbsPath);
    ensureNoSymlinkComponents(model.projectRoot, model.supportDirAbsPath);
}

function ensureGitProtection(model: Model, includeAlternate = true): void {
    if (model.git.tracked.length > 0) {
        throw new Error(
            `Local amendment paths are already tracked by Git: ${model.git.tracked.join(', ')}. Stop before writes. Run manually if appropriate: git rm --cached -- ${model.git.tracked.join(' ')}`
        );
    }
    if (!model.git.inGit) {
        console.warn(chalk.yellow(`⚠ ${model.git.warning}`));
        return;
    }
    if (!model.git.excludePath) {
        throw new Error(
            `Could not resolve worktree-local Git exclude path. Add ignore rules manually for ${LOCAL_DIR}/ and ${model.base.alternateRelPath}.`
        );
    }
    const patterns = includeAlternate
        ? [`/${LOCAL_DIR}/`, `/${model.base.alternateRelPath}`]
        : [`/${LOCAL_DIR}/`];
    fs.mkdirSync(path.dirname(model.git.excludePath), { recursive: true });
    upsertExactGitignoreBlock(model.git.excludePath, EXCLUDE_SECTION, patterns);
    for (const checkPath of includeAlternate
        ? [model.inputRelPath, model.base.alternateRelPath]
        : [model.inputRelPath]) {
        const provenance = inspectIgnoreProvenance(
            model.projectRoot,
            checkPath,
            model.git.excludePath
        );
        if (!provenance.ignored || !provenance.expected) {
            throw new Error(
                `Git exclude protection could not be verified for ${checkPath}. Expected ${model.git.excludePath}, got ${provenance.source ?? 'no ignore rule'}. Add ignore rules manually before applying the amendment.`
            );
        }
    }
}

function writeAtomic(filePath: string, content: string): void {
    const root = filePath.includes(`${path.sep}${LOCAL_DIR}${path.sep}`)
        ? filePath.slice(0, filePath.indexOf(`${path.sep}${LOCAL_DIR}${path.sep}`))
        : undefined;
    if (root) ensureNoSymlinkComponents(root, filePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp-${process.pid}`;
    if (root) ensureNoSymlinkComponents(root, tmp);
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, filePath);
}

function defaultInput(): string {
    return yaml.dump({ $schema: SUPERPOSITION_LOCAL_SCHEMA_URL }, { lineWidth: 1000 });
}

function mountString(mount: ProjectMount): string {
    if (mount.value) return mount.value;
    const parts = [
        `source=${mount.source}`,
        `target=${mount.destination}`,
        `type=${mount.type ?? 'bind'}`,
    ];
    if (mount.consistency ?? mount.cached)
        parts.push(`consistency=${mount.consistency ?? 'cached'}`);
    if (mount.readOnly) parts.push('readonly');
    return parts.join(',');
}

function composeVolumeString(mount: ProjectMount): string {
    if (mount.value) return mount.value;
    const suffix = mount.readOnly
        ? ':ro'
        : mount.cached || mount.consistency
          ? `:${mount.consistency ?? 'cached'}`
          : '';
    return `${mount.source}:${mount.destination}${suffix}`;
}

function localEnvByTarget(
    local: LocalProjectConfigSelection,
    target: 'remoteEnv' | 'composeEnv',
    mode: 'plain' | 'compose'
): Record<string, string> {
    const output: Record<string, string> = {};
    for (const [key, entry] of Object.entries(local.env ?? {})) {
        const envTarget = entry.target ?? 'auto';
        const resolvedTarget =
            envTarget === 'auto' ? (mode === 'compose' ? 'composeEnv' : 'remoteEnv') : envTarget;
        if (target === resolvedTarget) output[key] = entry.value;
    }
    return output;
}

function quoteShellSingle(value: string): string {
    return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function renderShell(local: LocalProjectConfigSelection): { hook: string; init: string } | null {
    const aliases = local.shell?.aliases ?? {};
    const snippets = local.shell?.snippets ?? [];
    if (Object.keys(aliases).length === 0 && snippets.length === 0) return null;

    const initLines = [
        '#!/usr/bin/env bash',
        '# Generated by container-superposition local devcontainer amendment',
        ...Object.entries(aliases)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, command]) => `alias ${name}=${quoteShellSingle(command)}`),
        ...(snippets.length > 0 ? ['', ...snippets] : []),
        '',
    ];
    const hook = `#!/usr/bin/env bash
set -euo pipefail
BEGIN_MARKER="# >>> container-superposition local amendment shell >>>"
END_MARKER="# <<< container-superposition local amendment shell <<<"
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
SHELL_INIT_FILE="\${SCRIPT_DIR}/shell-init.sh"

install_hook() {
    local rc_file="$1"
    touch "$rc_file"
    local tmp_file
    tmp_file="$(mktemp)"
    awk -v b="$BEGIN_MARKER" -v e="$END_MARKER" '
        $0==b {skip=1; next}
        $0==e {skip=0; next}
        !skip {print}
    ' "$rc_file" > "$tmp_file"
    cat >> "$tmp_file" <<EOF
$BEGIN_MARKER
[ -f "$SHELL_INIT_FILE" ] && source "$SHELL_INIT_FILE"
$END_MARKER
EOF
    mv "$tmp_file" "$rc_file"
}

install_hook "$HOME/.bashrc"
install_hook "$HOME/.zshrc"
`;
    return { hook, init: initLines.join('\n') };
}

function appendPostCreate(config: JsonObject, command: string): JsonObject {
    const existing = config.postCreateCommand;
    const key = 'container-superposition-local';
    if (existing === undefined) return { ...config, postCreateCommand: { [key]: command } };
    if (typeof existing === 'string')
        return { ...config, postCreateCommand: { default: existing, [key]: command } };
    if (Array.isArray(existing))
        return { ...config, postCreateCommand: { default: existing, [key]: command } };
    if (existing && typeof existing === 'object')
        return { ...config, postCreateCommand: { ...existing, [key]: command } };
    throw new Error(
        'Unsupported postCreateCommand form in base devcontainer. Fix the base devcontainer before applying a local shell amendment.'
    );
}

function composeOutputs(
    model: Model,
    local: LocalProjectConfigSelection
): { files: Map<string, string>; state: AmendState } {
    const mode: AmendState['mode'] = model.base.composeFiles.length > 0 ? 'compose' : 'plain';
    let alternate = structuredClone(model.base.config) as JsonObject;
    const files = new Map<string, string>();
    const generatedArtifacts = [model.base.alternateRelPath];

    alternate.remoteEnv = deepMerge(
        alternate.remoteEnv ?? {},
        localEnvByTarget(local, 'remoteEnv', mode)
    );
    if (Object.keys(alternate.remoteEnv).length === 0) delete alternate.remoteEnv;

    const devMounts = (local.mounts ?? [])
        .filter((mount) => (mount.target ?? 'auto') !== 'composeVolume')
        .map(mountString);
    if (devMounts.length > 0) {
        alternate.mounts = [...new Set([...(alternate.mounts ?? []), ...devMounts])];
    }
    if (local.vscodeExtensions?.length) {
        alternate.customizations = deepMerge(alternate.customizations ?? {}, {
            vscode: { extensions: local.vscodeExtensions },
        });
    }
    if (local.customizations?.devcontainerPatch) {
        alternate = deepMerge(alternate, local.customizations.devcontainerPatch);
    }

    const shell = renderShell(local);
    if (shell) {
        const shellRel = `${SUPPORT_DIR_REL}/shell.sh`;
        const shellInitRel = `${SUPPORT_DIR_REL}/shell-init.sh`;
        files.set(shellRel, shell.hook);
        files.set(shellInitRel, shell.init);
        generatedArtifacts.push(shellRel, shellInitRel);
        alternate = appendPostCreate(alternate, `bash ${shellRel}`);
    }

    const composeEnv = localEnvByTarget(local, 'composeEnv', mode);
    const composeMounts = (local.mounts ?? [])
        .filter((mount) => mount.target === 'composeVolume')
        .map(composeVolumeString);
    const composeOnlyRequested =
        Object.values(local.env ?? {}).some((entry) => entry.target === 'composeEnv') ||
        (local.mounts ?? []).some((mount) => mount.target === 'composeVolume') ||
        !!local.customizations?.dockerComposePatch;
    if (mode === 'plain' && composeOnlyRequested) {
        throw new Error(
            'Compose-only amendment fields (composeEnv, composeVolume, dockerComposePatch) require a compose-backed base devcontainer.'
        );
    }
    const needsComposeOverride =
        mode === 'compose' &&
        (Object.keys(composeEnv).length > 0 ||
            composeMounts.length > 0 ||
            local.customizations?.dockerComposePatch);
    if (needsComposeOverride) {
        if (!model.base.service)
            throw new Error('Compose amendments require a base service field.');
        const overrideRel = `${SUPPORT_DIR_REL}/docker-compose.override.yml`;
        let override: JsonObject = { services: { [model.base.service]: {} } };
        if (Object.keys(composeEnv).length > 0) {
            override.services[model.base.service].environment = composeEnv;
        }
        if (composeMounts.length > 0) {
            override.services[model.base.service].volumes = [...new Set(composeMounts)];
        }
        if (local.customizations?.dockerComposePatch) {
            override = deepMerge(override, local.customizations.dockerComposePatch);
        }
        files.set(overrideRel, yaml.dump(override, { lineWidth: 1000 }));
        generatedArtifacts.push(overrideRel);
        const relativeFromBase = toPosix(
            path.relative(
                path.dirname(model.base.absPath),
                path.join(model.projectRoot, overrideRel)
            )
        );
        alternate.dockerComposeFile = [
            ...(Array.isArray(alternate.dockerComposeFile)
                ? alternate.dockerComposeFile
                : [alternate.dockerComposeFile]),
            relativeFromBase,
        ];
    }

    files.set(model.base.alternateRelPath, `${JSON.stringify(alternate, null, 4)}\n`);
    const inputContent = fs.existsSync(model.inputAbsPath)
        ? fs.readFileSync(model.inputAbsPath)
        : Buffer.from(defaultInput());
    const sortedArtifacts = [...new Set(generatedArtifacts)].sort();
    const generatedArtifactSha256 = Object.fromEntries(
        sortedArtifacts.map((artifact) => [artifact, sha256(files.get(artifact) ?? '')])
    );
    const state: AmendState = {
        formatVersion: STATE_VERSION,
        basePath: model.base.relPath,
        baseSha256: model.base.hash,
        inputSha256: sha256(inputContent),
        generatedArtifacts: sortedArtifacts,
        generatedArtifactSha256,
        mode,
    };
    return { files, state };
}

function assertSupportedAmendmentDocument(
    document: Record<string, any>,
    sourceLabel: string
): void {
    const supportedKeys = new Set([
        '$schema',
        'env',
        'mounts',
        'shell',
        'vscodeExtensions',
        'customizations',
    ]);
    const unsupportedKeys = Object.keys(document).filter((key) => !supportedKeys.has(key));
    if (unsupportedKeys.length > 0) {
        throw new Error(
            `Unsupported local amendment keys in ${sourceLabel}: ${unsupportedKeys.join(', ')}. Supported keys for amend are: ${[...supportedKeys].join(', ')}.`
        );
    }
    if (document.customizations !== undefined) {
        if (
            !document.customizations ||
            typeof document.customizations !== 'object' ||
            Array.isArray(document.customizations)
        ) {
            return;
        }
        const supportedCustomizationKeys = new Set(['devcontainerPatch', 'dockerComposePatch']);
        const unsupportedCustomizationKeys = Object.keys(document.customizations).filter(
            (key) => !supportedCustomizationKeys.has(key)
        );
        if (unsupportedCustomizationKeys.length > 0) {
            throw new Error(
                `Unsupported local amendment customizations keys in ${sourceLabel}: ${unsupportedCustomizationKeys.map((key) => `customizations.${key}`).join(', ')}. Supported customizations keys for amend are: customizations.devcontainerPatch, customizations.dockerComposePatch.`
            );
        }
    }
}

function parseInput(model: Model, useDefaultWhenMissing = false): LocalProjectConfigSelection {
    if (!fs.existsSync(model.inputAbsPath)) {
        if (useDefaultWhenMissing) return parseLocalProjectConfigDocument({}, model.inputRelPath);
        throw new Error(
            `Missing local amendment input ${model.inputRelPath}. Run amend init first.`
        );
    }
    let parsed: unknown;
    try {
        parsed = yaml.load(fs.readFileSync(model.inputAbsPath, 'utf8')) ?? {};
    } catch (error) {
        throw new Error(
            `Failed to parse ${model.inputRelPath}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${model.inputRelPath} must be a YAML object`);
    }
    const document = parsed as Record<string, any>;
    assertSupportedAmendmentDocument(document, model.inputRelPath);
    return parseLocalProjectConfigDocument(document, model.inputRelPath);
}

function applyOutputs(model: Model, files: Map<string, string>, state: AmendState): void {
    validateApplyPlan(model, files, state);
    const allArtifacts = new Set([
        ...state.generatedArtifacts,
        ...(model.state?.generatedArtifacts ?? []),
    ]);
    const backups = new Map<string, Buffer | null>();
    const tempFiles: string[] = [];
    try {
        for (const artifact of allArtifacts) {
            const abs = validateArtifactPath(model, artifact);
            backups.set(artifact, fs.existsSync(abs) ? fs.readFileSync(abs) : null);
        }
        for (const [fileRel, content] of files) {
            const abs = validateArtifactPath(model, fileRel);
            fs.mkdirSync(path.dirname(abs), { recursive: true });
            const tmp = `${abs}.tmp-${process.pid}`;
            ensureNoSymlinkComponents(model.projectRoot, tmp);
            fs.writeFileSync(tmp, content);
            tempFiles.push(tmp);
        }
        for (const oldRel of model.state?.generatedArtifacts ?? []) {
            if (!files.has(oldRel)) fs.rmSync(validateArtifactPath(model, oldRel), { force: true });
        }
        for (const [fileRel] of files) {
            const abs = validateArtifactPath(model, fileRel);
            fs.renameSync(`${abs}.tmp-${process.pid}`, abs);
            if (process.env.CS_AMEND_INJECT_REFRESH_FAILURE_AFTER_WRITES === '1') {
                throw new Error('Injected amend refresh failure after artifact writes.');
            }
        }
        writeAtomic(model.stateAbsPath, `${JSON.stringify(state, null, 4)}\n`);
    } catch (error) {
        for (const tmp of tempFiles) fs.rmSync(tmp, { force: true });
        for (const [artifact, content] of backups) {
            const abs = validateArtifactPath(model, artifact);
            if (content === null) fs.rmSync(abs, { force: true });
            else {
                fs.mkdirSync(path.dirname(abs), { recursive: true });
                fs.writeFileSync(abs, content);
            }
        }
        throw error;
    }
}

function validateApplyPlan(model: Model, files: Map<string, string>, state: AmendState): void {
    for (const artifact of state.generatedArtifacts) validateArtifactPath(model, artifact);
    for (const artifact of files.keys()) validateArtifactPath(model, artifact);
    const owned = new Set(model.state?.generatedArtifacts ?? []);
    for (const [fileRel, content] of files) {
        const abs = validateArtifactPath(model, fileRel);
        if (!fs.existsSync(abs)) continue;
        if (!model.state) {
            throw new Error(`Refusing to overwrite unowned local amendment path: ${fileRel}`);
        }
        const existing = fs.readFileSync(abs);
        const expectedHash = model.state.generatedArtifactSha256[fileRel];
        const isOwned = owned.has(fileRel) && expectedHash === sha256(existing);
        if (!isOwned) {
            throw new Error(`Refusing to overwrite unowned local amendment path: ${fileRel}`);
        }
    }
    if (model.state) {
        for (const oldRel of model.state.generatedArtifacts) {
            validateArtifactPath(model, oldRel);
            const abs = path.join(model.projectRoot, oldRel);
            if (!fs.existsSync(abs)) continue;
            if (model.state.generatedArtifactSha256[oldRel] !== sha256(fs.readFileSync(abs))) {
                throw new Error(`Refusing to replace modified receipt-owned artifact: ${oldRel}`);
            }
        }
    }
}

function quotePosixShellArg(value: string): string {
    if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function formatLaunchCommand(model: Model): string {
    const cwd = fs.realpathSync(process.cwd());
    const fromProjectRoot = cwd === model.projectRoot;
    const workspaceFolder = fromProjectRoot ? '.' : model.projectRoot;
    const configPath = fromProjectRoot ? model.base.alternateRelPath : model.base.alternateAbsPath;
    return `devcontainer up --workspace-folder ${quotePosixShellArg(workspaceFolder)} --config ${quotePosixShellArg(configPath)}`;
}

function printSummary(action: string, model: Model, state: AmendState): void {
    console.log(chalk.green(`✓ Local devcontainer amendment ${action}`));
    console.log(`Team-owned base: ${model.base.relPath}`);
    console.log(`Personal local input: ${model.inputRelPath}`);
    console.log(`Generated alternate config: ${model.base.alternateRelPath}`);
    console.log(`Launch with: ${formatLaunchCommand(model)}`);
    console.log(
        `Ownership: the base devcontainer remains team-owned; the amendment is personal and uncommitted. Use adopt only for team migration.`
    );
    if (!model.git.inGit)
        console.log(chalk.yellow('Git protection: unavailable (not a Git worktree).'));
    else console.log(`Git protection: ${model.git.excludePath}`);
    void state;
}

export async function amendCommand(action: AmendAction, options: AmendOptions = {}): Promise<void> {
    const model = resolveModel(options);
    if (action === 'inspect') {
        inspect(model, options);
        return;
    }
    if (action === 'remove') {
        remove(model, options.purge === true);
        return;
    }
    if (action === 'init' && model.state) {
        throw new Error(
            `Local amendment state already exists at ${model.stateRelPath}. Use amend refresh to update it.`
        );
    }
    ensureLocalStatePathSafe(model);
    const local = parseInput(model, action === 'init');
    const { files, state } = composeOutputs(model, local);
    validateApplyPlan(model, files, state);
    ensureGitProtection(model);
    if (action === 'init' && !fs.existsSync(model.inputAbsPath)) {
        writeAtomic(model.inputAbsPath, defaultInput());
    }
    applyOutputs(model, files, state);
    printSummary(action === 'init' ? 'initialized' : 'refreshed', model, state);
}

function inspect(model: Model, options: AmendOptions): void {
    const inputHash = fs.existsSync(model.inputAbsPath)
        ? sha256(fs.readFileSync(model.inputAbsPath))
        : null;
    const artifactStatuses = (model.state?.generatedArtifacts ?? []).map((artifact) => {
        const artifactPath = path.join(model.projectRoot, artifact);
        const exists = fs.existsSync(artifactPath);
        const actualSha256 = exists ? sha256(fs.readFileSync(artifactPath)) : null;
        const expectedSha256 = model.state?.generatedArtifactSha256[artifact] ?? null;
        return {
            path: artifact,
            exists,
            expectedSha256,
            actualSha256,
            status: !exists ? 'missing' : expectedSha256 === actualSha256 ? 'current' : 'modified',
        };
    });
    const status = !model.state
        ? 'not initialized'
        : model.state.baseSha256 !== model.base.hash
          ? 'base changed — refresh required'
          : artifactStatuses.some((entry) => entry.status === 'missing')
            ? 'missing artifact'
            : artifactStatuses.some((entry) => entry.status === 'modified')
              ? 'modified artifact'
              : model.state.inputSha256 !== inputHash
                ? 'input changed — refresh required'
                : model.git.tracked.length > 0
                  ? 'unsafe/tracked'
                  : model.git.inGit && model.git.ignoreProvenance.some((entry) => !entry.expected)
                    ? 'unsafe/git protection missing or wrong'
                    : 'current';
    const result = {
        status,
        ownership: {
            teamBase: model.base.relPath,
            personalInput: model.inputRelPath,
            adoptMeansTeamMigration: true,
        },
        base: {
            path: model.base.relPath,
            sha256: model.base.hash,
            composeFiles: model.base.composeFiles,
            service: model.base.service,
        },
        input: {
            path: model.inputRelPath,
            exists: fs.existsSync(model.inputAbsPath),
            sha256: inputHash,
        },
        state: model.state,
        artifacts: artifactStatuses,
        git: {
            inGit: model.git.inGit,
            excludePath: model.git.excludePath,
            tracked: model.git.tracked,
            ignoreProvenance: model.git.ignoreProvenance,
        },
        launchCommand: formatLaunchCommand(model),
    };
    if (options.json) {
        console.log(JSON.stringify(result, null, 4));
        return;
    }
    console.log(`Local devcontainer amendment: ${status}`);
    console.log(`Team-owned base: ${model.base.relPath}`);
    console.log(`Personal local input: ${model.inputRelPath}`);
    console.log(`Generated alternate config: ${model.base.alternateRelPath}`);
    console.log(`Launch with: ${result.launchCommand}`);
    console.log(
        'Ownership: existing devcontainer = team-owned base; local amendment = personal uncommitted layer; adopt = team migration path.'
    );
    if (!model.git.inGit && model.git.warning) {
        console.log(chalk.yellow(`Git protection warning: ${model.git.warning}`));
    }
    if (model.git.tracked.length > 0)
        console.log(chalk.red(`Tracked local paths: ${model.git.tracked.join(', ')}`));
    if (model.git.inGit) {
        const missingOrWrong = model.git.ignoreProvenance.filter((entry) => !entry.expected);
        if (missingOrWrong.length > 0) {
            console.log(
                chalk.yellow(
                    `Git protection warning: expected worktree-local excludes for ${missingOrWrong
                        .map((entry) => `${entry.path} (${entry.source ?? 'no ignore rule'})`)
                        .join(', ')}`
                )
            );
        }
    }
}

function remove(model: Model, purge: boolean): void {
    if (!model.state) throw new Error(`No local amendment receipt found at ${model.stateRelPath}.`);
    if (model.git.tracked.length > 0) {
        throw new Error(
            `Refusing to remove while local amendment paths are tracked by Git: ${model.git.tracked.join(', ')}. Untrack them first: git rm --cached -- ${model.git.tracked.join(' ')}`
        );
    }
    validateRemovalOwnership(model);
    for (const artifact of model.state.generatedArtifacts) {
        fs.rmSync(validateArtifactPath(model, artifact), { force: true });
    }
    ensureNoSymlinkComponents(model.projectRoot, model.stateAbsPath);
    fs.rmSync(model.stateAbsPath, { force: true });
    if (purge) {
        console.log(
            `Purging personal input and command-owned local exclude block for ${model.inputRelPath}`
        );
        ensureNoSymlinkComponents(model.projectRoot, model.inputAbsPath);
        fs.rmSync(model.inputAbsPath, { force: true });
        for (const dir of [model.supportDirAbsPath, path.join(model.projectRoot, LOCAL_DIR)]) {
            try {
                fs.rmdirSync(dir);
            } catch {
                // Keep non-empty local directories; they may contain user files.
            }
        }
        const localDirStillExists = fs.existsSync(path.join(model.projectRoot, LOCAL_DIR));
        if (model.git.excludePath) {
            const block = getExactGitignoreBlock(EXCLUDE_SECTION, [
                `/${LOCAL_DIR}/`,
                `/${model.base.alternateRelPath}`,
            ]);
            if (localDirStillExists) {
                console.log(
                    `Retaining local Git exclude block because ${LOCAL_DIR}/ still exists with user-managed content.`
                );
            } else {
                removeExactGitignoreBlock(model.git.excludePath, block);
            }
        }
    }
    console.log(chalk.green('✓ Local devcontainer amendment removed'));
    console.log(`Team-owned base remains unchanged: ${model.base.relPath}`);
    if (!purge) console.log(`Personal input retained: ${model.inputRelPath}`);
}

function validateRemovalOwnership(model: Model): void {
    if (!model.state) return;
    for (const artifact of model.state.generatedArtifacts) {
        const abs = validateArtifactPath(model, artifact);
        if (!fs.existsSync(abs)) continue;
        const actualHash = sha256(fs.readFileSync(abs));
        if (model.state.generatedArtifactSha256[artifact] !== actualHash) {
            throw new Error(`Refusing to remove modified or unowned artifact: ${artifact}`);
        }
    }
}
