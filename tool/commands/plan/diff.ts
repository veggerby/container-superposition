import * as fs from 'fs';
import * as path from 'path';
import type { OverlaysConfig, Stack } from '../../schema/types.js';
import { extractPorts } from '../../utils/port-utils.js';
import { computePlannedDevcontainerJson } from './artifacts.js';
import type { FileDiffEntry, OverlayChange, PlanDiffResult, PortChange } from './types.js';

type EditType = 'equal' | 'insert' | 'delete';

interface Edit {
    type: EditType;
    value: string;
}

export function computeLineDiff(a: string[], b: string[]): Edit[] {
    const m = a.length;
    const n = b.length;
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

export function formatUnifiedDiff(
    edits: Edit[],
    fileNameA: string,
    fileNameB: string,
    contextLines = 3
): string {
    const lines: string[] = [];
    lines.push(`--- ${fileNameA}`);
    lines.push(`+++ ${fileNameB}`);

    const changePositions = new Set<number>();
    for (let index = 0; index < edits.length; index++) {
        if (edits[index].type !== 'equal') {
            for (
                let contextIndex = Math.max(0, index - contextLines);
                contextIndex <= index + contextLines;
                contextIndex++
            ) {
                changePositions.add(contextIndex);
            }
        }
    }

    if (changePositions.size === 0) {
        return '';
    }

    let inHunk = false;
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

    for (let index = 0; index < edits.length; index++) {
        const edit = edits[index];
        const inContext = changePositions.has(index);

        if (inContext) {
            if (!inHunk) {
                hunkOldStart = oldLine;
                hunkNewStart = newLine;
                inHunk = true;
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

export function generateUnifiedDiff(
    oldContent: string,
    newContent: string,
    filePath: string,
    contextLines = 3
): string {
    if (oldContent === newContent) {
        return '';
    }

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const edits = computeLineDiff(oldLines, newLines);
    return formatUnifiedDiff(edits, `a/${filePath}`, `b/${filePath}`, contextLines);
}

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
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
    const allPlannedOverlays = [
        ...plan.selectedOverlays,
        ...plan.autoAddedOverlays.filter((id) => !plan.selectedOverlays.includes(id)),
    ];

    const existsDir = fs.existsSync(existingPath);
    const manifestPath = path.join(existingPath, 'superposition.json');
    let existingOverlays: string[] = [];
    const existingPorts: PortChange[] = [];

    if (existsDir && fs.existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            existingOverlays = Array.isArray(manifest.overlays) ? manifest.overlays : [];
        } catch {
            // ignore parse errors
        }
    }

    const plannedSet = new Set(allPlannedOverlays);
    const existingSet = new Set(existingOverlays);

    const addedOverlays: OverlayChange[] = allPlannedOverlays
        .filter((id) => !existingSet.has(id))
        .map((id) => {
            const metadata = overlayMap.get(id);
            return { id, name: metadata?.name, category: metadata?.category };
        });

    const removedOverlays: OverlayChange[] = existingOverlays
        .filter((id) => !plannedSet.has(id))
        .map((id) => {
            const metadata = overlayMap.get(id);
            return { id, name: metadata?.name, category: metadata?.category };
        });

    const unchangedOverlays = allPlannedOverlays.filter((id) => existingSet.has(id));

    const existingPortSet = new Set<string>();
    for (const id of existingOverlays) {
        const metadata = overlayMap.get(id);
        if (!metadata) {
            continue;
        }
        for (const port of extractPorts([metadata])) {
            existingPortSet.add(`${id}:${port}`);
            existingPorts.push({ overlay: id, port });
        }
    }

    const addedPorts: PortChange[] = [];
    const removedPorts: PortChange[] = [];
    const plannedPortSet = new Set<string>();

    for (const mapping of plan.portMappings) {
        for (const port of mapping.ports) {
            plannedPortSet.add(`${mapping.overlay}:${port}`);
            if (!existingPortSet.has(`${mapping.overlay}:${port}`)) {
                addedPorts.push({ overlay: mapping.overlay, port });
            }
        }
    }

    for (const existingPort of existingPorts) {
        if (!plannedPortSet.has(`${existingPort.overlay}:${existingPort.port}`)) {
            removedPorts.push(existingPort);
        }
    }

    const created: string[] = [];
    const modified: FileDiffEntry[] = [];
    const overwritten: string[] = [];
    const unchanged: string[] = [];

    const existingParent = path.dirname(path.resolve(existingPath));
    const toDisplayPath = (absolutePath: string): string => {
        const cwdRelative = path.relative(process.cwd(), absolutePath);
        return cwdRelative.startsWith('..')
            ? path.relative(existingParent, absolutePath)
            : cwdRelative;
    };

    const relativeFiles = plan.files.map((file) =>
        toDisplayPath(path.isAbsolute(file) ? file : path.resolve(file))
    );

    for (let index = 0; index < plan.files.length; index++) {
        const absoluteFile = plan.files[index];
        const relativeFile = relativeFiles[index];

        if (!fs.existsSync(absoluteFile)) {
            created.push(relativeFile);
            continue;
        }

        const basename = path.basename(absoluteFile);
        if (basename === 'devcontainer.json') {
            const existingContent = fs.readFileSync(absoluteFile, 'utf8');
            const plannedContent = computePlannedDevcontainerJson(
                plan.stack,
                allPlannedOverlays,
                overlaysDir
            );

            if (plannedContent === null) {
                overwritten.push(relativeFile);
            } else if (plannedContent.trimEnd() === existingContent.trimEnd()) {
                unchanged.push(relativeFile);
            } else {
                const diff = generateUnifiedDiff(
                    existingContent.trimEnd(),
                    plannedContent.trimEnd(),
                    relativeFile,
                    contextLines
                );
                modified.push({ path: relativeFile, diff: diff || undefined });
            }
        } else {
            overwritten.push(relativeFile);
        }
    }

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

    const removed: string[] = [];
    if (existsDir) {
        try {
            const absoluteExisting = path.resolve(existingPath);
            const plannedRelativePaths = new Set(
                plan.files.map((file) =>
                    path.normalize(
                        path.relative(
                            absoluteExisting,
                            path.isAbsolute(file) ? file : path.resolve(file)
                        )
                    )
                )
            );
            const skipTopLevel = new Set(['superposition.json', '.env', 'ports.json']);

            const walkExisting = (dir: string) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const absolute = path.join(dir, entry.name);
                    const relativeFromRoot = path.normalize(
                        path.relative(absoluteExisting, absolute)
                    );
                    const segments = relativeFromRoot.split(path.sep);

                    if (segments[0] === 'custom') {
                        continue;
                    }
                    if (segments.length === 1 && skipTopLevel.has(entry.name)) {
                        continue;
                    }

                    if (entry.isDirectory()) {
                        walkExisting(absolute);
                    } else if (entry.isFile() && !plannedRelativePaths.has(relativeFromRoot)) {
                        removed.push(toDisplayPath(absolute));
                    }
                }
            };

            walkExisting(absoluteExisting);
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
