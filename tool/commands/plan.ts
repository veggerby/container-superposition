/**
 * Plan command - Preview what will happen before generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import type { OverlayMetadata, OverlaysConfig, Stack } from '../schema/types.js';
import { extractPorts } from '../utils/port-utils.js';
import { deepMerge } from '../utils/merge.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve TEMPLATES_DIR that works in both source and compiled output
const TEMPLATES_DIR_CANDIDATES = [
    path.join(__dirname, '..', '..', 'templates'), // From source: tool/commands -> root
    path.join(__dirname, '..', '..', '..', 'templates'), // From dist: dist/tool/commands -> root
];
const TEMPLATES_DIR =
    TEMPLATES_DIR_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ??
    TEMPLATES_DIR_CANDIDATES[0];

interface PlanOptions {
    stack?: Stack;
    overlays?: string;
    portOffset?: number;
    json?: boolean;
    diff?: boolean;
    output?: string;
    diffFormat?: string;
    diffContext?: number;
}

// ─── Diff types ────────────────────────────────────────────────────────────────

interface FileDiffEntry {
    path: string;
    diff?: string; // unified diff output (present when content differs)
}

interface OverlayChange {
    id: string;
    name?: string;
    category?: string;
}

interface PortChange {
    overlay: string;
    port: number;
}

export interface PlanDiffResult {
    existingPath: string;
    hasExistingConfig: boolean;
    created: string[];
    modified: FileDiffEntry[];
    unchanged: string[];
    preserved: string[];
    removed: string[];
    overlayChanges: {
        added: OverlayChange[];
        removed: OverlayChange[];
        unchanged: string[];
    };
    portChanges: {
        added: PortChange[];
        removed: PortChange[];
    };
}

// ─── Unified diff helpers ───────────────────────────────────────────────────

type EditType = 'equal' | 'insert' | 'delete';

interface Edit {
    type: EditType;
    value: string;
}

/**
 * Compute a line-level LCS diff between two string arrays.
 * Returns an array of edits (equal / insert / delete).
 */
