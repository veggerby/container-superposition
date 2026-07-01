import * as path from 'path';
import { findProjectConfig } from '../../schema/project-config.js';
import { classifyChangeSet } from '../../ux/semantics/change-class.js';
import { resolveNextStep } from '../../ux/semantics/next-step.js';
import { describeSource } from '../../ux/semantics/source.js';
import {
    renderFrame,
    renderList,
    renderNextStep,
    renderSection,
} from '../../ux/renderers/common.js';
import type { PlanDiffResult, PlanResult } from './types.js';

export function buildPlanPresentation(plan: PlanResult, diff: PlanDiffResult) {
    const repoHasProjectFile = findProjectConfig(process.cwd()).length > 0;
    const baseChangeClass = classifyChangeSet({
        hasExistingOutput: diff.hasExistingConfig,
        created: diff.created.length,
        updated: diff.modified.length + diff.overwritten.length,
        removed: diff.removed.length,
        unchanged: diff.unchanged.length,
    });
    const changeClass =
        baseChangeClass === 'Change intent and regenerate' &&
        repoHasProjectFile &&
        diff.hasExistingConfig &&
        plan.inputMode === 'overlay-list' &&
        diff.overlayChanges.removed.length === 0 &&
        diff.overlayChanges.added.length === 0
            ? 'Replay canonical intent'
            : baseChangeClass;

    const nextStepModel = resolveNextStep({
        command: 'plan',
        repoHasProjectFile,
        sourceKind: plan.inputMode === 'manifest' ? 'manifest' : 'cli',
        changeClass,
    });
    const nextStep = renderNextStep(nextStepModel);
    const source = describeSource({
        manifestPath: plan.inputMode === 'manifest' ? 'superposition.json' : undefined,
        hasCliSelection: plan.inputMode === 'overlay-list',
    });

    const currentSetup = [
        repoHasProjectFile ? 'shared project file present' : 'no shared project file yet',
        diff.hasExistingConfig ? 'generated output present' : 'generated output missing',
        changeClass === 'Replay canonical intent'
            ? 'intent unchanged; replay would reconcile generated output'
            : 'preview compares target intent against current output',
    ].join('; ');

    const plannedChanges = [
        `${changeClass}`,
        `files to create: ${diff.created.length}`,
        `files to update: ${diff.modified.length + diff.overwritten.length}`,
        `files to remove: ${diff.removed.length}`,
        `services/ports added: ${plan.portMappings.reduce((count, item) => count + item.ports.length, 0)}`,
    ];

    const watchOuts = [
        plan.autoAddedOverlays.length > 0
            ? `auto-added overlays: ${plan.autoAddedOverlays.join(', ')}`
            : null,
        plan.conflicts.length > 0
            ? `conflicts skipped: ${plan.conflicts.map((item) => `${item.overlay} vs ${item.conflictsWith.join(', ')}`).join('; ')}`
            : null,
        diff.removed.length > 0
            ? `stale generated files would be cleaned up: ${diff.removed.length}`
            : null,
    ].filter((item): item is string => Boolean(item));

    const normalizedPlan = {
        ...plan,
        source,
        changeClass,
        nextStep: nextStepModel,
        diff,
    };

    return {
        repoHasProjectFile,
        source,
        changeClass,
        nextStep,
        nextStepModel,
        currentSetup,
        plannedChanges,
        watchOuts,
        normalizedPlan,
    };
}

export function formatPlanAsText(input: {
    plan: PlanResult;
    headline: string;
    nextStep: string;
    currentSetup: string;
    plannedChanges: string[];
    watchOuts: string[];
}): string {
    const source = describeSource({
        manifestPath: input.plan.inputMode === 'manifest' ? 'superposition.json' : undefined,
        hasCliSelection: input.plan.inputMode === 'overlay-list',
    });
    const frame = renderFrame([
        { label: 'Mode', value: 'Preview only' },
        { label: 'Source', value: `${source.label} — ${source.detail}` },
        { label: 'Current setup', value: input.currentSetup },
        {
            label: 'What this helps you decide',
            value: 'whether this resolved intent is ready before write',
        },
    ]);

    const resolvedIntent = [
        `source of intent: ${source.label}`,
        `stack: ${input.plan.stack}`,
        `resolved overlays: ${input.plan.selectedOverlays.join(', ') || 'none'}`,
        `auto-added overlays: ${input.plan.autoAddedOverlays.join(', ') || 'none'}`,
        `skipped or conflicting overlays: ${input.plan.conflicts.map((item) => `${item.overlay} vs ${item.conflictsWith.join(', ')}`).join('; ') || 'none'}`,
        `change classification: ${input.headline}`,
    ];

    const reasons = [
        `dependency auto-adds: ${input.plan.autoAddedOverlays.join(', ') || 'none'}`,
        `conflicts: ${input.plan.conflicts.length > 0 ? 'present' : 'none'}`,
        ...(input.plan.verbose?.issues.map((issue) => issue.message) ?? []),
    ];

    const fileImpact = renderList(
        input.plan.files.map((file) => path.relative(process.cwd(), file))
    );

    return [
        frame,
        '',
        renderSection('Resolved intent', resolvedIntent),
        '',
        renderSection('Current setup', input.currentSetup),
        '',
        renderSection('Planned changes', input.plannedChanges),
        '',
        renderSection('Watch-outs', renderList(input.watchOuts, 'none')),
        '',
        renderSection('Why this plan looks this way', reasons),
        '',
        renderSection('Detailed file impact', fileImpact),
        '',
        input.nextStep,
    ].join('\n');
}

export function formatDiffAsText(diff: PlanDiffResult, headline: string, summary: string): string {
    const lines: string[] = [];
    lines.push(summary);
    lines.push('');
    lines.push(
        renderSection('Detailed file impact', [
            headline,
            `files to create: ${diff.created.length}`,
            `files to update: ${diff.modified.length + diff.overwritten.length}`,
            `files to remove: ${diff.removed.length}`,
            `files unchanged: ${diff.unchanged.length}`,
            `preserved custom files: ${diff.preserved.length}`,
        ])
    );

    const withDiff = diff.modified.filter((entry) => entry.diff);
    if (diff.created.length > 0) {
        lines.push('');
        lines.push(renderSection('Created files', renderList(diff.created)));
    }
    if (diff.overwritten.length > 0) {
        lines.push('');
        lines.push(
            renderSection(
                'Updated files without content diff',
                renderList(diff.overwritten.map((file) => `${file} (content not compared)`))
            )
        );
    }
    if (diff.removed.length > 0) {
        lines.push('');
        lines.push(renderSection('Removed files', renderList(diff.removed)));
    }
    if (diff.preserved.length > 0) {
        lines.push('');
        lines.push(renderSection('Preserved files', renderList(diff.preserved)));
    }
    if (withDiff.length > 0) {
        lines.push('');
        lines.push('Unified diff');
        for (const entry of withDiff) {
            lines.push(entry.path);
            lines.push(entry.diff ?? '');
        }
    }
    return lines.join('\n');
}
