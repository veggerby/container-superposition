import * as fs from 'fs';
import type { ArtifactReviewRow, ArtifactRole, BackupDisposition, OverwriteRisk } from './types.js';

function overwriteRiskFor(path: string, action: string): OverwriteRisk {
    const exists = fs.existsSync(path);
    if (action === 'unchanged') {
        return 'unchanged';
    }
    if (!exists) {
        return 'new';
    }
    return action === 'overwrite' ? 'overwrite existing' : 'update';
}

function backupLabel(disposition: BackupDisposition, reason: string): string {
    return `${disposition} — ${reason}`;
}

export function buildArtifactRow(input: {
    artifact: string;
    role: ArtifactRole;
    action: string;
    backupDisposition: BackupDisposition;
    backupReason: string;
}): ArtifactReviewRow {
    return {
        artifact: input.artifact,
        role: input.role,
        action: input.action,
        overwriteRisk: overwriteRiskFor(input.artifact, input.action),
        backup: backupLabel(input.backupDisposition, input.backupReason),
    };
}