function computeLineDiff(a: string[], b: string[]): Edit[] {
    const m = a.length;
    const n = b.length;

    // dp[i][j] = length of LCS of a[0..i-1] and b[0..j-1]
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Trace back to build edit list
    const edits: Edit[] = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            edits.unshift({ type: 'equal', value: a[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            edits.unshift({ type: 'insert', value: b[j - 1] });
            j--;
        } else {
            edits.unshift({ type: 'delete', value: a[i - 1] });
            i--;
        }
    }

    return edits;
}

/**
 * Format a list of edits as a unified diff string.
 */
function formatUnifiedDiff(
    edits: Edit[],
    fileNameA: string,
    fileNameB: string,
    contextLines = 3
): string {
    const lines: string[] = [];
    lines.push(`--- ${fileNameA}`);
    lines.push(`+++ ${fileNameB}`);

    // Identify hunk boundaries: positions with changes plus context
    const changePositions = new Set<number>();
    for (let k = 0; k < edits.length; k++) {
        if (edits[k].type !== 'equal') {
            for (let ctx = Math.max(0, k - contextLines); ctx <= k + contextLines; ctx++) {
                changePositions.add(ctx);
            }
        }
    }

    if (changePositions.size === 0) {
        return ''; // No changes
    }

    let inHunk = false;
    let hunkStart = -1;
    let hunkLines: string[] = [];
    let oldLine = 1;
    let newLine = 1;
    let hunkOldStart = 1;
    let hunkNewStart = 1;
    let hunkOldCount = 0;
    let hunkNewCount = 0;

    const flushHunk = () => {
        if (hunkLines.length > 0) {
            lines.push(`@@ -${hunkOldStart},${hunkOldCount} +${hunkNewStart},${hunkNewCount} @@`);
            lines.push(...hunkLines);
        }
        hunkLines = [];
        hunkOldCount = 0;
        hunkNewCount = 0;
        inHunk = false;
    };

    for (let k = 0; k < edits.length; k++) {
        const edit = edits[k];
        const inContext = changePositions.has(k);

        if (inContext) {
            if (!inHunk) {
                hunkOldStart = oldLine;
                hunkNewStart = newLine;
                inHunk = true;
                hunkStart = k;
            }

            if (edit.type === 'equal') {
                hunkLines.push(` ${edit.value}`);
                hunkOldCount++;
                hunkNewCount++;
                oldLine++;
                newLine++;
            } else if (edit.type === 'delete') {
                hunkLines.push(`-${edit.value}`);
                hunkOldCount++;
                oldLine++;
            } else {
                hunkLines.push(`+${edit.value}`);
                hunkNewCount++;
                newLine++;
            }
        } else {
            if (inHunk) {
                flushHunk();
            }
            if (edit.type === 'equal') {
                oldLine++;
                newLine++;
            } else if (edit.type === 'delete') {
                oldLine++;
            } else {
                newLine++;
            }
        }
    }

    if (inHunk) {
        flushHunk();
    }

    return lines.join('\n');
}

/**
 * Generate a unified diff between two text strings.
 * Returns empty string if files are identical.
 */
function generateUnifiedDiff(
    oldContent: string,
    newContent: string,
    filePath: string,
    contextLines = 3
): string {
    if (oldContent === newContent) return '';

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const edits = computeLineDiff(oldLines, newLines);

    return formatUnifiedDiff(edits, `a/${filePath}`, `b/${filePath}`, contextLines);
}

// ─── Planned content helpers ────────────────────────────────────────────────

/**
 * Compute the approximate planned devcontainer.json content by loading the
 * base template and applying each overlay's devcontainer.patch.json.
 * This mirrors the core of composeDevContainer without writing to disk.
 */
function computePlannedDevcontainerJson(
    stack: Stack,
    overlayIds: string[],
    overlaysDir: string
): string | null {
    try {
        const basePath = path.join(TEMPLATES_DIR, stack, '.devcontainer', 'devcontainer.json');
        if (!fs.existsSync(basePath)) return null;

        let config: Record<string, unknown> = JSON.parse(fs.readFileSync(basePath, 'utf8'));

        for (const id of overlayIds) {
            const patchPath = path.join(overlaysDir, id, 'devcontainer.patch.json');
            if (!fs.existsSync(patchPath)) continue;

            const patch: Record<string, unknown> = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

            // Remove schema field (not part of generated output)
            delete patch.$schema;

            config = deepMerge(config, patch);
        }

        return JSON.stringify(config, null, 2);
    } catch {
        return null;
    }
}

// ─── Diff generation ─────────────────────────────────────────────────────────

/**
 * Generate a PlanDiffResult comparing planned overlays/files against an existing
 * .devcontainer/ directory.
 */
export function generatePlanDiff(
    plan: {
        stack: Stack;
        selectedOverlays: string[];
        autoAddedOverlays: string[];
        portMappings: Array<{ overlay: string; ports: number[]; offsetPorts: number[] }>;
        files: string[];
    },
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    existingPath: string,
    contextLines = 3
): PlanDiffResult {
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const allPlannedOverlays = [
        ...plan.selectedOverlays,
        ...plan.autoAddedOverlays.filter((id) => !plan.selectedOverlays.includes(id)),
    ];

    // ── Read existing superposition.json ──────────────────────────────────────
    const existsDir = fs.existsSync(existingPath);
    const manifestPath = path.join(existingPath, 'superposition.json');
    let existingOverlays: string[] = [];
    let existingPorts: PortChange[] = [];

    if (existsDir && fs.existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            existingOverlays = Array.isArray(manifest.overlays) ? manifest.overlays : [];
        } catch {
            // ignore parse errors
        }
    }

    // ── Overlay changes ───────────────────────────────────────────────────────
    const plannedSet = new Set(allPlannedOverlays);
    const existingSet = new Set(existingOverlays);

    const addedOverlays: OverlayChange[] = allPlannedOverlays
        .filter((id) => !existingSet.has(id))
        .map((id) => {
            const meta = overlayMap.get(id);
            return { id, name: meta?.name, category: meta?.category };
        });

    const removedOverlays: OverlayChange[] = existingOverlays
        .filter((id) => !plannedSet.has(id))
        .map((id) => {
            const meta = overlayMap.get(id);
            return { id, name: meta?.name, category: meta?.category };
        });

    const unchangedOverlays = allPlannedOverlays.filter((id) => existingSet.has(id));

    // ── Port changes ─────────────────────────────────────────────────────────
    const existingPortSet = new Set<string>();
    for (const id of existingOverlays) {
        const meta = overlayMap.get(id);
        if (meta) {
            for (const p of extractPorts([meta])) {
                existingPortSet.add(`${id}:${p}`);
                existingPorts.push({ overlay: id, port: p });
            }
        }
    }

    const addedPorts: PortChange[] = [];
    const removedPorts: PortChange[] = [];
    const plannedPortSet = new Set<string>();

    for (const mapping of plan.portMappings) {
        for (const p of mapping.ports) {
            plannedPortSet.add(`${mapping.overlay}:${p}`);
            if (!existingPortSet.has(`${mapping.overlay}:${p}`)) {
                addedPorts.push({ overlay: mapping.overlay, port: p });
            }
        }
    }

    for (const ep of existingPorts) {
        if (!plannedPortSet.has(`${ep.overlay}:${ep.port}`)) {
            removedPorts.push(ep);
        }
    }

    // ── File status ──────────────────────────────────────────────────────────
    const created: string[] = [];
    const modified: FileDiffEntry[] = [];
    const unchanged: string[] = [];

    // Use relative paths for display: prefer cwd-relative paths but fall back to
    // paths relative to existingPath's parent (e.g., ".devcontainer/file.json").
    const existingParent = path.dirname(path.resolve(existingPath));
    const relFiles = plan.files.map((f) => {
        const abs = path.isAbsolute(f) ? f : path.resolve(f);
        const cwdRel = path.relative(process.cwd(), abs);
        // Use cwd-relative path only if it doesn't go upwards
        if (!cwdRel.startsWith('..')) return cwdRel;
        // Fall back to path relative to parent of existingPath
        return path.relative(existingParent, abs);
    });

    for (let idx = 0; idx < plan.files.length; idx++) {
        const absFile = plan.files[idx];
        const relFile = relFiles[idx];

        if (!fs.existsSync(absFile)) {
            created.push(relFile);
            continue;
        }

        // File exists – check if content would change
        // We only compute actual diffs for devcontainer.json
        const basename = path.basename(absFile);
        if (basename === 'devcontainer.json') {
            const existingContent = fs.readFileSync(absFile, 'utf8');
            const plannedContent = computePlannedDevcontainerJson(
                plan.stack,
                allPlannedOverlays,
                overlaysDir
            );

            if (plannedContent === null) {
                modified.push({ path: relFile });
            } else if (plannedContent.trimEnd() === existingContent.trimEnd()) {
                unchanged.push(relFile);
            } else {
                const diff = generateUnifiedDiff(
                    existingContent.trimEnd(),
                    plannedContent.trimEnd(),
                    relFile,
                    contextLines
                );
                modified.push({ path: relFile, diff: diff || undefined });
            }
        } else {
            // For all other files, mark as "modified" without a content diff
            modified.push({ path: relFile });
        }
    }

    // ── Preserved custom files ────────────────────────────────────────────────
    const preserved: string[] = [];
    const customDir = path.join(existingPath, 'custom');
    if (fs.existsSync(customDir)) {
        try {
            const entries = fs.readdirSync(customDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile()) {
                    const abs = path.join(customDir, entry.name);
                    const cwdRel = path.relative(process.cwd(), abs);
                    preserved.push(
                        cwdRel.startsWith('..') ? path.relative(existingParent, abs) : cwdRel
                    );
                }
            }
        } catch {
            // ignore
        }
    }

    // ── Removed files (exist in existing dir but not in plan) ────────────────
    const removed: string[] = [];
    if (existsDir) {
        try {
            const existingFiles = fs.readdirSync(existingPath, { withFileTypes: true });
            const plannedBasenames = new Set(plan.files.map((f) => path.basename(f)));
            // Skip files that are user-managed (superposition.json, .env) or not
            // tracked as plain files (custom/ directory, ports.json documentation)
            const skipFiles = new Set(['superposition.json', '.env', 'custom', 'ports.json']);

            for (const entry of existingFiles) {
                if (
                    entry.isFile() &&
                    !skipFiles.has(entry.name) &&
                    !plannedBasenames.has(entry.name)
                ) {
                    const abs = path.join(existingPath, entry.name);
                    const cwdRel = path.relative(process.cwd(), abs);
                    removed.push(
                        cwdRel.startsWith('..') ? path.relative(existingParent, abs) : cwdRel
                    );
                }
            }
        } catch {
            // ignore
        }
    }

    return {
        existingPath,
        hasExistingConfig: existsDir,
        created,
        modified,
        unchanged,
        preserved,
        removed,
        overlayChanges: {
            added: addedOverlays,
            removed: removedOverlays,
            unchanged: unchangedOverlays,
        },
        portChanges: {
            added: addedPorts,
            removed: removedPorts,
        },
    };
}

