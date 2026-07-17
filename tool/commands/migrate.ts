import * as fs from 'fs';
import * as path from 'path';
import {
    findManifestFile,
    findProjectConfig,
    buildAnswersFromManifest,
    buildProjectConfigSelectionFromAnswers,
    writeProjectConfig,
} from '../schema/project-config.js';
import { loadManifest } from '../schema/manifest-migrations.js';
import { mergeAnswers } from '../questionnaire/answers.js';
import { loadOverlaysConfigWrapper } from '../questionnaire/questionnaire.js';
import { buildArtifactRow } from '../ux/semantics/artifacts.js';
import { resolveNextStep } from '../ux/semantics/next-step.js';
import { renderArtifactTable, renderFrame, renderSection } from '../ux/renderers/common.js';

export interface MigrateOptions {
    fromManifest?: string;
    output?: string;
    force?: boolean;
}

export async function migrateCommand(options: MigrateOptions): Promise<void> {
    const manifestPath = findManifestFile(options.fromManifest);
    if (!manifestPath) {
        console.error('No legacy source found: superposition.json missing.');
        console.error('Run `cs init` to create shared project file instead.');
        process.exit(1);
    }

    const loadedManifest = loadManifest(manifestPath);
    if (!loadedManifest) {
        process.exit(1);
    }

    let projectFilePath: string;
    if (options.output) {
        projectFilePath = path.resolve(options.output);
    } else {
        const discovered = findProjectConfig(process.cwd());
        if (discovered.length > 1) {
            console.error(
                'Blocked: found both .superposition.yml and superposition.yml. Keep one.'
            );
            process.exit(1);
        }
        projectFilePath = discovered[0]?.path ?? path.join(process.cwd(), '.superposition.yml');
    }

    if (fs.existsSync(projectFilePath) && !options.force) {
        console.error(
            `Blocked: project file already exists at ${path.relative(process.cwd(), projectFilePath)}.`
        );
        console.error('Use --force to bypass overwrite guard only.');
        process.exit(1);
    }

    const overlaysConfig = loadOverlaysConfigWrapper();
    const manifestAnswers = buildAnswersFromManifest(
        loadedManifest,
        overlaysConfig,
        path.dirname(manifestPath)
    );
    const answers = mergeAnswers(manifestAnswers);
    const projectSelection = buildProjectConfigSelectionFromAnswers(answers);
    const nextStep = resolveNextStep({ command: 'migrate' });

    const frame = renderFrame([
        { label: 'Mode', value: 'Migrate legacy manifest workflow' },
        {
            label: 'This path is for',
            value: 'legacy manifest-only repos moving to canonical shared project file',
        },
        { label: 'Source analyzed', value: path.relative(process.cwd(), manifestPath) },
        { label: 'What will be written', value: path.relative(process.cwd(), projectFilePath) },
        { label: 'Generated output', value: 'unchanged by this command' },
    ]);

    const artifactRows = [
        buildArtifactRow({
            artifact: path.relative(process.cwd(), projectFilePath),
            role: 'Canonical shared intent',
            action: fs.existsSync(projectFilePath) ? 'overwrite' : 'create',
            backupDisposition: 'not needed',
            backupReason: 'migrate writes project file only',
        }),
    ];

    console.log(
        [
            frame,
            '',
            renderSection('Why migrate fits this repo', [
                'manifest already describes legacy intent',
                'migrate writes canonical shared project file without replaying generated output',
            ]),
            '',
            renderSection('Write review', [
                `source manifest path: ${path.relative(process.cwd(), manifestPath)}`,
                `target project file path: ${path.relative(process.cwd(), projectFilePath)}`,
                `overwrite guard state: ${fs.existsSync(projectFilePath) ? (options.force ? 'force bypass active' : 'would block without --force') : 'clear'}`,
                'compatibility note: generated output stays same until `cs regen`',
            ]),
            '',
            renderArtifactTable(artifactRows),
            '',
            renderSection('What stays unchanged', [
                'existing generated output',
                'devcontainer artifacts until replay with `cs regen`',
            ]),
        ].join('\n')
    );

    writeProjectConfig(projectFilePath, projectSelection);

    console.log(
        [
            '',
            renderSection('Written now', [
                `project file created or updated: ${path.relative(process.cwd(), projectFilePath)}`,
            ]),
            '',
            renderSection('Generated output status', ['unchanged by migrate']),
            '',
            renderSection('Next checklist', [
                `1. run ${nextStep.command ?? 'cs regen'}`,
                '2. inspect regenerated output',
                '3. commit canonical shared project file once replay looks right',
            ]),
            '',
            renderSection('Optional validation', ['run `cs doctor` after replay']),
        ].join('\n')
    );
}
