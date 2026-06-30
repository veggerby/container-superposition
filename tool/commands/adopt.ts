import * as fs from 'fs';
import * as path from 'path';
import { select } from '@inquirer/prompts';
import type { OverlaysConfig, SuperpositionManifest } from '../schema/types.js';
import { CURRENT_MANIFEST_VERSION } from '../schema/manifest-migrations.js';
import { findProjectConfig } from '../schema/project-config.js';
import { getToolVersion } from '../utils/version.js';
import { isInsideGitRepo, createBackup, ensureBackupPatternsInGitignore } from '../utils/backup.js';
import { resolveNextStep } from '../ux/semantics/next-step.js';
import { renderFrame, renderNextStep, renderSection } from '../ux/renderers/common.js';
import { analyseDevcontainer, resolveComposePaths } from './adopt/analysis.js';
import { buildDetectionTables } from './adopt/detection.js';
import {
    buildAdoptAnalysisSections,
    buildAdoptArtifactRows,
    buildAdoptFrameRows,
    buildAdoptOutputModel,
    buildDryRunSections,
    buildStoppedSections,
    buildSuccessSections,
    buildWriteReviewSection,
    classifyAdoptConfidence,
} from './adopt/presentation.js';
import { buildProjectConfigSelection, inferBaseImageSelection } from './adopt/synthesis.js';
import type { AdoptOptions, AdoptSection } from './adopt/types.js';
import { writeAdoptArtifacts } from './adopt/write.js';

function renderSections(sections: AdoptSection[]): string {
    return sections.map((section) => renderSection(section.title, section.body)).join('\n\n');
}

