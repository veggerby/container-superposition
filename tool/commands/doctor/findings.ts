import type {
    DiagnosticCategory,
    DiagnosticFinding,
    ExitDisposition,
    FixOutcomeSummary,
    RecheckScope,
} from '../../schema/types.js';
import type { CheckResult, DoctorReport } from './types.js';

export function checksToFindings(
    checks: CheckResult[],
    category: DiagnosticCategory,
    recheckScope: RecheckScope
): DiagnosticFinding[] {
    return checks.map((check) => {
        const id =
            check.findingId ??
            check.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
        return {
            id,
            category,
            name: check.name,
            status: check.status,
            message: check.message,
            details: check.details,
            fixEligibility: check.fixEligibility ?? 'not-applicable',
            remediationKey: check.remediationKey,
            recheckScope,
        };
    });
}

export function reportToFindings(report: DoctorReport): DiagnosticFinding[] {
    return [
        ...checksToFindings(report.environment, 'environment', 'environment'),
        ...checksToFindings(report.overlays, 'overlay', 'full'),
        ...checksToFindings(report.manifest, 'manifest', 'manifest'),
        ...checksToFindings(report.merge, 'merge', 'devcontainer'),
        ...checksToFindings(report.ports, 'ports', 'environment'),
        ...checksToFindings(report.drift, 'manifest', 'manifest'),
        ...checksToFindings(report.parameters, 'manifest', 'full'),
        ...checksToFindings(report.dependencies, 'manifest', 'full'),
        ...checksToFindings(report.portCrossValidation, 'ports', 'full'),
        ...checksToFindings(report.envExampleDrift, 'manifest', 'full'),
        ...checksToFindings(report.reproducibility, 'manifest', 'full'),
    ];
}

export function orderFindingsForRemediation(findings: DiagnosticFinding[]): DiagnosticFinding[] {
    const priority: Record<string, number> = {
        'manifest-migration': 1,
        'devcontainer-regeneration': 2,
        'dependency-fix': 3,
        'parameters-regen': 4,
        'env-example-regen': 5,
        'reproducibility-regen': 6,
        'node-version-fix': 7,
        'local-config-gitignore': 8,
        'docker-repair': 9,
    };
    return [...findings].sort((left, right) => {
        const leftPriority = priority[left.remediationKey ?? ''] ?? 99;
        const rightPriority = priority[right.remediationKey ?? ''] ?? 99;
        return leftPriority - rightPriority;
    });
}

export function buildDoctorDisposition(
    findings: DiagnosticFinding[]
): 'Blocked' | 'Needs action' | 'Can fix now' | 'Healthy' {
    const failing = findings.filter((finding) => finding.status === 'fail');
    const autoFixable = findings.filter(
        (finding) => finding.status !== 'pass' && finding.fixEligibility === 'automatic'
    );
    const manual = findings.filter(
        (finding) => finding.status !== 'pass' && finding.fixEligibility === 'manual-only'
    );

    if (failing.length > 0 && autoFixable.length === 0) {
        return 'Blocked';
    }
    if (autoFixable.length > 0) {
        return 'Can fix now';
    }
    if (manual.length > 0) {
        return 'Needs action';
    }
    return 'Healthy';
}

export function buildDoctorCounts(findings: DiagnosticFinding[]) {
    return {
        blockingIssues: findings.filter((finding) => finding.status === 'fail').length,
        safeAutoFixesAvailable: findings.filter(
            (finding) => finding.status !== 'pass' && finding.fixEligibility === 'automatic'
        ).length,
        manualFollowUpItems: findings.filter(
            (finding) => finding.status !== 'pass' && finding.fixEligibility === 'manual-only'
        ).length,
        passedChecks: findings.filter((finding) => finding.status === 'pass').length,
    };
}

export function buildDoctorActionBuckets(findings: DiagnosticFinding[]) {
    return {
        blockingIssues: findings.filter((finding) => finding.status === 'fail'),
        safeAutoFixesAvailable: findings.filter(
            (finding) => finding.status !== 'pass' && finding.fixEligibility === 'automatic'
        ),
        manualFollowUp: findings.filter(
            (finding) => finding.status !== 'pass' && finding.fixEligibility === 'manual-only'
        ),
        passedChecks: findings.filter((finding) => finding.status === 'pass'),
    };
}

export function determineExitDisposition(
    summary: FixOutcomeSummary,
    finalFindings: DiagnosticFinding[]
): ExitDisposition {
    const unresolvedFailures = finalFindings.filter((finding) => finding.status === 'fail');
    if (unresolvedFailures.length > 0) {
        return 'unresolved-failures';
    }
    if (summary.requiresManualAction > 0 || summary.skipped > 0) {
        return 'repaired-with-warnings';
    }
    return 'success';
}
