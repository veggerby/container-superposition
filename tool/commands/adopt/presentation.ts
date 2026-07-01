import * as fs from 'fs';
import * as path from 'path';
import { buildArtifactRow } from '../../ux/semantics/artifacts.js';
import { renderArtifactTable, renderList } from '../../ux/renderers/common.js';
import type {
    AdoptArtifactRowsInput,
    AdoptConfidenceModel,
    AdoptFrameInput,
    AdoptFrameRows,
    AdoptOutputModel,
    AdoptSection,
    AdoptSuccessSectionsInput,
    AnalysisResult,
} from './types.js';

export function classifyAdoptConfidence(analysis: AnalysisResult): AdoptConfidenceModel {
    const exact = analysis.detections.filter((item) => item.confidence === 'exact').length;
    const heuristic = analysis.detections.filter((item) => item.confidence === 'heuristic').length;
    const unmatched = analysis.unmatchedItems.length;
    const totalSignals = exact + heuristic + unmatched;

    if (analysis.suggestedOverlays.length === 0 || totalSignals === 0) {
        return {
            confidence: 'No viable conversion',
            recommendation: 'use init instead',
            reasons: ['no strong overlay mapping found'],
        };
    }

    if (exact >= Math.max(1, heuristic) && unmatched <= 1) {
        return {
            confidence: 'High confidence',
            recommendation: 'safe to review',
            reasons: [
                'mostly exact overlay matches',
                unmatched === 0 ? 'no preserved leftovers' : 'small preserved tail',
            ],
        };
    }

    if (exact + heuristic >= unmatched) {
        return {
            confidence: 'Mixed confidence',
            recommendation: 'review carefully',
            reasons: ['conversion keeps managed overlays and preserved patches side by side'],
        };
    }

    return {
        confidence: 'Low confidence',
        recommendation: 'use init instead',
        reasons: ['manual review area larger than managed mapping'],
    };
}

export function buildAdoptArtifactRows(input: AdoptArtifactRowsInput) {
    const rows = [
        buildArtifactRow({
            artifact: input.projectFilePath,
            role: 'Canonical shared intent',
            action: fs.existsSync(input.projectFilePath) ? 'overwrite' : 'create',
            backupDisposition: input.backupDisposition,
            backupReason: input.backupReason,
        }),
        buildArtifactRow({
            artifact: input.manifestPath,
            role: 'Compatibility artifact',
            action: fs.existsSync(input.manifestPath) ? 'overwrite' : 'create',
            backupDisposition: input.backupDisposition,
            backupReason: input.backupReason,
        }),
    ];

    if (input.hasCustomDevcontainerPatch) {
        rows.push(
            buildArtifactRow({
                artifact: input.customPatchPath,
                role: 'Preservation artifact',
                action: fs.existsSync(input.customPatchPath) ? 'overwrite' : 'create',
                backupDisposition: input.backupDisposition,
                backupReason: input.backupReason,
            })
        );
    }

    if (input.hasCustomComposePatch) {
        rows.push(
            buildArtifactRow({
                artifact: input.customComposePath,
                role: 'Preservation artifact',
                action: fs.existsSync(input.customComposePath) ? 'overwrite' : 'create',
                backupDisposition: input.backupDisposition,
                backupReason: input.backupReason,
            })
        );
    }

    return rows;
}

export function buildAdoptOutputModel(input: {
    dir: string;
    analysis: AnalysisResult;
    confidenceModel: AdoptConfidenceModel;
    artifactRows: ReturnType<typeof buildAdoptArtifactRows>;
}): AdoptOutputModel {
    return {
        dir: input.dir,
        detections: input.analysis.detections,
        unmatchedItems: input.analysis.unmatchedItems,
        customDevcontainerPatch: input.analysis.customDevcontainerPatch,
        customComposePatch: input.analysis.customComposePatch,
        suggestedStack: input.analysis.suggestedStack,
        suggestedOverlays: input.analysis.suggestedOverlays,
        suggestedCommand: input.analysis.suggestedCommand,
        confidence: input.confidenceModel.confidence,
        recommendation: input.confidenceModel.recommendation,
        confidenceReasons: input.confidenceModel.reasons,
        managed: input.analysis.suggestedOverlays,
        preserved: input.analysis.unmatchedItems,
        manualReview: input.analysis.unmatchedItems,
        artifactWrites: input.artifactRows,
    };
}

