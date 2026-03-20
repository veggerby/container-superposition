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
 * Remove items from an array in-place (returns a new array without the excluded
 * values). Case-insensitive by convention but overlay IDs are always lowercase.
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
): { answers: QuestionnaireAnswers; unknownIds: string[] } {
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

    return { answers, unknownIds };
}

// ─── applyDiffToAnswers ────────────────────────────────────────────────────────

/**
 * Apply a `ManifestDiff` (modify mode) to an existing `QuestionnaireAnswers`.
 * Returns a new answers object — does not mutate the input.
 *
 * Unknown overlay IDs in `addOverlays` are captured and returned so the caller
 * can surface them in the "not matched" section of the explainer.
 */
export function applyDiffToAnswers(
    current: QuestionnaireAnswers,
    diff: ManifestDiff,
    overlaysConfig: OverlaysConfig
): { answers: QuestionnaireAnswers; unknownIds: string[] } {
    // Categorise the overlays to add.
    const { language, database, devTools, cloudTools, observability, playwright, unknownIds } =
        categoriseOverlays(diff.addOverlays, overlaysConfig);

    const toRemove = new Set(diff.removeOverlays);

    const answers: QuestionnaireAnswers = {
        ...current,
        stack: (diff.changeStack as Stack | undefined) ?? current.stack,
        baseImage: (diff.changeBaseImage as BaseImage | undefined) ?? current.baseImage,
        containerName: diff.changeContainerName ?? current.containerName,

        // Merge additions and strip removals from each category.
        language: [
            ...new Set(without([...(current.language ?? []), ...language], diff.removeOverlays)),
        ],
        database: [
            ...new Set(without([...(current.database ?? []), ...database], diff.removeOverlays)),
        ],
        devTools: [
            ...new Set(without([...(current.devTools ?? []), ...devTools], diff.removeOverlays)),
        ],
        cloudTools: [
            ...new Set(
                without([...(current.cloudTools ?? []), ...cloudTools], diff.removeOverlays)
            ),
        ],
        observability: without(
            [...new Set([...(current.observability ?? []), ...observability])],
            diff.removeOverlays
        ),
        playwright: toRemove.has('playwright') ? false : current.playwright || playwright,
    };

    // Recompute needsDocker based on updated devTools.
    answers.needsDocker = answers.devTools.some(
        (d) => d === 'docker-sock' || d === 'docker-in-docker'
    );

    return { answers, unknownIds };
}

// ─── collectCurrentOverlayIds ──────────────────────────────────────────────────

/**
 * Flatten all overlay IDs from a `QuestionnaireAnswers` object into a single
 * sorted array. Useful for manifest diff display and serialisation.
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
