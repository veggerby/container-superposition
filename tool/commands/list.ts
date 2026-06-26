import type { OverlayMetadata, OverlaysConfig } from '../schema/types.js';
import { findProjectConfig } from '../schema/project-config.js';
import { describeSource } from '../ux/semantics/source.js';
import { resolveNextStep } from '../ux/semantics/next-step.js';
import { renderFrame, renderList, renderNextStep, renderSection } from '../ux/renderers/common.js';

interface ListOptions {
    category?: string;
    tags?: string;
    supports?: string;
    json?: boolean;
}

interface RecommendedStart {
    label: string;
    bestFor: string;
    why: string;
}

const CATEGORY_TITLES: Record<string, string> = {
    language: 'language',
    database: 'database',
    messaging: 'messaging',
    observability: 'observability',
    cloud: 'cloud',
    dev: 'dev',
    preset: 'preset',
};

function summarizeCurrentSetup(): string {
    return findProjectConfig(process.cwd()).length > 0 ? 'shared project file present' : 'none yet';
}

function buildRecommendedStarts(overlaysConfig: OverlaysConfig): RecommendedStart[] {
    const presetIds = new Set(
        overlaysConfig.overlays
            .filter((overlay) => overlay.category === 'preset')
            .map((overlay) => overlay.id)
    );
    const preferred = [
        ['web-api', 'HTTP services', 'good first shared project file for backend work'],
        ['frontend', 'frontend app work', 'fast start for browser-first stacks'],
        ['microservice', 'service + dependencies', 'common compose preview path'],
        ['fullstack', 'app + data + tooling', 'balanced starter for multi-service repos'],
        ['local-llm', 'local AI workflows', 'starts from managed local model tooling'],
    ] as const;

    return preferred
        .filter(([id]) => presetIds.has(id))
        .slice(0, 5)
        .map(([label, bestFor, why]) => ({ label, bestFor, why }));
}

function filterOverlays(overlaysConfig: OverlaysConfig, options: ListOptions): OverlayMetadata[] {
    return overlaysConfig.overlays.filter((overlay) => {
        if (options.category && overlay.category !== options.category.toLowerCase()) {
            return false;
        }
        if (options.tags) {
            const tags = (overlay.tags ?? []).map((tag) => tag.toLowerCase());
            const wanted = options.tags.split(',').map((tag) => tag.trim().toLowerCase());
            if (!wanted.some((tag) => tags.includes(tag))) {
                return false;
            }
        }
        if (options.supports) {
            if (
                overlay.supports &&
                overlay.supports.length > 0 &&
                !overlay.supports.includes(options.supports.toLowerCase())
            ) {
                return false;
            }
        }
        return true;
    });
}

function renderBrowseAll(overlays: OverlayMetadata[]): string {
    const categories = [...new Set(overlays.map((overlay) => overlay.category))].sort();
    return categories
        .map((category) => {
            const rows = overlays
                .filter((overlay) => overlay.category === category)
                .sort((a, b) => a.id.localeCompare(b.id))
                .map(
                    (overlay) =>
                        `${overlay.id} — ${overlay.description}${overlay.tags && overlay.tags.length > 0 ? ` [${overlay.tags.join(', ')}]` : ''}`
                );
            return `${CATEGORY_TITLES[category] ?? category}\n${renderList(rows)}`;
        })
        .join('\n\n');
}

function buildCommonGoals(overlaysConfig: OverlaysConfig): string[] {
    const ids = new Set(overlaysConfig.overlays.map((overlay) => overlay.id));
    const goals = [
        ids.has('web-api')
            ? 'build HTTP service fast → start with `web-api`, then inspect data/service add-ons'
            : null,
        ids.has('frontend')
            ? 'ship browser app quickly → start with `frontend`, then preview local-only add-ons'
            : null,
        ids.has('microservice')
            ? 'compose app plus dependencies → start with `microservice`, then preview service drift'
            : null,
        ids.has('local-llm')
            ? 'run local AI tooling → start with `local-llm`, then inspect model/runtime overlays'
            : null,
    ].filter((goal): goal is string => Boolean(goal));

    return goals.slice(0, 4);
}

function renderFiltered(overlays: OverlayMetadata[], options: ListOptions): string {
    const filters = [
        options.category ? `category: ${options.category}` : null,
        options.tags ? `tags: ${options.tags}` : null,
        options.supports ? `supports: ${options.supports}` : null,
    ].filter(Boolean);

    if (overlays.length === 0) {
        return [
            renderSection('Filter summary', `Filtered by ${filters.join(', ')}`),
            '',
            renderSection('No matches', [
                'remove one filter and try again',
                'drop category filter to widen results',
                'inspect live categories with `cs list`',
                'browse recommended starts before narrowing further',
            ]),
            '',
            renderSection('How to widen or inspect next', [
                'run `cs list` with no filters',
                'run `cs explain <id>` once one result looks close',
            ]),
        ].join('\n');
    }

    return [
        renderSection('Filter summary', `Filtered by ${filters.join(', ')}`),
        '',
        renderSection(
            'Best matches',
            renderList(
                overlays.map(
                    (overlay) =>
                        `${overlay.id} — ${overlay.description}${overlay.tags && overlay.tags.length > 0 ? ` [${overlay.tags.join(', ')}]` : ''}`
                )
            )
        ),
        '',
        renderSection('How to widen or inspect next', [
            'remove one filter to widen choices',
            'run `cs explain <id>` for fit and watch-outs',
        ]),
    ].join('\n');
}

export async function listCommand(overlaysConfig: OverlaysConfig, options: ListOptions) {
    try {
        const overlays = filterOverlays(overlaysConfig, options);
        const source = describeSource({ hasCliSelection: true });
        const nextStep = renderNextStep(resolveNextStep({ command: 'list' }));
        const model = {
            source,
            filters: {
                category: options.category ?? null,
                tags: options.tags ?? null,
                supports: options.supports ?? null,
            },
            recommendedStarts: buildRecommendedStarts(overlaysConfig),
            overlays,
            categories: [
                ...new Set(overlaysConfig.overlays.map((overlay) => overlay.category)),
            ].sort(),
            nextStep: resolveNextStep({ command: 'list' }),
        };

        if (options.json) {
            console.log(JSON.stringify(model, null, 2));
            return;
        }

        const frame = renderFrame([
            { label: 'Mode', value: 'Discovery' },
            { label: 'Source', value: `${source.label} — ${source.detail}` },
            { label: 'Current setup', value: summarizeCurrentSetup() },
            {
                label: 'What this helps you decide',
                value: 'where to start before inspection or preview',
            },
        ]);

        const body =
            options.category || options.tags || options.supports
                ? renderFiltered(overlays, options)
                : [
                      renderSection(
                          'Recommended starts',
                          renderList(
                              model.recommendedStarts.map(
                                  (item) =>
                                      `${item.label} | Best for: ${item.bestFor} | Includes: managed starter path | Why start here: ${item.why}`
                              )
                          )
                      ),
                      '',
                      renderSection('Common goals', renderList(buildCommonGoals(overlaysConfig))),
                      '',
                      renderSection(
                          'Browse all overlays',
                          renderBrowseAll(overlaysConfig.overlays)
                      ),
                      '',
                      renderSection('How to inspect or preview next', [
                          'Use `cs explain <id>` for fit, differences, and watch-outs.',
                          'Use `cs plan ...` before any write.',
                      ]),
                  ].join('\n');

        console.log([frame, '', body, '', nextStep].join('\n'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