export function buildAdoptFrameRows(input: AdoptFrameInput): AdoptFrameRows {
    return [
        {
            label: 'Mode',
            value: 'Adopt existing handwritten setup',
        },
        {
            label: 'This path is for',
            value: 'existing handwritten devcontainer setup you want tool to map into managed intent',
        },
        {
            label: 'Source analyzed',
            value: path.relative(process.cwd(), input.devcontainerJsonPath),
        },
        {
            label: 'What will be written',
            value: input.dryRun
                ? 'nothing yet — preview only'
                : [
                      path.relative(process.cwd(), input.projectFilePath),
                      path.relative(process.cwd(), input.manifestPath),
                  ].join(', '),
        },
        { label: 'Generated output', value: 'unchanged by this command' },
        {
            label: 'Recommended next action',
            value: input.nextStepModel.command ?? 'No next step suggested',
        },
    ];
}

export function buildAdoptAnalysisSections(input: {
    analysis: AnalysisResult;
    confidenceModel: AdoptConfidenceModel;
}): AdoptSection[] {
    const sections: AdoptSection[] = [
        {
            title: 'Confidence',
            body: [
                input.confidenceModel.confidence,
                `recommendation: ${input.confidenceModel.recommendation}`,
            ],
        },
        {
            title: 'Will become managed',
            body: renderList(input.analysis.suggestedOverlays, 'none'),
        },
        {
            title: 'Will be preserved',
            body: renderList(
                input.analysis.unmatchedItems.map((item) => `${item.source} — ${item.reason}`),
                'none'
            ),
        },
        {
            title: 'Needs manual review',
            body: renderList(
                input.analysis.unmatchedItems.map((item) => item.source),
                'none'
            ),
        },
    ];

    if (input.confidenceModel.confidence !== 'High confidence') {
        sections.push({
            title: 'Why confidence is not higher',
            body: renderList(input.confidenceModel.reasons, 'none'),
        });
    }

    return sections;
}

export function buildStoppedSections(input: {
    confidenceModel: AdoptConfidenceModel;
    artifactRows: ReturnType<typeof buildAdoptArtifactRows>;
}): AdoptSection[] {
    return [
        {
            title: 'Why conversion stopped',
            body: renderList(input.confidenceModel.reasons, 'none'),
        },
        {
            title: 'Write review',
            body: [
                'Not recommended to write from this analysis.',
                renderArtifactTable(input.artifactRows),
            ],
        },
    ];
}

export function buildWriteReviewSection(
    artifactRows: ReturnType<typeof buildAdoptArtifactRows>
): AdoptSection {
    return {
        title: 'Write review',
        body: renderArtifactTable(artifactRows),
    };
}

export function buildDryRunSections(nextStepCommand: string | null): AdoptSection[] {
    return [
        {
            title: 'Next step',
            body: [
                'review project file ownership model before replay',
                nextStepCommand ?? 'No next step suggested',
            ],
        },
    ];
}

export function buildSuccessSections(input: AdoptSuccessSectionsInput): AdoptSection[] {
    const sections: AdoptSection[] = [
        {
            title: 'Written now',
            body: renderList(input.writtenPaths),
        },
        {
            title: 'Managed going forward',
            body: renderList(input.analysis.suggestedOverlays, 'none'),
        },
        {
            title: 'Preserved for now',
            body: renderList(
                input.analysis.unmatchedItems.map((item) => item.source),
                'none'
            ),
        },
        {
            title: 'Still needs review',
            body: renderList(
                input.analysis.unmatchedItems.map((item) => item.reason),
                'none'
            ),
        },
        {
            title: 'Generated output status',
            body: ['generated output unchanged', 'review before replay'],
        },
        {
            title: 'Next checklist',
            body: [
                '1. review generated project file and preserved custom artifacts',
                '2. run `cs regen` to replay canonical intent',
                '3. run `cs doctor` after replay',
            ],
        },
    ];

    return sections;
}
