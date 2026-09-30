import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { confirm } from '@inquirer/prompts';
import { getBuiltInOverlaysDir } from '../schema/catalogs.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    GLOBAL_DEFAULTS_FILENAMES,
    hasMeaningfulLocalProjectConfig,
    isStackAwareLocalConfigTemplate,
    loadGlobalDefaults,
    loadProjectConfig,
    materializeGlobalLocalConfigTemplate,
    serializeLocalProjectConfig,
    validateMaterializedLocalConfigTemplate,
    type GlobalDefaultsSelection,
} from '../schema/project-config.js';
import { renderFrame, renderSection } from '../ux/renderers/common.js';

interface DefaultsOptions {
    json?: boolean;
}
interface RefreshOptions {
    force?: boolean;
}

export interface DefaultsResult {
    source: { selected: string | null; ignored: string | null; supportedFiles: string[] };
    effective: GlobalDefaultsSelection;
}

function loadBuiltInOverlaysConfig() {
    const overlaysDir = getBuiltInOverlaysDir();
    return loadOverlaysConfig(overlaysDir, path.join(overlaysDir, 'index.yml'));
}

export function buildDefaultsResult(): DefaultsResult {
    const loaded = loadGlobalDefaults(loadBuiltInOverlaysConfig());
    if (!loaded)
        return {
            source: {
                selected: null,
                ignored: null,
                supportedFiles: GLOBAL_DEFAULTS_FILENAMES.map((name) => `~/${name}`),
            },
            effective: {},
        };
    return {
        source: {
            selected: loaded.path,
            ignored: loaded.ignoredPath ?? null,
            supportedFiles: GLOBAL_DEFAULTS_FILENAMES.map((name) => `~/${name}`),
        },
        effective: loaded.selection,
    };
}

export function createExclusiveBackup(targetPath: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (let suffix = 0; suffix < 1000; suffix++) {
        const candidate = path.join(
            path.dirname(targetPath),
            `${path.basename(targetPath)}.backup-${timestamp}${suffix ? `-${suffix}` : ''}`
        );
        try {
            fs.copyFileSync(targetPath, candidate, fs.constants.COPYFILE_EXCL);
            return candidate;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
            throw error;
        }
    }
    throw new Error('Unable to reserve a distinct sibling backup name');
}

function atomicWrite(targetPath: string, content: string): void {
    const staged = path.join(
        path.dirname(targetPath),
        `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`
    );
    try {
        fs.writeFileSync(staged, content, { encoding: 'utf8', flag: 'wx' });
        fs.renameSync(staged, targetPath);
    } finally {
        if (fs.existsSync(staged)) fs.rmSync(staged, { force: true });
    }
}

export async function refreshLocalDefaultsCommand(options: RefreshOptions): Promise<void> {
    const overlays = loadBuiltInOverlaysConfig();
    const loaded = loadGlobalDefaults(overlays);
    if (!loaded) throw new Error('No supported global defaults file was found.');
    const template = loaded.selection.localConfigTemplate;
    if (!template)
        throw new Error(`Global defaults file ${loaded.path} has no localConfigTemplate.`);

    const project = isStackAwareLocalConfigTemplate(template) ? loadProjectConfig(overlays) : null;
    if (isStackAwareLocalConfigTemplate(template) && !project?.selection.stack) {
        throw new Error(
            'Stack-aware localConfigTemplate requires a valid canonical repository project configuration with stack: plain or compose.'
        );
    }
    const stack = project?.selection.stack;
    const selection = materializeGlobalLocalConfigTemplate(template, stack ?? 'plain');
    validateMaterializedLocalConfigTemplate(selection, stack ?? 'plain');
    if (!hasMeaningfulLocalProjectConfig(selection)) {
        throw new Error(`Global defaults file ${loaded.path} has no usable localConfigTemplate.`);
    }
    const targetPath = path.join(process.cwd(), 'superposition.local.yml');
    const content = serializeLocalProjectConfig(selection!);
    const exists = fs.existsSync(targetPath);
    if (!exists) {
        atomicWrite(targetPath, content);
        console.log(`✓ Local config created: ${targetPath}`);
        return;
    }

    if (!options.force) {
        if (!process.stdin.isTTY || !process.stdout.isTTY) {
            throw new Error(
                'Refusing to replace existing superposition.local.yml without --force when confirmation is unavailable.'
            );
        }
        const approved = await confirm({
            message:
                'Replace superposition.local.yml? Its current contents will be saved as a sibling backup.',
            default: false,
        });
        if (!approved) {
            console.log('Local config refresh cancelled; no files were changed.');
            return;
        }
    }
    const backupPath = createExclusiveBackup(targetPath);
    try {
        atomicWrite(targetPath, content);
    } catch (error) {
        throw new Error(
            `Local config replacement failed after backup ${backupPath}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
    console.log(`✓ Local config refreshed: ${targetPath}`);
    console.log(`✓ Original backup: ${backupPath}`);
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
        console.error(
            `Failed to inspect global defaults: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
    }
}
