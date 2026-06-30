import type { OverlaysConfig, Stack } from '../../schema/types.js';
import type { ResolutionOrigin, ResolutionReason, ResolvedOverlayExplanation } from './types.js';

export function resolveDependencies(
    selectedIds: string[],
    overlaysConfig: OverlaysConfig,
    origin: ResolutionOrigin
): {
    resolved: string[];
    autoAdded: string[];
    explanations: Map<string, ResolvedOverlayExplanation>;
} {
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
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
        const exists = explanation.reasons.some(
            (entry) =>
                `${entry.kind}|${entry.rootOverlayId}|${entry.sourceOverlayId ?? ''}|${entry.path.join('>')}` ===
                key
        );

        if (!exists) {
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
        if (!overlay || !overlay.requires) {
            return;
        }

        for (const requiredId of overlay.requires) {
            if (currentPath.includes(requiredId)) {
                continue;
            }

            const nextPath = [...currentPath, requiredId];
            const depth = nextPath.length - 1;
            addReason(requiredId, {
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

            if (!resolved.has(requiredId)) {
                resolved.add(requiredId);
                autoAdded.push(requiredId);
            }

            processDeps(requiredId, rootOverlayId, nextPath);
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

export function detectConflicts(
    overlayIds: string[],
    overlaysConfig: OverlaysConfig
): Array<{ overlay: string; conflictsWith: string[] }> {
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
    const conflicts: Array<{ overlay: string; conflictsWith: string[] }> = [];

    for (const id of overlayIds) {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.conflicts || overlay.conflicts.length === 0) {
            continue;
        }

        const conflicting = overlay.conflicts.filter((conflictId) =>
            overlayIds.includes(conflictId)
        );
        if (conflicting.length > 0) {
            conflicts.push({ overlay: id, conflictsWith: conflicting });
        }
    }

    return conflicts;
}

export function filterCompatibleOverlays(
    overlayIds: string[],
    overlaysConfig: OverlaysConfig,
    stack: Stack
): { compatible: string[]; incompatible: string[] } {
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
    const incompatible: string[] = [];
    const compatible = overlayIds.filter((id) => {
        const overlay = overlayMap.get(id);
        if (!overlay) {
            return false;
        }

        if (overlay.supports && overlay.supports.length > 0) {
            const isCompatible = overlay.supports.includes(stack);
            if (!isCompatible) {
                incompatible.push(id);
            }
            return isCompatible;
        }

        return true;
    });

    return { compatible, incompatible };
}