// ─── Diff formatter ───────────────────────────────────────────────────────────

/**
 * Format a PlanDiffResult as colored terminal text.
 */
function formatDiffAsText(diff: PlanDiffResult, contextLines = 3): string {
    const sep = chalk.dim('─'.repeat(57));
    const lines: string[] = [];

    lines.push('');
    lines.push(
        boxen(chalk.bold('📋 Plan Diff'), {
            padding: 0.5,
            borderColor: 'cyan',
            borderStyle: 'round',
        })
    );

    if (!diff.hasExistingConfig) {
        lines.push('');
        lines.push(
            chalk.yellow(`  ⚠  No existing configuration found at ${chalk.bold(diff.existingPath)}`)
        );
        lines.push(chalk.dim('  All files will be created fresh.'));
        lines.push('');
    } else {
        lines.push('');
        lines.push(chalk.dim(`  Comparing planned output vs ${chalk.bold(diff.existingPath)}`));
        lines.push('');
    }

    // ── File summary ─────────────────────────────────────────────────────────
    if (diff.created.length > 0) {
        lines.push(chalk.bold.green('Files to be created:'));
        for (const f of diff.created) {
            lines.push(`  ${chalk.green('+')} ${f} ${chalk.dim('(no existing file)')}`);
        }
        lines.push('');
    }

    if (diff.modified.length > 0) {
        lines.push(chalk.bold.yellow('Files to be modified:'));
        for (const f of diff.modified) {
            lines.push(`  ${chalk.yellow('~')} ${f.path}`);
        }
        lines.push('');
    }

    if (diff.unchanged.length > 0) {
        lines.push(chalk.bold('Files unchanged:'));
        for (const f of diff.unchanged) {
            lines.push(`  ${chalk.gray('=')} ${chalk.dim(f)}`);
        }
        lines.push('');
    }

    if (diff.preserved.length > 0) {
        lines.push(chalk.bold('Files preserved (custom):'));
        for (const f of diff.preserved) {
            lines.push(`  ${chalk.cyan('•')} ${f}`);
        }
        lines.push('');
    }

    if (diff.removed.length > 0) {
        lines.push(chalk.bold.red('Files to be removed:'));
        for (const f of diff.removed) {
            lines.push(`  ${chalk.red('-')} ${f}`);
        }
        lines.push('');
    }

    // ── File content diffs ────────────────────────────────────────────────────
    const withDiff = diff.modified.filter((f) => f.diff);
    if (withDiff.length > 0) {
        lines.push(sep);

        for (const f of withDiff) {
            lines.push('');
            lines.push(chalk.bold(`📄 ${path.basename(f.path)} diff`));
            lines.push('');

            for (const line of f.diff!.split('\n')) {
                if (line.startsWith('---') || line.startsWith('+++')) {
                    lines.push(chalk.dim(line));
                } else if (line.startsWith('@@')) {
                    lines.push(chalk.cyan(line));
                } else if (line.startsWith('+')) {
                    lines.push(chalk.green(line));
                } else if (line.startsWith('-')) {
                    lines.push(chalk.red(line));
                } else {
                    lines.push(chalk.dim(line));
                }
            }
            lines.push('');
        }
    }

    // ── Overlay changes ───────────────────────────────────────────────────────
    const { overlayChanges, portChanges } = diff;
    const hasOverlayChanges = overlayChanges.added.length > 0 || overlayChanges.removed.length > 0;

    if (diff.hasExistingConfig && hasOverlayChanges) {
        lines.push(sep);
        lines.push('');
        lines.push(chalk.bold('📦 Overlays'));
        lines.push('');

        if (overlayChanges.added.length > 0) {
            lines.push(chalk.bold('Added:'));
            for (const o of overlayChanges.added) {
                const cat = o.category ? chalk.dim(` (${o.category})`) : '';
                lines.push(`  ${chalk.green('+')} ${chalk.cyan(o.id)}${cat}`);
            }
            lines.push('');
        }

        if (overlayChanges.removed.length > 0) {
            lines.push(chalk.bold('Removed:'));
            for (const o of overlayChanges.removed) {
                const cat = o.category ? chalk.dim(` (${o.category})`) : '';
                lines.push(`  ${chalk.red('-')} ${chalk.cyan(o.id)}${cat}`);
            }
            lines.push('');
        }
    }

    // ── Port changes ──────────────────────────────────────────────────────────
    const hasPortChanges = portChanges.added.length > 0 || portChanges.removed.length > 0;

    if (diff.hasExistingConfig && hasPortChanges) {
        lines.push(sep);
        lines.push('');
        lines.push(chalk.bold('🌐 Port changes'));
        lines.push('');

        if (portChanges.added.length > 0) {
            lines.push(chalk.bold('Added:'));
            for (const p of portChanges.added) {
                lines.push(`  ${chalk.green('+')} ${chalk.cyan(p.overlay)}: ${p.port}`);
            }
            lines.push('');
        }

        if (portChanges.removed.length > 0) {
            lines.push(chalk.bold('Removed:'));
            for (const p of portChanges.removed) {
                lines.push(`  ${chalk.red('-')} ${chalk.cyan(p.overlay)}: ${p.port}`);
            }
            lines.push('');
        }
    }

    lines.push(sep);

    return lines.join('\n');
}

