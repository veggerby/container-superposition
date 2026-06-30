import type { FixEligibility } from '../../schema/types.js';

export interface DoctorOptions {
    output?: string;
    fromManifest?: string;
    fromProject?: boolean;
    projectRoot?: string;
    fix?: boolean;
    dryRun?: boolean;
    json?: boolean;
    allOverlays?: boolean;
}

export interface RemediationPlan {
    findingName: string;
    remediationKey: string;
    remediationAction: string;
    plannedChanges: string[];
    prerequisitesOrSkipConditions: string[];
    safetyClass: string;
}

export interface CheckResult {
    name: string;
    findingId?: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string[];
    fixable?: boolean;
    fixEligibility?: FixEligibility;
    remediationKey?: string;
}

export interface DoctorReport {
    environment: CheckResult[];
    overlays: CheckResult[];
    manifest: CheckResult[];
    merge: CheckResult[];
    ports: CheckResult[];
    drift: CheckResult[];
    parameters: CheckResult[];
    dependencies: CheckResult[];
    portCrossValidation: CheckResult[];
    envExampleDrift: CheckResult[];
    reproducibility: CheckResult[];
    summary: {
        passed: number;
        warnings: number;
        errors: number;
        fixable: number;
    };
}
