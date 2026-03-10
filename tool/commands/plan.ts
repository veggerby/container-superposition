/**
 * Plan command - Preview what will happen before generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import type { DevContainer, OverlayMetadata, OverlaysConfig, Stack } from '../schema/types.js';
import { extractPorts } from '../utils/port-utils.js';
import { applyOverlay } from '../questionnaire/composer.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve TEMPLATES_DIR that works in both source and compiled output.
// Validate each candidate by checking for a known template file.
const EXPECTED_TEMPLATE_SUBPATH = path.join('compose', '.devcontainer', 'devcontainer.json');
const TEMPLATES_DIR_CANDIDATES = [
    path.join(__dirname, '..', '..', 'templates'), // From source: tool/commands -> root/templates
    path.join(__dirname, '..', '..', '..', 'templates'), // From dist: dist/tool/commands -> root/templates
];
const TEMPLATES_DIR =
    TEMPLATES_DIR_CANDIDATES.find((candidate) =>
        fs.existsSync(path.join(candidate, EXPECTED_TEMPLATE_SUBPATH))
    ) ?? TEMPLATES_DIR_CANDIDATES[0];

interface PlanOptions {
    stack?: Stack;
    overlays?: string;
    fromManifest?: string;
    portOffset?: number;
    json?: boolean;
    verbose?: boolean;
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
    modified: FileDiffEntry[]; // files with a computed unified diff
    overwritten: string[]; // files that exist but content could not be compared
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

type ResolutionReasonKind = 'selected' | 'required' | 'transitive';
type ResolutionIssueKind = 'skipped' | 'conflict';
type PlanInputMode = 'overlay-list' | 'manifest';
type ResolutionOrigin = 'command-line' | 'manifest';

interface ResolutionReason {
    kind: ResolutionReasonKind;
    message: string;
    origin: ResolutionOrigin;
    rootOverlayId: string;
    sourceOverlayId?: string;
    path: string[];
    depth: number;
}

interface ResolvedOverlayExplanation {
    id: string;
    selectionKind: 'direct' | 'dependency';
    selectionSource: ResolutionOrigin | 'dependency';
    reasons: ResolutionReason[];
}

interface ResolutionIssue {
    kind: ResolutionIssueKind;
    overlayId: string;
    message: string;
    relatedOverlayIds?: string[];
    path?: string[];
}

interface ResolutionSummary {
    directSelections: number;
    autoAdded: number;
    includedOverlays: number;
    skippedOverlays: number;
    conflicts: number;
}

interface VerbosePlanData {
    inputMode: PlanInputMode;
    includedOverlays: ResolvedOverlayExplanation[];
    summary: ResolutionSummary;
    issues: ResolutionIssue[];
}

interface PlanResult {
    stack: Stack;
    selectedOverlays: string[];
    autoAddedOverlays: string[];
    conflicts: Array<{ overlay: string; conflictsWith: string[] }>;
    portMappings: Array<{ overlay: string; ports: number[]; offsetPorts: number[] }>;
    files: string[];
    portOffset: number;
    inputMode: PlanInputMode;
    verbose?: VerbosePlanData;
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
 * base template and applying each overlay using the same logic as the composer.
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

        let config: DevContainer = JSON.parse(fs.readFileSync(basePath, 'utf8'));

        for (const id of overlayIds) {
            config = applyOverlay(config, id, overlaysDir);
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
    const overwritten: string[] = []; // files that exist but content was not compared
    const unchanged: string[] = [];

    // Helper: produce a display path preferring cwd-relative, falling back to
    // paths relative to existingPath's parent (e.g., ".devcontainer/file.json").
    const existingParent = path.dirname(path.resolve(existingPath));
    const toDisplayPath = (abs: string): string => {
        const cwdRel = path.relative(process.cwd(), abs);
        return cwdRel.startsWith('..') ? path.relative(existingParent, abs) : cwdRel;
    };

    const relFiles = plan.files.map((f) => toDisplayPath(path.isAbsolute(f) ? f : path.resolve(f)));

    for (let idx = 0; idx < plan.files.length; idx++) {
        const absFile = plan.files[idx];
        const relFile = relFiles[idx];

        if (!fs.existsSync(absFile)) {
            created.push(relFile);
            continue;
        }

        // File exists – compute a real diff only for devcontainer.json where we
        // can reconstruct the planned content. All other existing files are marked
        // as "overwritten" since we don't have their planned content.
        const basename = path.basename(absFile);
        if (basename === 'devcontainer.json') {
            const existingContent = fs.readFileSync(absFile, 'utf8');
            const plannedContent = computePlannedDevcontainerJson(
                plan.stack,
                allPlannedOverlays,
                overlaysDir
            );

            if (plannedContent === null) {
                overwritten.push(relFile);
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
            // Content not compared – will be overwritten on next generation
            overwritten.push(relFile);
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
                    preserved.push(toDisplayPath(path.join(customDir, entry.name)));
                }
            }
        } catch {
            // ignore
        }
    }

    // ── Removed files: walk the existing dir recursively and compare relative paths ──
    const removed: string[] = [];
    if (existsDir) {
        try {
            // Build a set of planned paths relative to existingPath for accurate comparison
            const absExisting = path.resolve(existingPath);
            const plannedRelPaths = new Set(
                plan.files.map((f) =>
                    path.normalize(
                        path.relative(absExisting, path.isAbsolute(f) ? f : path.resolve(f))
                    )
                )
            );

            // Files to skip regardless (user-managed or auto-generated docs)
            const skipTopLevel = new Set(['superposition.json', '.env', 'ports.json']);

            const walkExisting = (dir: string) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const abs = path.join(dir, entry.name);
                    const relFromRoot = path.normalize(path.relative(absExisting, abs));
                    const segments = relFromRoot.split(path.sep);

                    // Skip the custom/ directory entirely (preserved separately)
                    if (segments[0] === 'custom') continue;

                    // Skip specific top-level user-managed files
                    if (segments.length === 1 && skipTopLevel.has(entry.name)) continue;

                    if (entry.isDirectory()) {
                        walkExisting(abs);
                    } else if (entry.isFile() && !plannedRelPaths.has(relFromRoot)) {
                        removed.push(toDisplayPath(abs));
                    }
                }
            };

            walkExisting(absExisting);
        } catch {
            // ignore
        }
    }

    return {
        existingPath,
        hasExistingConfig: existsDir,
        created,
        modified,
        overwritten,
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

    if (diff.overwritten.length > 0) {
        lines.push(chalk.bold.yellow('Files to be overwritten:'));
        for (const f of diff.overwritten) {
            lines.push(`  ${chalk.yellow('~')} ${f} ${chalk.dim('(content not compared)')}`);
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
    overlaysConfig: OverlaysConfig,
    origin: ResolutionOrigin
): {
    resolved: string[];
    autoAdded: string[];
    explanations: Map<string, ResolvedOverlayExplanation>;
} {
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const resolved = new Set<string>(selectedIds);
    const autoAdded: string[] = [];
    const explanations = new Map<string, ResolvedOverlayExplanation>();

    const getExplanation = (id: string): ResolvedOverlayExplanation => {
        let explanation = explanations.get(id);
        if (!explanation) {
            explanation = {
                id,
                selectionKind: selectedIds.includes(id) ? 'direct' : 'dependency',
                selectionSource: selectedIds.includes(id) ? origin : 'dependency',
                reasons: [],
            };
            explanations.set(id, explanation);
        }
        return explanation;
    };

    const addReason = (id: string, reason: ResolutionReason) => {
        const explanation = getExplanation(id);
        if (selectedIds.includes(id)) {
            explanation.selectionKind = 'direct';
            explanation.selectionSource = origin;
        }

        const key = `${reason.kind}|${reason.rootOverlayId}|${reason.sourceOverlayId ?? ''}|${reason.path.join('>')}`;
        const existing = explanation.reasons.some(
            (entry) =>
                `${entry.kind}|${entry.rootOverlayId}|${entry.sourceOverlayId ?? ''}|${entry.path.join('>')}` ===
                key
        );

        if (!existing) {
            explanation.reasons.push(reason);
        }
    };

    for (const id of selectedIds) {
        addReason(id, {
            kind: 'selected',
            message:
                origin === 'manifest' ? 'selected from manifest' : 'selected directly by the user',
            origin,
            rootOverlayId: id,
            path: [id],
            depth: 0,
        });
    }

    const processDeps = (id: string, rootOverlayId: string, currentPath: string[]) => {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.requires) return;

        for (const reqId of overlay.requires) {
            if (currentPath.includes(reqId)) {
                continue;
            }

            const nextPath = [...currentPath, reqId];
            const depth = nextPath.length - 1;
            addReason(reqId, {
                kind: depth === 1 ? 'required' : 'transitive',
                message:
                    depth === 1
                        ? `required by ${id}`
                        : `required transitively via ${currentPath.join(' -> ')}`,
                origin,
                rootOverlayId,
                sourceOverlayId: id,
                path: nextPath,
                depth,
            });

            if (!resolved.has(reqId)) {
                resolved.add(reqId);
                autoAdded.push(reqId);
            }

            processDeps(reqId, rootOverlayId, nextPath);
        }
    };

    for (const id of selectedIds) {
        processDeps(id, id, [id]);
    }

    return {
        resolved: Array.from(resolved),
        autoAdded,
        explanations,
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

function findManifest(manifestPath: string): string | null {
    const candidates = [manifestPath];

    for (const candidate of candidates) {
        const resolved = path.resolve(candidate);
        if (fs.existsSync(resolved)) {
            return resolved;
        }
    }

    return null;
}

function loadPlanManifest(manifestPath: string): { baseTemplate: Stack; overlays: string[] } {
    let rawManifest: unknown;

    try {
        rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (error) {
        console.error(
            chalk.red(
                `✗ Failed to read manifest: ${error instanceof Error ? error.message : String(error)}`
            )
        );
        process.exit(1);
    }

    if (typeof rawManifest !== 'object' || rawManifest === null) {
        console.error(chalk.red('✗ Invalid manifest: expected a JSON object'));
        process.exit(1);
    }

    const manifest = rawManifest as Record<string, unknown>;

    if (!manifest.baseTemplate || typeof manifest.baseTemplate !== 'string') {
        console.error(chalk.red('✗ Invalid manifest: missing or invalid "baseTemplate"'));
        process.exit(1);
    }

    const validStacks: Stack[] = ['plain', 'compose'];
    if (!validStacks.includes(manifest.baseTemplate as Stack)) {
        console.error(
            chalk.red(
                `✗ Invalid manifest: "baseTemplate" must be one of: ${validStacks.join(', ')}`
            )
        );
        process.exit(1);
    }

    if (!Array.isArray(manifest.overlays)) {
        console.error(chalk.red('✗ Invalid manifest: "overlays" must be an array'));
        process.exit(1);
    }

    if (!manifest.overlays.every((overlay) => typeof overlay === 'string')) {
        console.error(chalk.red('✗ Invalid manifest: "overlays" must be an array of strings'));
        process.exit(1);
    }

    return {
        baseTemplate: manifest.baseTemplate as Stack,
        overlays: manifest.overlays as string[],
    };
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
function formatAsText(plan: PlanResult, overlaysConfig: OverlaysConfig): string {
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
    lines.push(
        chalk.bold(
            plan.inputMode === 'manifest' ? 'Overlays Loaded from Manifest:' : 'Overlays Selected:'
        )
    );
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

    if (plan.verbose) {
        lines.push('');
        lines.push(chalk.bold('Dependency Resolution:'));
        for (const explanation of plan.verbose.includedOverlays) {
            const overlay = overlayMap.get(explanation.id);
            const name = overlay ? ` (${overlay.name})` : '';
            lines.push(`  ${chalk.cyan(explanation.id)}${chalk.gray(name)}`);

            for (const reason of explanation.reasons) {
                lines.push(`    - ${reason.message}`);
                if (reason.path.length > 1) {
                    lines.push(`    - path: ${reason.path.join(' -> ')}`);
                }
            }
        }

        if (plan.verbose.issues.length > 0) {
            lines.push('');
            lines.push(chalk.bold('Resolution Notes:'));
            for (const issue of plan.verbose.issues) {
                lines.push(`  - ${issue.message}`);
                if (issue.path && issue.path.length > 0) {
                    lines.push(`    path: ${issue.path.join(' -> ')}`);
                }
            }
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
        const validStacks: Stack[] = ['plain', 'compose'];
        let stack: Stack;
        let selectedOverlays: string[];
        let inputMode: PlanInputMode;
        let selectionOrigin: ResolutionOrigin;

        if (options.fromManifest) {
            if (options.overlays) {
                console.error(
                    chalk.red('✗ Use either --overlays or --from-manifest for plan command')
                );
                process.exit(1);
            }

            const manifestPath = findManifest(options.fromManifest);
            if (!manifestPath) {
                console.error(chalk.red(`✗ Could not find manifest file: ${options.fromManifest}`));
                process.exit(1);
            }

            const manifest = loadPlanManifest(manifestPath);

            if (options.stack && options.stack !== manifest.baseTemplate) {
                console.error(
                    chalk.red(
                        `✗ --stack ${options.stack} does not match manifest baseTemplate ${manifest.baseTemplate}`
                    )
                );
                process.exit(1);
            }

            stack = manifest.baseTemplate;
            inputMode = 'manifest';
            selectionOrigin = 'manifest';

            const seenOverlayIds = new Set<string>();
            selectedOverlays = manifest.overlays.filter((id) => {
                if (!id || seenOverlayIds.has(id)) {
                    return false;
                }
                seenOverlayIds.add(id);
                return true;
            });
        } else {
            if (!options.stack) {
                console.error(chalk.red('✗ --stack is required for plan command'));
                console.log(
                    chalk.dim(
                        '  Example: container-superposition plan --stack compose --overlays postgres,grafana'
                    )
                );
                process.exit(1);
            }

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

            stack = options.stack;
            inputMode = 'overlay-list';
            selectionOrigin = 'command-line';

            const seenOverlayIds = new Set<string>();
            selectedOverlays = options.overlays
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
        }

        const portOffset = options.portOffset || 0;

        // Validate overlays exist
        const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
        for (const id of selectedOverlays) {
            if (!overlayMap.has(id)) {
                console.error(chalk.red(`✗ Unknown overlay: ${id}`));
                if (options.verbose && inputMode === 'overlay-list') {
                    console.log(
                        chalk.dim(
                            `  Dependency resolution did not start because "${id}" is not a known overlay.`
                        )
                    );
                }
                if (inputMode === 'manifest') {
                    console.error(
                        chalk.dim(
                            `  Manifest-driven planning cannot continue because "${id}" is not a known overlay.`
                        )
                    );
                }
                console.log(
                    chalk.dim('\n💡 Use "container-superposition list" to see available overlays\n')
                );
                process.exit(1);
            }
        }

        // Resolve dependencies
        const { resolved, autoAdded, explanations } = resolveDependencies(
            selectedOverlays,
            overlaysConfig,
            selectionOrigin
        );

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
                const isCompatible = overlay.supports.includes(stack);
                if (!isCompatible) {
                    incompatible.push(id);
                }
                return isCompatible;
            }

            // Empty supports array means supports all stacks
            return true;
        });

        const issues: ResolutionIssue[] = [];

        // Warn about incompatible overlays
        for (const id of incompatible) {
            console.warn(
                chalk.yellow(
                    `⚠ Overlay "${id}" does not support stack "${stack}" and will be skipped.`
                )
            );
            const explanation = explanations.get(id);
            issues.push({
                kind: 'skipped',
                overlayId: id,
                message: `Overlay "${id}" was skipped because it does not support stack "${stack}".`,
                path: explanation?.reasons[0]?.path,
            });
        }

        // Detect conflicts
        const conflicts = detectConflicts(compatibleResolved, overlaysConfig);
        for (const conflict of conflicts) {
            const explanation = explanations.get(conflict.overlay);
            issues.push({
                kind: 'conflict',
                overlayId: conflict.overlay,
                relatedOverlayIds: conflict.conflictsWith,
                message: `Overlay "${conflict.overlay}" conflicts with ${conflict.conflictsWith.join(', ')}.`,
                path: explanation?.reasons[0]?.path,
            });
        }

        // Get port mappings
        const portMappings = getPortMappings(compatibleResolved, overlaysConfig, portOffset);

        // Determine output path for file comparison (used by both normal and diff modes)
        const outputPath = options.output || '.devcontainer';

        // Get files to create
        const files = getFilesToCreate(compatibleResolved, overlaysDir, outputPath);

        const includedOverlays = compatibleResolved.map((id) => {
            const explanation = explanations.get(id);
            if (explanation) {
                return explanation;
            }

            return {
                id,
                selectionKind: selectedOverlays.includes(id)
                    ? ('direct' as const)
                    : ('dependency' as const),
                selectionSource: selectedOverlays.includes(id)
                    ? selectionOrigin
                    : ('dependency' as const),
                reasons: [],
            };
        });

        const compatibleAutoAdded = autoAdded.filter((id) => compatibleResolved.includes(id));

        const plan: PlanResult = {
            stack,
            selectedOverlays,
            autoAddedOverlays: compatibleAutoAdded,
            conflicts,
            portMappings,
            files,
            portOffset,
            inputMode,
            verbose: options.verbose
                ? {
                      inputMode,
                      includedOverlays,
                      summary: {
                          directSelections: selectedOverlays.length,
                          autoAdded: compatibleAutoAdded.length,
                          includedOverlays: compatibleResolved.length,
                          skippedOverlays: incompatible.length,
                          conflicts: conflicts.length,
                      },
                      issues,
                  }
                : undefined,
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
                const rerunHint = options.fromManifest
                    ? `container-superposition init --from-manifest ${options.fromManifest} --no-interactive`
                    : `container-superposition init --stack ${stack} --overlays ${options.overlays}${portOffset > 0 ? ` --port-offset ${portOffset}` : ''}`;
                console.log(chalk.dim(`  Run: ${rerunHint}\n`));
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
            const rerunHint = options.fromManifest
                ? `container-superposition init --from-manifest ${options.fromManifest} --no-interactive`
                : `container-superposition init --stack ${stack} --overlays ${options.overlays}${portOffset > 0 ? ` --port-offset ${portOffset}` : ''}`;
            console.log(
                chalk.green('✓ No conflicts detected. Ready to generate!\n') +
                    chalk.dim(`  Run: ${rerunHint}\n`)
            );
        }
    } catch (error) {
        console.error(chalk.red('✗ Error creating plan:'), error);
        process.exit(1);
    }
}