/**
 * Resolve dependencies recursively
 */
function resolveDependencies(
    selectedIds: string[],
    overlaysConfig: OverlaysConfig
): {
    resolved: string[];
    autoAdded: string[];
} {
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const resolved = new Set<string>(selectedIds);
    const autoAdded: string[] = [];

    const processDeps = (id: string) => {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.requires) return;

        for (const reqId of overlay.requires) {
            if (!resolved.has(reqId)) {
                resolved.add(reqId);
                autoAdded.push(reqId);
                processDeps(reqId); // Recursive
            }
        }
    };

    for (const id of selectedIds) {
        processDeps(id);
    }

    return {
        resolved: Array.from(resolved),
        autoAdded,
    };
}

/**
 * Detect conflicts in selected overlays
 */
function detectConflicts(
    overlayIds: string[],
    overlaysConfig: OverlaysConfig
): Array<{ overlay: string; conflictsWith: string[] }> {
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const conflicts: Array<{ overlay: string; conflictsWith: string[] }> = [];

    for (const id of overlayIds) {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.conflicts || overlay.conflicts.length === 0) continue;

        const conflicting = overlay.conflicts.filter((c) => overlayIds.includes(c));
        if (conflicting.length > 0) {
            conflicts.push({
                overlay: id,
                conflictsWith: conflicting,
            });
        }
    }

    return conflicts;
}

