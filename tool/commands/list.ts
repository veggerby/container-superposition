/**
 * List command - Display available overlays with filtering options
 */

import chalk from 'chalk';
import boxen from 'boxen';
import type { OverlayMetadata, OverlaysConfig } from '../schema/types.js';

interface ListOptions {
    category?: string;
    tags?: string;
    supports?: string;
    json?: boolean;
}

/**
 * Format overlay list as a table
 */
function formatAsTable(overlays: OverlayMetadata[]): string {
    const lines: string[] = [];

    // Header
    lines.push(
        chalk.bold(
            [
                'ID'.padEnd(20),
                'NAME'.padEnd(30),
                'CATEGORY'.padEnd(15),
                'PORTS'.padEnd(15),
                'REQUIRES'.padEnd(20),
            ].join(' ')
        )
    );
    lines.push('-'.repeat(100));

    // Rows
    for (const overlay of overlays) {
        const ports = overlay.ports && overlay.ports.length > 0 ? overlay.ports.join(',') : '-';
        const requires =
            overlay.requires && overlay.requires.length > 0 ? overlay.requires.join(',') : '-';

        lines.push(
            [
                chalk.cyan(overlay.id.padEnd(20)),
                overlay.name.slice(0, 28).padEnd(30),
                overlay.category.padEnd(15),
                ports.slice(0, 13).padEnd(15),
                requires.slice(0, 18).padEnd(20),
            ].join(' ')
        );
    }

    return lines.join('\n');
}

/**
 * Format overlay list by category (default view)
 */
function formatByCategory(overlaysConfig: OverlaysConfig): string {
    const categories = [
        { name: 'language', title: '📚 Language & Framework' },
        { name: 'database', title: '🗄️  Database & Messaging' },
        { name: 'observability', title: '📊 Observability' },
        { name: 'cloud', title: '☁️  Cloud Tools' },
        { name: 'dev', title: '🔧 Dev Tools' },
        { name: 'preset', title: '🎯 Presets' },
    ];

    const lines: string[] = [];

    for (const cat of categories) {
        const overlays = overlaysConfig.overlays.filter((o) => o.category === cat.name);
        if (overlays.length === 0) continue;

        lines.push(`\n${chalk.bold(cat.title)}`);
        for (const overlay of overlays) {
            const tags =
                overlay.tags && overlay.tags.length > 0 ? ` [${overlay.tags.join(', ')}]` : '';
            lines.push(
                `  ${chalk.cyan(overlay.id.padEnd(20))} ${chalk.gray(overlay.description)}${chalk.dim(tags)}`
            );
        }
    }

    return lines.join('\n');
}

/**
 * Execute list command
 */
export async function listCommand(overlaysConfig: OverlaysConfig, options: ListOptions) {
    try {
        let filteredOverlays = overlaysConfig.overlays;

        // Apply filters
        if (options.category) {
            const category = options.category.toLowerCase();
            filteredOverlays = filteredOverlays.filter((o) => o.category === category);
        }

        if (options.tags) {
            const requiredTags = options.tags.split(',').map((t) => t.trim().toLowerCase());
            filteredOverlays = filteredOverlays.filter((o) => {
                const overlayTags = (o.tags || []).map((t) => t.toLowerCase());
                return requiredTags.some((tag) => overlayTags.includes(tag));
            });
        }

        if (options.supports) {
            const stack = options.supports.toLowerCase();
            filteredOverlays = filteredOverlays.filter((o) => {
                // Empty supports array means supports all stacks
                if (!o.supports || o.supports.length === 0) return true;
                return o.supports.includes(stack);
            });
        }

        // Output as JSON
        if (options.json) {
            console.log(JSON.stringify(filteredOverlays, null, 2));
            return;
        }

        // Output as formatted text
        const title =
            options.category || options.tags || options.supports
                ? `Filtered Overlays (${filteredOverlays.length})`
                : 'Available Overlays';

        console.log(
            '\n' +
                boxen(chalk.bold(title), {
                    padding: 0.5,
                    borderColor: 'cyan',
                    borderStyle: 'round',
                })
        );

        // Use table format when filtering is active
        if (options.category || options.tags || options.supports) {
            console.log('\n' + formatAsTable(filteredOverlays));
        } else {
            console.log(formatByCategory(overlaysConfig));
        }

        // Help text
        console.log(
            chalk.dim(
                `\n💡 Filter examples:
  --category language          # Show only language overlays
  --tags observability         # Show overlays with 'observability' tag
  --supports compose           # Show overlays that work with compose stack
  --json                       # Output as JSON for scripting\n`
            )
        );
    } catch (error) {
        console.error(chalk.red('✗ Error listing overlays:'), error);
        process.exit(1);
    }
}
