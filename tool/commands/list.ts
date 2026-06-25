import type { OverlayMetadata, OverlaysConfig } from '../schema/types.js';
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

function renderFiltered(overlays: OverlayMetadata[], options: ListOptions): string {
    const filters = [
        options.category ? `category: ${options.category}` : null,
        options.tags ? `tags: ${options.tags}` : null,
        options.supports ? `supports: ${options.supports}` : null,
    ].filter(Boolean);

    if (overlays.length === 0) {
        return [
            `Filtered by ${filters.join(', ')}`,
            '',
            renderSection('No matches', [
                'remove one filter and try again',
                'inspect live categories with `cs list`',
                'browse recommended starts before narrowing further',
            ]),
        ].join('\n');
    }

    return [
        `Filtered by ${filters.join(', ')}`,
        '',
        renderList(
            overlays.map(
                (overlay) =>
                    `${overlay.id} | ${overlay.name} | ${overlay.category} | ${overlay.description}`
            )
        ),
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
                                      `${item.label} | Best for: ${item.bestFor} | Why start here: ${item.why}`
                              )
                          )
                      ),
                      '',
                      renderSection(
                          'Browse all overlays',
                          renderBrowseAll(overlaysConfig.overlays)
                      ),
                      '',
                      renderSection('How to inspect or preview next', [
                          'Use `cs explain <id>` for fit and tradeoffs.',
                          'Use `cs plan ...` before any write.',
                      ]),
                  ].join('\n');

        console.log([frame, '', body, '', nextStep].join('\n'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