/**
 * Get all files that will be created/modified
 */
function getFilesToCreate(overlayIds: string[], overlaysDir: string, outputPath: string): string[] {
    const files: string[] = [];

    // Base devcontainer files
    files.push(path.join(outputPath, 'devcontainer.json'));
    files.push(path.join(outputPath, 'superposition.json'));
    files.push(path.join(outputPath, 'README.md'));

    // Check if any overlay has .env.example
    let hasEnvExample = false;
    for (const id of overlayIds) {
        const envPath = path.join(overlaysDir, id, '.env.example');
        if (fs.existsSync(envPath)) {
            hasEnvExample = true;
            break;
        }
    }
    if (hasEnvExample) {
        files.push(path.join(outputPath, '.env.example'));
    }

    // Check for docker-compose
    for (const id of overlayIds) {
        const composePath = path.join(overlaysDir, id, 'docker-compose.yml');
        if (fs.existsSync(composePath)) {
            files.push(path.join(outputPath, 'docker-compose.yml'));
            break;
        }
    }

    // Check if we need scripts directory
    const hasScripts = overlayIds.some(
        (id) =>
            fs.existsSync(path.join(overlaysDir, id, 'setup.sh')) ||
            fs.existsSync(path.join(overlaysDir, id, 'verify.sh'))
    );

    // Overlay-specific files (mirroring composer behavior)
    for (const id of overlayIds) {
        const overlayDir = path.join(overlaysDir, id);
        if (!fs.existsSync(overlayDir)) continue;

        const overlayEntries = fs.readdirSync(overlayDir, { withFileTypes: true });
        for (const entry of overlayEntries) {
            const name = entry.name;

            // Setup and verify scripts are copied into .devcontainer/scripts with overlay suffix
            if (entry.isFile() && name.startsWith('setup') && name.endsWith('.sh')) {
                files.push(path.join(outputPath, 'scripts', `setup-${id}.sh`));
            }
            if (entry.isFile() && name.startsWith('verify') && name.endsWith('.sh')) {
                files.push(path.join(outputPath, 'scripts', `verify-${id}.sh`));
            }

            // Global packages/tools files and directories get an <overlay> suffix
            if (name.startsWith('global-')) {
                if (entry.isFile()) {
                    const ext = path.extname(name);
                    const base = ext.length > 0 ? name.slice(0, -ext.length) : name;
                    const targetName = `${base}-${id}${ext}`;
                    files.push(path.join(outputPath, targetName));
                } else if (entry.isDirectory()) {
                    const targetName = `${name}-${id}`;
                    files.push(path.join(outputPath, targetName));
                }
            }
        }
    }

    // Deduplicate and sort
    return Array.from(new Set(files)).sort();
}

