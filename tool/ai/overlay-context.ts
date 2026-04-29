/**
 * Serialise the overlay catalog into a compact context string suitable for
 * inclusion in an LLM prompt. Only includes fields the LLM needs to make a
 * selection decision; no secrets or full file content.
 */

import type { OverlaysConfig, OverlayMetadata } from '../schema/types.js';

/**
 * Build a compact markdown-formatted string describing all non-preset overlays
 * in the catalog. This is passed as system/context to the Mastra agent so the
 * LLM can only select from real overlay IDs.
 */
export function buildOverlayContextString(overlaysConfig: OverlaysConfig): string {
    const categories = new Map<string, OverlayMetadata[]>();

    for (const overlay of overlaysConfig.overlays) {
        if (overlay.category === 'preset') continue;
        const list = categories.get(overlay.category) ?? [];
        list.push(overlay);
        categories.set(overlay.category, list);
    }

    const lines: string[] = ['Available overlay IDs (you MUST only select from this list):', ''];

    for (const [category, overlays] of categories) {
        lines.push(`### ${category}`);
        for (const o of overlays) {
            const tags = o.tags?.length ? ` [${o.tags.join(', ')}]` : '';
            lines.push(`- **${o.id}** — ${o.description}${tags}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Build a concise one-line summary of each overlay for use in explainer output.
 */
export function buildOverlayLookup(
    overlaysConfig: OverlaysConfig
): Map<string, Pick<OverlayMetadata, 'name' | 'description' | 'category'>> {
    const map = new Map<string, Pick<OverlayMetadata, 'name' | 'description' | 'category'>>();
    for (const o of overlaysConfig.overlays) {
        map.set(o.id, { name: o.name, description: o.description, category: o.category });
    }
    return map;
}
