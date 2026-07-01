import { describe, expect, it } from 'vitest';
import { buildOutcomeSummary, buildRemediationPlan } from '../commands/doctor/fixes.js';

describe('doctor fixes helpers', () => {
    it('builds remediation plan entries from automatic findings only', () => {
        const plan = buildRemediationPlan([
            {
                name: 'Manifest version',
                status: 'warn',
                fixEligibility: 'automatic',
                remediationKey: 'manifest-migration',
            },
            {
                name: 'Docker daemon',
                status: 'warn',
                fixEligibility: 'manual-only',
                remediationKey: 'docker-repair',
            },
        ] as any);

        expect(plan).toHaveLength(1);
        expect(plan[0]).toEqual(
            expect.objectContaining({
                findingName: 'Manifest version',
                remediationKey: 'manifest-migration',
                remediationAction: 'manifest-migration',
            })
        );
    });

    it('summarizes execution outcomes across buckets', () => {
        expect(
            buildOutcomeSummary([
                { outcome: 'fixed' },
                { outcome: 'already-compliant' },
                { outcome: 'skipped' },
                { outcome: 'requires-manual-action' },
            ] as any)
        ).toEqual({
            fixed: 1,
            alreadyCompliant: 1,
            skipped: 1,
            requiresManualAction: 1,
            total: 4,
        });
    });
});