/**
 * Get port mappings with offset applied
 */
function getPortMappings(
    overlayIds: string[],
    overlaysConfig: OverlaysConfig,
    portOffset: number
): Array<{ overlay: string; ports: number[]; offsetPorts: number[] }> {
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const mappings: Array<{ overlay: string; ports: number[]; offsetPorts: number[] }> = [];

    for (const id of overlayIds) {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.ports || overlay.ports.length === 0) continue;

        // Extract numeric ports from overlay
        const ports = extractPorts([overlay]);

        mappings.push({
            overlay: id,
            ports: ports,
            offsetPorts: ports.map((p) => p + portOffset),
        });
    }

    return mappings;
}

/**
 * Format plan as text
 */
function formatAsText(
    plan: {
        stack: Stack;
        selectedOverlays: string[];
        autoAddedOverlays: string[];
        conflicts: Array<{ overlay: string; conflictsWith: string[] }>;
        portMappings: Array<{ overlay: string; ports: number[]; offsetPorts: number[] }>;
        files: string[];
        portOffset: number;
    },
    overlaysConfig: OverlaysConfig
): string {
    const lines: string[] = [];
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));

    lines.push(
        boxen(chalk.bold('Generation Plan'), {
            padding: 0.5,
            borderColor: 'cyan',
            borderStyle: 'round',
        })
    );

    // Stack
    lines.push('');
    lines.push(chalk.bold('Stack:') + ` ${plan.stack}`);

    // Overlays
    lines.push('');
    lines.push(chalk.bold('Overlays Selected:'));
    for (const id of plan.selectedOverlays) {
        const overlay = overlayMap.get(id);
        const name = overlay ? ` (${overlay.name})` : '';
        lines.push(`  ✓ ${chalk.cyan(id)}${chalk.gray(name)}`);
    }

    // Auto-added dependencies
    if (plan.autoAddedOverlays.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Auto-Added Dependencies:'));
        for (const id of plan.autoAddedOverlays) {
            const overlay = overlayMap.get(id);
            const name = overlay ? ` (${overlay.name})` : '';
            lines.push(`  ${chalk.yellow('+')} ${chalk.cyan(id)}${chalk.gray(name)}`);
        }
    }

    // Conflicts
    if (plan.conflicts.length > 0) {
        lines.push('');
        lines.push(chalk.bold.red('⚠ Conflicts Detected:'));
        for (const conflict of plan.conflicts) {
            lines.push(
                `  ${chalk.red('✗')} ${chalk.cyan(conflict.overlay)} conflicts with: ${conflict.conflictsWith.join(', ')}`
            );
        }
        lines.push('');
        lines.push(chalk.yellow('  These conflicts must be resolved before generation.'));
    }

    // Port mappings
    if (plan.portMappings.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Port Mappings:'));
        if (plan.portOffset > 0) {
            lines.push(chalk.dim(`  (Offset: +${plan.portOffset})`));
        }
        for (const mapping of plan.portMappings) {
            for (let i = 0; i < mapping.ports.length; i++) {
                const original = mapping.ports[i];
                const offset = mapping.offsetPorts[i];
                const arrow = plan.portOffset > 0 ? ` → ${offset}` : '';
                lines.push(`  ${chalk.cyan(mapping.overlay)}: ${original}${arrow}`);
            }
        }
    }

    // Files
    lines.push('');
    lines.push(chalk.bold('Files to Create/Modify:'));
    const grouped = new Map<string, string[]>();
    for (const file of plan.files) {
        const dir = path.dirname(file);
        if (!grouped.has(dir)) {
            grouped.set(dir, []);
        }
        grouped.get(dir)!.push(path.basename(file));
    }

    for (const [dir, files] of grouped) {
        lines.push(`  ${chalk.dim(dir)}/`);
        for (const file of files) {
            lines.push(`    📄 ${file}`);
        }
    }

    return lines.join('\n');
}

