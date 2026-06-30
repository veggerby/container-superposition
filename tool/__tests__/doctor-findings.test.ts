import { describe, expect, it } from 'vitest';
import {
    buildDoctorDisposition,
    checksToFindings,
    determineExitDisposition,
    orderFindingsForRemediation,
} from '../commands/doctor/findings.js';

describe('doctor findings helpers', () => {
    it('normalizes check metadata into stable findings', () => {
        const findings = checksToFindings(
            [
                {
                    name: 'Manifest version',
                    findingId: 'manifest-version',
                    status: 'warn',
                    message: 'legacy',
                    fixEligibility: 'automatic',
                    remediationKey: 'manifest-migration',
                },
            ],
            'manifest',
            'manifest'
        );

        expect(findings).toEqual([
            expect.objectContaining({
                id: 'manifest-version',
                category: 'manifest',
                recheckScope: 'manifest',
                fixEligibility: 'automatic',
                remediationKey: 'manifest-migration',
            }),
        ]);
    });

    it('orders remediation prerequisites before downstream regeneration', () => {
        const ordered = orderFindingsForRemediation([
            { id: 'regen', remediationKey: 'devcontainer-regeneration' },
            { id: 'migrate', remediationKey: 'manifest-migration' },
            { id: 'node', remediationKey: 'node-version-fix' },
        ] as any);

        expect(ordered.map((finding) => finding.id)).toEqual(['migrate', 'regen', 'node']);
    });

    it('derives dispositions and exit outcomes from final findings', () => {
        expect(
            buildDoctorDisposition([
                { status: 'warn', fixEligibility: 'manual-only' },
                { status: 'pass', fixEligibility: 'not-applicable' },
            ] as any)
        ).toBe('Needs action');

        expect(
            determineExitDisposition(
                { fixed: 1, alreadyCompliant: 0, skipped: 0, requiresManualAction: 0, total: 1 },
                [{ status: 'pass' }] as any
            )
        ).toBe('success');

        expect(
            determineExitDisposition(
                { fixed: 1, alreadyCompliant: 0, skipped: 0, requiresManualAction: 0, total: 1 },
                [{ status: 'fail' }] as any
            )
        ).toBe('unresolved-failures');
    });
});
