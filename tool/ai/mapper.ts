/**
 * Pure functions that map AI-generated intent/diff objects to QuestionnaireAnswers.
 *
 * These functions contain no LLM calls and are fully testable with Vitest
 * fixture data — no API key required.
 */

import type {
    BaseImage,
    DatabaseOverlay,
    CloudTool,
    DevTool,
    LanguageOverlay,
    ObservabilityTool,
    OverlaysConfig,
    QuestionnaireAnswers,
    Stack,
} from '../schema/types.js';
import type { EnvironmentIntent, ManifestDiff } from './intent.js';

// ─── Rationale types ───────────────────────────────────────────────────────────

/** Identifies where a particular overlay selection came from. */
export type RationaleSource = 'prompt-intent' | 'repo-signal' | 'diff-add' | 'diff-remove';

/** One entry explaining why a single overlay was included or excluded. */
export interface SelectionRationale {
    overlayId: string;
    source: RationaleSource;
    reason: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Partition a flat list of overlay IDs into the QuestionnaireAnswers category
 * fields by looking up each ID in the overlay catalog.
 */
function categoriseOverlays(
    ids: string[],
    overlaysConfig: OverlaysConfig
): {
    language: LanguageOverlay[];
    database: DatabaseOverlay[];
    devTools: DevTool[];
    cloudTools: CloudTool[];
    observability: ObservabilityTool[];
    playwright: boolean;
    unknownIds: string[];
} {
    const language: LanguageOverlay[] = [];
    const database: DatabaseOverlay[] = [];
    const devTools: DevTool[] = [];
    const cloudTools: CloudTool[] = [];
    const observability: ObservabilityTool[] = [];
    let playwright = false;
    const unknownIds: string[] = [];

    const catalogMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));

    for (const id of ids) {
        const overlay = catalogMap.get(id);
        if (!overlay) {
            unknownIds.push(id);
            continue;
        }

        switch (overlay.category) {
            case 'language':
                language.push(id as LanguageOverlay);
                break;
            case 'database':
                database.push(id as DatabaseOverlay);
                break;
            case 'dev':
                if (id === 'playwright') {
                    playwright = true;
                } else {
                    devTools.push(id as DevTool);
                }
                break;
            case 'cloud':
                cloudTools.push(id as CloudTool);
                break;
            case 'observability':
                observability.push(id as ObservabilityTool);
                break;
            default:
                unknownIds.push(id);
        }
    }

    return { language, database, devTools, cloudTools, observability, playwright, unknownIds };
}

/**
 * Remove items from an array (returns a new array without the excluded
 * values). Overlay IDs are always lowercase, so matching is exact.
 */
function without<T extends string>(arr: T[], exclude: string[]): T[] {
    const set = new Set(exclude);
    return arr.filter((item) => !set.has(item));
}

// ─── mapIntentToAnswers ────────────────────────────────────────────────────────

/**
 * Map an `EnvironmentIntent` (from-scratch mode) to a `QuestionnaireAnswers`
 * object that can be passed directly into `generateManifestOnly` or
 * `composeDevContainer`.
 *
 * Unknown overlay IDs are silently dropped (they appear in the "not matched"
 * section of the explainer output from the caller).
 */
export function mapIntentToAnswers(
    intent: EnvironmentIntent,
    overlaysConfig: OverlaysConfig,
    outputPath = '.'
): { answers: QuestionnaireAnswers; unknownIds: string[]; rationale: SelectionRationale[] } {
    // Collect all overlay IDs from all intent categories.
    const allIds = [
        ...(intent.language ?? []),
        ...(intent.services ?? []),
        ...(intent.tools ?? []),
        ...(intent.observability ?? []),
        ...(intent.cloudTools ?? []),
    ];

    const { language, database, devTools, cloudTools, observability, playwright, unknownIds } =
        categoriseOverlays(allIds, overlaysConfig);

    const answers: QuestionnaireAnswers = {
        stack: intent.stack,
        baseImage: (intent.baseImage as BaseImage) ?? 'bookworm',
        containerName: intent.containerName,
        language,
        database,
        devTools,
        cloudTools,
        observability,
        playwright,
        needsDocker: devTools.some((d) => d === 'docker-sock' || d === 'docker-in-docker'),
        outputPath,
    };

    const rationale: SelectionRationale[] = allIds
        .filter((id) => !unknownIds.includes(id))
        .map((id) => ({
            overlayId: id,
            source: 'prompt-intent' as const,
            reason: 'Selected from intent extracted from prompt',
        }));

    return { answers, unknownIds, rationale };
}

// ─── applyDiffToAnswers ────────────────────────────────────────────────────────

/**
 * Apply a `ManifestDiff` (modify mode) to an existing `QuestionnaireAnswers`.
 * Returns a new answers object — does not mutate the input.
 *
 * Unknown overlay IDs in `addOverlays` are captured and returned so the caller
 * can surface them in the "not matched" section of the explainer.
 *
 * Warnings are returned for destructive changes that may have unintended
 * consequences (removing the last language overlay, orphaning required deps).
 */