/**
 * Execute plan command
 */
export async function planCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: PlanOptions
) {
    try {
        // Validate required options
        if (!options.stack) {
            console.error(chalk.red('✗ --stack is required for plan command'));
            console.log(
                chalk.dim(
                    '  Example: container-superposition plan --stack compose --overlays postgres,grafana'
                )
            );
            process.exit(1);
        }

        // Validate stack value
        const validStacks: Stack[] = ['plain', 'compose'];
        if (!validStacks.includes(options.stack)) {
            console.error(chalk.red(`✗ Invalid --stack value: ${options.stack}`));
            console.log(
                chalk.dim(
                    `  Valid values are: ${validStacks.join(', ')}\n` +
                        '  Example: container-superposition plan --stack compose --overlays postgres,grafana'
                )
            );
            process.exit(1);
        }

        if (!options.overlays) {
            console.error(chalk.red('✗ --overlays is required for plan command'));
            console.log(
                chalk.dim(
                    '  Example: container-superposition plan --stack compose --overlays postgres,grafana'
                )
            );
            process.exit(1);
        }

        // Parse overlays - filter empty entries and deduplicate
        const seenOverlayIds = new Set<string>();
        const selectedOverlays = options.overlays
            .split(',')
            .map((o) => o.trim())
            .filter((id) => {
                if (!id) {
                    return false;
                }
                if (seenOverlayIds.has(id)) {
                    return false;
                }
                seenOverlayIds.add(id);
                return true;
            });
        const portOffset = options.portOffset || 0;

        // Validate overlays exist
        const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
        for (const id of selectedOverlays) {
            if (!overlayMap.has(id)) {
                console.error(chalk.red(`✗ Unknown overlay: ${id}`));
                console.log(
                    chalk.dim('\n💡 Use "container-superposition list" to see available overlays\n')
                );
                process.exit(1);
            }
        }

        // Resolve dependencies
        const { resolved, autoAdded } = resolveDependencies(selectedOverlays, overlaysConfig);

        // Apply stack compatibility filtering (match composeDevContainer behavior)
        let compatibleResolved = resolved;
        const incompatible: string[] = [];
        compatibleResolved = resolved.filter((id) => {
            const overlay = overlayMap.get(id);
            if (!overlay) {
                return false;
            }

            // Check if overlay supports this stack
            if (overlay.supports && overlay.supports.length > 0) {
                const isCompatible = overlay.supports.includes(options.stack!);
                if (!isCompatible) {
                    incompatible.push(id);
                }
                return isCompatible;
            }

            // Empty supports array means supports all stacks
            return true;
        });

        // Warn about incompatible overlays
        for (const id of incompatible) {
            console.warn(
                chalk.yellow(
                    `⚠ Overlay "${id}" does not support stack "${options.stack}" and will be skipped.`
                )
            );
        }

        // Detect conflicts
        const conflicts = detectConflicts(compatibleResolved, overlaysConfig);

        // Get port mappings
        const portMappings = getPortMappings(compatibleResolved, overlaysConfig, portOffset);

        // Determine output path for file comparison (used by both normal and diff modes)
        const outputPath = options.output || '.devcontainer';

        // Get files to create
        const files = getFilesToCreate(compatibleResolved, overlaysDir, outputPath);

        const plan = {
            stack: options.stack,
            selectedOverlays,
            autoAddedOverlays: autoAdded,
            conflicts,
            portMappings,
            files,
            portOffset,
        };

        // ── Diff mode ─────────────────────────────────────────────────────────
        if (options.diff) {
            const contextLines = options.diffContext ?? 3;
            const diffResult = generatePlanDiff(
                plan,
                overlaysConfig,
                overlaysDir,
                outputPath,
                contextLines
            );

            if (options.diffFormat === 'json' || options.json) {
                console.log(JSON.stringify(diffResult, null, 2));
                return;
            }

            console.log(formatDiffAsText(diffResult, contextLines));

            // Still show run hint if no conflicts
            if (conflicts.length > 0) {
                console.log(
                    chalk.yellow(
                        '⚠ Cannot proceed with generation due to conflicts. Remove conflicting overlays.\n'
                    )
                );
                process.exit(1);
            } else {
                console.log(
                    chalk.dim(
                        `  Run: container-superposition init --stack ${options.stack} --overlays ${options.overlays}${portOffset > 0 ? ` --port-offset ${portOffset}` : ''}\n`
                    )
                );
            }
            return;
        }

        // ── Normal mode ───────────────────────────────────────────────────────
        // Output as JSON
        if (options.json) {
            console.log(JSON.stringify(plan, null, 2));
            return;
        }

        // Output as formatted text
        console.log('\n' + formatAsText(plan, overlaysConfig) + '\n');

        // Summary
        if (conflicts.length > 0) {
            console.log(
                chalk.yellow(
                    '⚠ Cannot proceed with generation due to conflicts. Remove conflicting overlays.\n'
                )
            );
            process.exit(1);
        } else {
            console.log(
                chalk.green('✓ No conflicts detected. Ready to generate!\n') +
                    chalk.dim(
                        `  Run: container-superposition init --stack ${options.stack} --overlays ${options.overlays}${portOffset > 0 ? ` --port-offset ${portOffset}` : ''}\n`
                    )
            );
        }
    } catch (error) {
        console.error(chalk.red('✗ Error creating plan:'), error);
        process.exit(1);
    }
}
