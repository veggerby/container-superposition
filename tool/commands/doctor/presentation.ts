import type { DiagnosticFinding, FixExecution, FixRun } from '../../schema/types.js';
import { resolveNextStep } from '../../ux/semantics/next-step.js';
import type { DoctorMode } from '../../ux/semantics/types.js';
import {
    renderFrame,
    renderList,
    renderNextStep,
    renderSection,
} from '../../ux/renderers/common.js';
import { buildDoctorActionBuckets, buildDoctorCounts, buildDoctorDisposition } from './findings.js';
import type { RemediationPlan } from './types.js';

export function renderDoctorReportModel(input: {
    mode: DoctorMode;
    outputPath: string;
    findings: DiagnosticFinding[];
    fixPlan?: RemediationPlan[];
    executions?: FixExecution[];
    scope: string;
}): string {
    const disposition = buildDoctorDisposition(input.findings);
    const blocking = input.findings.filter((finding) => finding.status === 'fail');
    const autoFixable = input.findings.filter(
        (finding) => finding.status !== 'pass' && finding.fixEligibility === 'automatic'
    );
    const manual = input.findings.filter(
        (finding) => finding.status !== 'pass' && finding.fixEligibility === 'manual-only'
    );
    const passed = input.findings.filter((finding) => finding.status === 'pass');

    const diagnosisNextStep = resolveNextStep({
        command: 'doctor',
        hasBlockingIssues: blocking.length > 0,
    });
    const frame = renderFrame([
        { label: 'Mode', value: input.mode },
        { label: 'Verdict', value: disposition },
        { label: 'Scope', value: input.scope },
        { label: 'Source inspected', value: input.outputPath },
        {
            label: 'What needs attention',
            value:
                disposition === 'Healthy'
                    ? 'nothing blocking; checks completed cleanly'
                    : `${blocking.length} blocking, ${autoFixable.length} safe fix now, ${manual.length} manual follow-up`,
        },
        ...(!input.executions && input.mode === 'Project diagnosis' && diagnosisNextStep.command
            ? [
                  {
                      label: 'Recommended next action',
                      value: diagnosisNextStep.command,
                  },
              ]
            : []),
    ]);

    const body: string[] = [
        `Counts\nblocking: ${blocking.length} | fix now: ${autoFixable.length} | manual: ${manual.length} | healthy: ${passed.length}`,
    ];

    if (!input.executions) {
        if (blocking.length > 0) {
            body.push(
                renderSection(
                    'Do now',
                    renderList(
                        blocking.map(
                            (finding) =>
                                `${finding.name} — ${finding.message} — ${finding.fixEligibility === 'automatic' ? 'auto-fix available' : 'manual only'}`
                        ),
                        'none'
                    )
                )
            );
        }

        if (autoFixable.length > 0) {
            if (body.length > 0) body.push('');
            body.push(
                renderSection(
                    'Can fix now',
                    renderList(
                        autoFixable.map(
                            (finding) => `${finding.name} — ${finding.message} — auto-fix available`
                        ),
                        'none'
                    )
                )
            );
        }

        if (manual.length > 0) {
            if (body.length > 0) body.push('');
            body.push(
                renderSection(
                    'Review next',
                    renderList(
                        manual.map(
                            (finding) => `${finding.name} — ${finding.message} — manual only`
                        ),
                        'none'
                    )
                )
            );
        }

        if (disposition === 'Healthy') {
            if (body.length > 0) body.push('');
            body.push(
                renderSection('Healthy checks', [
                    `${passed.length} checks already healthy`,
                    'No files changed',
                ])
            );
        } else if (passed.length > 0 && input.mode === 'Catalog validation') {
            if (body.length > 0) body.push('');
            body.push(
                renderSection(
                    'Healthy checks',
                    renderList(
                        passed.map((finding) => `${finding.name} — already healthy`),
                        'none'
                    )
                )
            );
        } else if (passed.length > 0) {
            if (body.length > 0) body.push('');
            body.push(renderSection('Healthy checks', [`${passed.length} checks already healthy`]));
        }
    }

    if (input.fixPlan) {
        body.push(
            '',
            renderSection(
                'Fix plan',
                renderList(
                    input.fixPlan.map(
                        (item) =>
                            `${item.findingName} | action ${item.remediationAction} | artifacts ${item.plannedChanges.join('; ') || 'no file changes'} | prerequisites/skip ${item.prerequisitesOrSkipConditions.join('; ') || 'none'} | safety class ${item.safetyClass}`
                    ),
                    'Nothing to apply'
                )
            )
        );
    }

    if (input.executions) {
        body.push(
            '',
            renderSection(
                'Fixed now',
                renderList(
                    input.executions
                        .filter(
                            (execution) =>
                                execution.outcome === 'fixed' ||
                                execution.outcome === 'already-compliant'
                        )
                        .map((execution) => `${execution.remediationKey} — ${execution.reason}`),
                    'none'
                )
            ),
            '',
            renderSection(
                'Skipped',
                renderList(
                    input.executions
                        .filter((execution) => execution.outcome === 'skipped')
                        .map((execution) => `${execution.remediationKey} — ${execution.reason}`),
                    'none'
                )
            ),
            '',
            renderSection(
                'Still needs action',
                renderList(
                    input.executions
                        .filter((execution) => execution.outcome === 'requires-manual-action')
                        .map((execution) => `${execution.remediationKey} — ${execution.reason}`),
                    'none'
                )
            )
        );

        if (passed.length > 0) {
            body.push(
                '',
                renderSection('Healthy checks', [`${passed.length} checks already healthy`])
            );
        }
    }

    if (input.executions && diagnosisNextStep.command) {
        body.push('', renderNextStep(diagnosisNextStep));
    }
    return [frame, '', ...body].join('\n');
}

export function formatFixRunText(fixRun: FixRun, scope: string): string {
    return renderDoctorReportModel({
        mode: 'Project safe fixes',
        outputPath: fixRun.outputPath,
        findings: fixRun.finalFindings,
        executions: fixRun.executions,
        scope,
    });
}

export function buildDoctorJsonModel<T extends object>(input: {
    base: T;
    findings: DiagnosticFinding[];
    mode: DoctorMode;
    scope: string;
    fixPlan?: RemediationPlan[];
    note?: string;
    previewOnly?: boolean;
    dryRun?: boolean;
    includeActionBuckets?: boolean;
}): T & {
    mode: DoctorMode;
    disposition: ReturnType<typeof buildDoctorDisposition>;
    scope: string;
    counts: ReturnType<typeof buildDoctorCounts>;
    actionBuckets?: ReturnType<typeof buildDoctorActionBuckets>;
    fixPlan?: RemediationPlan[];
    note?: string;
    previewOnly?: boolean;
    dryRun?: boolean;
} {
    return {
        ...input.base,
        mode: input.mode,
        disposition: buildDoctorDisposition(input.findings),
        scope: input.scope,
        counts: buildDoctorCounts(input.findings),
        ...(input.includeActionBuckets
            ? { actionBuckets: buildDoctorActionBuckets(input.findings) }
            : {}),
        ...(input.fixPlan ? { fixPlan: input.fixPlan } : {}),
        ...(input.note ? { note: input.note } : {}),
        ...(input.previewOnly ? { previewOnly: true } : {}),
        ...(input.dryRun ? { dryRun: true } : {}),
    };
}
