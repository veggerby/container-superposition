export type RunPosture =
    | 'New setup'
    | 'Update shared setup'
    | 'Replay shared setup'
    | 'Legacy compatibility replay';

export type ChangeClass =
    | 'First write'
    | 'Update existing output'
    | 'Cleanup stale generated files'
    | 'No material change';

export type LocalConfigDisposition =
    | 'Applied safely'
    | 'Applied with manual follow-up'
    | 'Blocked'
    | 'Ignored by this run';

export type DoctorMode = 'Diagnosis only' | 'Preview fix plan only' | 'Apply safe fixes';

export type DoctorDisposition = 'Blocked' | 'Fixable now' | 'Manual follow-up only' | 'Healthy';

export type AdoptConfidence =
    | 'High confidence'
    | 'Mixed confidence'
    | 'Low confidence'
    | 'No viable conversion';

export type ArtifactRole =
    | 'Canonical shared intent'
    | 'Compatibility artifact'
    | 'Preservation artifact'
    | 'Generated output'
    | 'Backup';

export type OverwriteRisk = 'new' | 'update' | 'overwrite existing' | 'unchanged';
export type BackupDisposition = 'create' | 'skip' | 'not needed';

export interface FrameRow {
    label: string;
    value: string;
}

export interface ArtifactReviewRow {
    artifact: string;
    role: ArtifactRole;
    action: string;
    overwriteRisk: OverwriteRisk;
    backup: string;
}

export interface LocalConfigTrust {
    path: string | null;
    appliedFields: string[];
    unsupportedFields: string[];
    gitIgnoreSafe: boolean;
    trackedCleanupManual: boolean;
    blocked: boolean;
    disposition: LocalConfigDisposition;
    note?: string;
}

export interface NextStep {
    command: string | null;
    reason: string;
}

export interface SourceDescriptor {
    kind: 'project-file' | 'manifest' | 'cli' | 'existing-devcontainer' | 'none';
    label: string;
    detail: string;
    compatibilityOnly: boolean;
}
