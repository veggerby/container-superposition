import type {
    ArtifactReviewRow,
    FrameRow,
    LocalConfigTrust,
    NextStep,
} from '../semantics/types.js';

function lines(items: string[]): string {
    return items.filter(Boolean).join('\n');
}

export function renderFrame(rows: FrameRow[]): string {
    return lines(rows.map((row) => `${row.label}: ${row.value}`));
}

export function renderSection(title: string, body: string | string[]): string {
    const rendered = Array.isArray(body) ? body.join('\n') : body;
    return `${title}\n${rendered || 'none'}`;
}

export function renderList(items: string[], empty = 'none'): string {
    if (items.length === 0) {
        return empty;
    }
    return items.map((item) => `- ${item}`).join('\n');
}

export function renderNextStep(nextStep: NextStep): string {
    return `Next step\n${nextStep.command ?? 'No next step suggested'}\n${nextStep.reason}`;
}

export function renderArtifactTable(rows: ArtifactReviewRow[]): string {
    const header = 'Artifact | Role | Action | Overwrite risk | Backup';
    const divider = '--- | --- | --- | --- | ---';
    const body = rows.map(
        (row) =>
            `${row.artifact} | ${row.role} | ${row.action} | ${row.overwriteRisk} | ${row.backup}`
    );
    return [header, divider, ...body].join('\n');
}

export function renderLocalConfigTrust(trust: LocalConfigTrust): string {
    const applied = trust.appliedFields.length > 0 ? trust.appliedFields.join(', ') : 'none';
    const unsupported =
        trust.unsupportedFields.length > 0 ? trust.unsupportedFields.join(', ') : 'none';
    return lines([
        `path: ${trust.path ?? 'none'}`,
        `applied fields: ${applied}`,
        `unsupported fields: ${unsupported}`,
        `git-ignore safety: ${trust.gitIgnoreSafe ? 'present' : 'missing'}`,
        `tracked-file cleanup: ${trust.trackedCleanupManual ? 'manual follow-up' : 'not needed'}`,
        `disposition: ${trust.disposition}`,
    ]);
}
