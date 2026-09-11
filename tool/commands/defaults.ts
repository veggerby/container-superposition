import * as path from 'path';
import * as yaml from 'js-yaml';
import { getBuiltInOverlaysDir } from '../schema/catalogs.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    GLOBAL_DEFAULTS_FILENAMES,
    type GlobalDefaultsSelection,
    loadGlobalDefaults,
} from '../schema/project-config.js';
import { renderFrame, renderSection } from '../ux/renderers/common.js';

interface DefaultsOptions {
    json?: boolean;
}

export interface DefaultsResult {
    source: {
        selected: string | null;
        ignored: string | null;
        supportedFiles: string[];
    };
    effective: GlobalDefaultsSelection;
}

function loadBuiltInOverlaysConfig() {
    const overlaysDir = getBuiltInOverlaysDir();
    return loadOverlaysConfig(overlaysDir, path.join(overlaysDir, 'index.yml'));
}

export function buildDefaultsResult(): DefaultsResult {
    const loaded = loadGlobalDefaults(loadBuiltInOverlaysConfig());
    if (!loaded) {
        return {
            source: {
                selected: null,
                ignored: null,
                supportedFiles: GLOBAL_DEFAULTS_FILENAMES.map((fileName) => `~/${fileName}`),
            },
            effective: {},
        };
    }

    return {
        source: {
            selected: loaded.path,
            ignored: loaded.ignoredPath ?? null,
            supportedFiles: GLOBAL_DEFAULTS_FILENAMES.map((fileName) => `~/${fileName}`),
        },
        effective: loaded.selection,
    };
}

export async function defaultsCommand(options: DefaultsOptions): Promise<void> {
    try {
        const result = buildDefaultsResult();

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }

        const sourceSummary = result.source.selected
            ? result.source.ignored
                ? `${result.source.selected} selected; ${result.source.ignored} ignored by precedence`
                : `${result.source.selected} selected`
            : 'none found; effective defaults are empty';

        const frame = renderFrame([
            { label: 'Mode', value: 'Global defaults inspection' },
            { label: 'Source', value: sourceSummary },
            {
                label: 'Precedence',
                value: '~/.container-superposition.yml wins over ~/.superposition.yml',
            },
            {
                label: 'Authority',
                value: 'read-only bootstrap inspection only; not replay or remediation input',
            },
        ]);

        const effectiveYaml = yaml.dump(result.effective, {
            lineWidth: 120,
            noRefs: true,
            sortKeys: false,
        });
        console.log(
            [
                frame,
                '',
                renderSection('Effective document', effectiveYaml.trim() || '{}'),
                '',
                renderSection('No writes', [
                    'does not create or edit project files, generated output, home files, caches, or Git index state',
                    'values are printed exactly as authored after parser normalization; no variable expansion is applied',
                ]),
            ].join('\n')
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to inspect global defaults: ${message}`);
        process.exit(1);
    }
}