export function applyDiffToAnswers(
    current: QuestionnaireAnswers,
    diff: ManifestDiff,
    overlaysConfig: OverlaysConfig
): {
    answers: QuestionnaireAnswers;
    unknownIds: string[];
    warnings: string[];
    rationale: SelectionRationale[];
} {
    // Detect overlays that appear in both lists — treat as no-ops.
    const noOpIds = diff.addOverlays.filter((id) => diff.removeOverlays.includes(id));
    const effectiveAdd =
        noOpIds.length > 0
            ? diff.addOverlays.filter((id) => !diff.removeOverlays.includes(id))
            : diff.addOverlays;
    const effectiveRemove =
        noOpIds.length > 0
            ? diff.removeOverlays.filter((id) => !diff.addOverlays.includes(id))
            : diff.removeOverlays;

    // Categorise the overlays to add.
    const { language, database, devTools, cloudTools, observability, playwright, unknownIds } =
        categoriseOverlays(effectiveAdd, overlaysConfig);

    const toRemove = new Set(effectiveRemove);

    const answers: QuestionnaireAnswers = {
        ...current,
        stack: (diff.changeStack as Stack | undefined) ?? current.stack,
        baseImage: (diff.changeBaseImage as BaseImage | undefined) ?? current.baseImage,
        containerName: diff.changeContainerName ?? current.containerName,

        // Merge additions and strip removals from each category.
        language: [
            ...new Set(without([...(current.language ?? []), ...language], effectiveRemove)),
        ],
        database: [
            ...new Set(without([...(current.database ?? []), ...database], effectiveRemove)),
        ],
        devTools: [
            ...new Set(without([...(current.devTools ?? []), ...devTools], effectiveRemove)),
        ],
        cloudTools: [
            ...new Set(without([...(current.cloudTools ?? []), ...cloudTools], effectiveRemove)),
        ],
        observability: without(
            [...new Set([...(current.observability ?? []), ...observability])],
            effectiveRemove
        ),
        playwright: toRemove.has('playwright') ? false : current.playwright || playwright,
    };

    // Recompute needsDocker based on updated devTools.
    answers.needsDocker = answers.devTools.some(
        (d) => d === 'docker-sock' || d === 'docker-in-docker'
    );

    // ── Destructive-change warnings ────────────────────────────────────────────
    const warnings: string[] = [];

    // Warn about no-op overlays (appear in both add and remove).
    if (noOpIds.length > 0) {
        warnings.push(
            `Overlay(s) appear in both addOverlays and removeOverlays — treated as no-op: ${noOpIds.join(', ')}`
        );
    }

    // Warn if the last language overlay is removed with no replacement.
    const removedLanguage = effectiveRemove.filter((id) =>
        (current.language ?? []).includes(id as LanguageOverlay)
    );
    if (removedLanguage.length > 0 && (answers.language ?? []).length === 0) {
        warnings.push(
            `Removing all language overlays (${removedLanguage.join(', ')}) with no replacement. ` +
                `The environment will have no language runtime.`
        );
    }

    // Warn if removing an overlay that is required by another overlay still present.
    const catalogMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const remainingIds = collectCurrentOverlayIds(answers);
    for (const removedId of effectiveRemove) {
        for (const remainingId of remainingIds) {
            const meta = catalogMap.get(remainingId);
            if (meta?.requires?.includes(removedId)) {
                warnings.push(
                    `Removing ${removedId}, but ${remainingId} lists it as a required dependency. ` +
                        `Consider also removing ${remainingId} or adding a replacement.`
                );
            }
        }
    }

    // ── Build rationale ────────────────────────────────────────────────────────
    const rationale: SelectionRationale[] = [
        ...effectiveAdd
            .filter((id) => !unknownIds.includes(id))
            .map((id) => ({
                overlayId: id,
                source: 'diff-add' as const,
                reason: 'Added per request',
            })),
        ...effectiveRemove.map((id) => ({
            overlayId: id,
            source: 'diff-remove' as const,
            reason: 'Removed per request',
        })),
    ];

    return { answers, unknownIds, warnings, rationale };
}

// ─── collectCurrentOverlayIds ──────────────────────────────────────────────────

/**
 * Flatten all overlay IDs from a `QuestionnaireAnswers` object into a single
 * de-duplicated array preserving category concatenation order.
 * Useful for manifest diff display and serialisation.
 */
export function collectCurrentOverlayIds(answers: QuestionnaireAnswers): string[] {
    const ids: string[] = [
        ...(answers.language ?? []),
        ...(answers.database ?? []),
        ...(answers.observability ?? []),
        ...(answers.cloudTools ?? []),
        ...(answers.devTools ?? []),
    ];
    if (answers.playwright) ids.push('playwright');
    return [...new Set(ids)];
}