export async function adoptCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: AdoptOptions
) {
    const dir = options.dir ?? './.devcontainer';
    const absoluteDir = path.resolve(dir);

    if (!fs.existsSync(absoluteDir)) {
        console.error(`Directory not found: ${absoluteDir}`);
        process.exit(1);
    }

    const devcontainerJsonPath = path.join(absoluteDir, 'devcontainer.json');
    if (!fs.existsSync(devcontainerJsonPath)) {
        console.error(`No devcontainer.json found in ${absoluteDir}`);
        process.exit(1);
    }

    const tables = buildDetectionTables(overlaysDir, overlaysConfig);
    const analysis = analyseDevcontainer(absoluteDir, overlaysConfig, tables, overlaysDir);
    const confidenceModel = classifyAdoptConfidence(analysis);
    const nextStepModel = resolveNextStep({
        command: 'adopt',
        confidence: confidenceModel.confidence,
    });

    const projectRoot = path.dirname(absoluteDir);
    const manifestPath = path.join(projectRoot, 'superposition.json');
    const customDir = path.join(absoluteDir, 'custom');
    const customPatchPath = path.join(customDir, 'devcontainer.patch.json');
    const customComposePath = path.join(customDir, 'docker-compose.patch.yml');
    const discoveredProjectFiles = findProjectConfig(projectRoot);
    if (discoveredProjectFiles.length > 1) {
        console.error(
            `Found both supported project config files in ${projectRoot}. Keep only one before continuing.`
        );
        process.exit(1);
    }
    const projectFilePath =
        discoveredProjectFiles[0]?.path ?? path.join(projectRoot, '.superposition.yml');

    const inGitRepo = isInsideGitRepo(absoluteDir);
    const shouldBackup =
        options.backup === true ? true : options.backup === false ? false : !inGitRepo;
    const backupDisposition = shouldBackup ? 'create' : 'skip';
    const backupReason = shouldBackup
        ? 'conversion may overwrite existing artifacts'
        : inGitRepo
          ? 'git repo detected'
          : 'backup disabled';

    const artifactRows = buildAdoptArtifactRows({
        projectFilePath: path.relative(process.cwd(), projectFilePath),
        manifestPath: path.relative(process.cwd(), manifestPath),
        customPatchPath: path.relative(process.cwd(), customPatchPath),
        customComposePath: path.relative(process.cwd(), customComposePath),
        hasCustomDevcontainerPatch: Boolean(analysis.customDevcontainerPatch),
        hasCustomComposePatch: Boolean(analysis.customComposePatch),
        backupDisposition,
        backupReason,
    });

    const model = buildAdoptOutputModel({
        dir: absoluteDir,
        analysis,
        confidenceModel,
        artifactRows,
    });

    if (options.json) {
        console.log(JSON.stringify(model, null, 2));
        return;
    }

    const header = renderFrame(
        buildAdoptFrameRows({
            dryRun: Boolean(options.dryRun),
            devcontainerJsonPath,
            projectFilePath,
            manifestPath,
            nextStepModel,
        })
    );
    const analysisSections = renderSections(
        buildAdoptAnalysisSections({ analysis, confidenceModel })
    );

    console.log([header, analysisSections].join('\n\n'));

    if (
        confidenceModel.confidence === 'Low confidence' ||
        confidenceModel.confidence === 'No viable conversion'
    ) {
        console.log(
            [
                '',
                renderSections(buildStoppedSections({ confidenceModel, artifactRows })),
                '',
                renderNextStep(nextStepModel),
            ].join('\n')
        );
        return;
    }

    console.log(
        ['', renderSection('Write review', buildWriteReviewSection(artifactRows).body)].join('\n')
    );

    if (options.dryRun) {
        console.log(
            [
                '',
                '(--dry-run: no files written)',
                '',
                renderSections(buildDryRunSections(nextStepModel.command)),
                '',
                renderNextStep(nextStepModel),
            ].join('\n')
        );
        return;
    }

    const existingFiles = artifactRows.filter(
        (row) => row.overwriteRisk === 'overwrite existing' || row.overwriteRisk === 'update'
    );
    if (existingFiles.length > 0 && !options.force) {
        console.log(
            'Blocked: existing conversion artifacts detected. Use --force to bypass overwrite guard only.'
        );
        return;
    }

    if (!(process.stdin.isTTY && process.stdout.isTTY)) {
        console.log('Blocked: interactive approval required to write conversion artifacts.');
        return;
    }

    const confirmation = (await select({
        message: 'Review before replay — choose next action',
        choices: [
            { name: 'Write conversion artifacts', value: 'Write conversion artifacts' },
            { name: 'Cancel', value: 'Cancel' },
        ],
        default: 'Cancel',
    })) as string;

    if (confirmation !== 'Write conversion artifacts') {
        console.log('Cancel');
        return;
    }

    let backupPath: string | undefined;
    if (shouldBackup) {
        backupPath = (await createBackup(absoluteDir, options.backupDir)) ?? undefined;
        if (backupPath) {
            ensureBackupPatternsInGitignore(absoluteDir);
        }
    }

    let devcontainer: any;
    try {
        devcontainer = JSON.parse(fs.readFileSync(devcontainerJsonPath, 'utf8'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    const composePaths = resolveComposePaths(devcontainer, absoluteDir);
    const baseImageSelection = inferBaseImageSelection(
        devcontainer,
        composePaths,
        overlaysConfig,
        analysis.suggestedStack
    );
    const projectSelection = buildProjectConfigSelection({
        analysis,
        baseImageSelection,
        projectRoot,
        absoluteDir,
        devcontainer,
    });

    const manifest: SuperpositionManifest = {
        manifestVersion: CURRENT_MANIFEST_VERSION,
        generatedBy: `container-superposition@${getToolVersion()} adopt`,
        generated: new Date().toISOString(),
        baseTemplate: analysis.suggestedStack,
        baseImage: 'bookworm',
        overlays: analysis.suggestedOverlays,
        containerName: projectSelection?.containerName,
    };

    writeAdoptArtifacts({
        manifestPath,
        projectFilePath,
        customDir,
        customPatchPath,
        customComposePath,
        manifest,
        projectSelection,
        customDevcontainerPatch: analysis.customDevcontainerPatch,
        customComposePatch: analysis.customComposePatch,
    });

    console.log(
        [
            '',
            renderSections(
                buildSuccessSections({
                    writtenPaths: [
                        path.relative(process.cwd(), projectFilePath),
                        path.relative(process.cwd(), manifestPath),
                        ...(analysis.customDevcontainerPatch
                            ? [path.relative(process.cwd(), customPatchPath)]
                            : []),
                        ...(analysis.customComposePatch
                            ? [path.relative(process.cwd(), customComposePath)]
                            : []),
                    ],
                    analysis,
                })
            ),
            '',
            renderNextStep(nextStepModel),
            ...(backupPath ? ['', `backup: ${path.relative(process.cwd(), backupPath)}`] : []),
        ].join('\n')
    );
}

export { analyseDevcontainer, resolveComposePaths, buildDetectionTables };
