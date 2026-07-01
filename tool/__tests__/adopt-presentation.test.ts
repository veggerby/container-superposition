import { describe, it, expect } from 'vitest';
import {
    buildAdoptAnalysisSections,
    buildAdoptOutputModel,
    classifyAdoptConfidence,
} from '../commands/adopt/presentation.js';
import type { AnalysisResult } from '../commands/adopt/types.js';

function buildAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return {
        detections: [],
        unmatchedItems: [],
        customDevcontainerPatch: null,
        customComposePatch: null,
        suggestedStack: 'plain',
        suggestedOverlays: [],
        suggestedCommand: 'container-superposition init --stack plain',
        hasDockerCompose: false,
        ...overrides,
    };
}

describe('adopt presentation module', () => {
    it('classifyAdoptConfidence returns high confidence for mostly exact matches', () => {
        const result = classifyAdoptConfidence(
            buildAnalysis({
                detections: [
                    {
                        source: 'ghcr.io/devcontainers/features/node:1',
                        overlayId: 'nodejs',
                        confidence: 'exact',
                        sourceType: 'feature',
                    },
                ],
                suggestedOverlays: ['nodejs'],
            })
        );

        expect(result).toEqual({
            confidence: 'High confidence',
            recommendation: 'safe to review',
            reasons: ['mostly exact overlay matches', 'no preserved leftovers'],
        });
    });

    it('buildAdoptAnalysisSections preserves the expected section order', () => {
        const sections = buildAdoptAnalysisSections({
            analysis: buildAnalysis({
                unmatchedItems: [
                    { source: 'extension: custom.tool', reason: 'preserve in custom patch' },
                ],
                suggestedOverlays: ['nodejs'],
            }),
            confidenceModel: {
                confidence: 'Mixed confidence',
                recommendation: 'review carefully',
                reasons: ['conversion keeps managed overlays and preserved patches side by side'],
            },
        });

        expect(sections.map((section) => section.title)).toEqual([
            'Confidence',
            'Will become managed',
            'Will be preserved',
            'Needs manual review',
            'Why confidence is not higher',
        ]);
    });

    it('buildAdoptOutputModel keeps JSON parity fields aligned', () => {
        const analysis = buildAnalysis({
            unmatchedItems: [{ source: 'feature: custom', reason: 'preserve' }],
            suggestedOverlays: ['nodejs'],
        });
        const confidenceModel = {
            confidence: 'Mixed confidence' as const,
            recommendation: 'review carefully',
            reasons: ['preserved tail present'],
        };
        const model = buildAdoptOutputModel({
            dir: '/repo/.devcontainer',
            analysis,
            confidenceModel,
            artifactRows: [],
        });

        expect(model).toMatchObject({
            dir: '/repo/.devcontainer',
            confidence: 'Mixed confidence',
            recommendation: 'review carefully',
            confidenceReasons: ['preserved tail present'],
            managed: ['nodejs'],
            preserved: [{ source: 'feature: custom', reason: 'preserve' }],
            manualReview: [{ source: 'feature: custom', reason: 'preserve' }],
            artifactWrites: [],
        });
    });
});
