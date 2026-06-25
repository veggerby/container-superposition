import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type { OverlaysConfig, PresetParameter, OverlayMetadata } from '../schema/types.js';
import { describeSource } from '../ux/semantics/source.js';
import { resolveNextStep } from '../ux/semantics/next-step.js';
import { renderFrame, renderList, renderNextStep, renderSection } from '../ux/renderers/common.js';

interface ExplainOptions {
    json?: boolean;
}

function getOverlayFiles(overlaysDir: string, overlayId: string): string[] {
    const overlayDir = path.join(overlaysDir, overlayId);
    if (!fs.existsSync(overlayDir)) return [];
    return fs
        .readdirSync(overlayDir)
        .filter((file) => file === '.env.example' || !file.startsWith('.'))
        .sort();
}

function getDevcontainerPatch(overlaysDir: string, overlayId: string): any {
    const patchPath = path.join(overlaysDir, overlayId, 'devcontainer.patch.json');
    if (!fs.existsSync(patchPath)) return null;
    return JSON.parse(fs.readFileSync(patchPath, 'utf8'));
}

function getDockerComposeServices(overlaysDir: string, overlayId: string): string[] {
    const composePath = path.join(overlaysDir, overlayId, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) return [];
    const parsed = yaml.load(fs.readFileSync(composePath, 'utf8')) as any;
    return Object.keys(parsed?.services ?? {});
}

function loadPresetDefinition(overlaysDir: string, presetId: string): Record<string, any> | null {
    const presetPath = path.join(overlaysDir, '.presets', `${presetId}.yml`);
    if (!fs.existsSync(presetPath)) return null;
    return (yaml.load(fs.readFileSync(presetPath, 'utf8')) as Record<string, any>) ?? null;
}

function inferBestFor(overlay: OverlayMetadata): string {
    if (overlay.category === 'preset') {
        return `teams starting from ${overlay.name.toLowerCase()}`;
    }
    if (overlay.category === 'messaging') {
        return 'event-driven or async service work';
    }
    if (overlay.category === 'database') {
        return 'local data dependencies';
    }
    if (overlay.category === 'observability') {
        return 'telemetry and service debugging';
    }
    return overlay.description;
}

function buildExplainModel(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    overlay: OverlayMetadata
) {
    const patch = getDevcontainerPatch(overlaysDir, overlay.id);
    const services = getDockerComposeServices(overlaysDir, overlay.id);
    const files = getOverlayFiles(overlaysDir, overlay.id);
    const presetDefinition =
        overlay.category === 'preset' ? loadPresetDefinition(overlaysDir, overlay.id) : null;
    const adds = [
        overlay.description,
        ...(services.length > 0 ? [`compose services: ${services.join(', ')}`] : []),
        ...(overlay.ports && overlay.ports.length > 0
            ? [`ports: ${overlay.ports.join(', ')}`]
            : []),
        ...(patch?.customizations?.vscode?.extensions?.length > 0
            ? [`VS Code extensions: ${patch.customizations.vscode.extensions.join(', ')}`]
            : []),
    ];
    const previewNotes = [
        overlay.supports && overlay.supports.length > 0
            ? `supports: ${overlay.supports.join(', ')}`
            : 'supports: plain, compose',
        overlay.conflicts && overlay.conflicts.length > 0
            ? `conflicts to watch: ${overlay.conflicts.join(', ')}`
            : 'conflicts to watch: none',
    ];
    const filesServicesPorts = [
        ...(files.length > 0 ? files.map((file) => `file: ${file}`) : []),
        ...(services.length > 0 ? services.map((service) => `service: ${service}`) : []),
        ...(overlay.ports ?? []).map((port) => `port: ${port}`),
    ];

    return {
        id: overlay.id,
        name: overlay.name,
        bestFor: inferBestFor(overlay),
        adds,
        dependsOn: overlay.requires ?? [],
        conflictsWith: overlay.conflicts ?? [],
        previewNotes,
        filesServicesPorts,
        tryThisNext: `cs plan --stack ${overlay.supports?.[0] ?? 'compose'} --overlays ${overlay.id}`,
        files,
        devcontainerPatch: patch,
        dockerComposeServices: services,
        presetDefinition,
    };
}

function formatPresetChoices(parameters: Record<string, PresetParameter>): string[] {
    return Object.entries(parameters).map(([key, value]) => {
        const options = value.options.map((option) => option.id).join(', ');
        return `${key}: default ${value.default}; choices ${options}`;
    });
}

export async function explainCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    overlayId: string,
    options: ExplainOptions
) {
    try {
        const overlay = overlaysConfig.overlays.find((item) => item.id === overlayId);
        if (!overlay) {
            console.error(`Not found: ${overlayId}`);
            console.log('Try `cs list` to browse available overlays.');
            process.exit(1);
        }

        const source = describeSource({ hasCliSelection: true });
        const nextStepModel = resolveNextStep({ command: 'explain' });
        const model = {
            source,
            overlay: buildExplainModel(overlaysConfig, overlaysDir, overlay),
            nextStep: nextStepModel,
        };

        if (options.json) {
            console.log(JSON.stringify(model, null, 2));
            return;
        }

        const frame = renderFrame([
            { label: 'Mode', value: 'Inspection' },
            { label: 'Source', value: `${source.label} — ${source.detail}` },
            {
                label: 'What this helps you decide',
                value: 'whether this overlay or preset fits before preview',
            },
        ]);

        const sections = [
            renderSection('Best for', model.overlay.bestFor),
            '',
            renderSection('Adds', renderList(model.overlay.adds, 'none')),
            '',
            renderSection('Depends on', renderList(model.overlay.dependsOn, 'none')),
            '',
            renderSection('Conflicts with', renderList(model.overlay.conflictsWith, 'none')),
            '',
            renderSection('Preview notes', renderList(model.overlay.previewNotes, 'none')),
            '',
            renderSection(
                'Files, services, and ports',
                renderList(model.overlay.filesServicesPorts, 'none')
            ),
        ];

        if (model.overlay.presetDefinition?.parameters) {
            sections.push(
                '',
                renderSection(
                    'Choices you can make',
                    renderList(
                        formatPresetChoices(
                            model.overlay.presetDefinition.parameters as Record<
                                string,
                                PresetParameter
                            >
                        ),
                        'none'
                    )
                )
            );
        }

        sections.push(
            '',
            renderSection('Try this next', model.overlay.tryThisNext),
            '',
            renderNextStep(nextStepModel)
        );
        console.log([frame, '', ...sections].join('\n'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
