import type { Stack } from '../../schema/types.js';

export interface PlanOptions {
    stack?: Stack;
    overlays?: string;
    fromManifest?: string;
    portOffset?: number;
    json?: boolean;
    verbose?: boolean;
    diff?: boolean;
    output?: string;
    diffFormat?: string;
    diffContext?: number;
}

export interface FileDiffEntry {
    path: string;
    diff?: string;
}

export interface OverlayChange {
    id: string;
    name?: string;
    category?: string;
}

export interface PortChange {
    overlay: string;
    port: number;
}

export interface PlanDiffResult {
    existingPath: string;
    hasExistingConfig: boolean;
    created: string[];
    modified: FileDiffEntry[];
    overwritten: string[];
    unchanged: string[];
    preserved: string[];
    removed: string[];
    overlayChanges: {
        added: OverlayChange[];
        removed: OverlayChange[];
        unchanged: string[];
    };
    portChanges: {
        added: PortChange[];
        removed: PortChange[];
    };
}

export type ResolutionReasonKind = 'selected' | 'required' | 'transitive';
export type ResolutionIssueKind = 'skipped' | 'conflict';
export type PlanInputMode = 'overlay-list' | 'manifest';
export type ResolutionOrigin = 'command-line' | 'manifest';

export interface ResolutionReason {
    kind: ResolutionReasonKind;
    message: string;
    origin: ResolutionOrigin;
    rootOverlayId: string;
    sourceOverlayId?: string;
    path: string[];
    depth: number;
}

export interface ResolvedOverlayExplanation {
    id: string;
    selectionKind: 'direct' | 'dependency';
    selectionSource: ResolutionOrigin | 'dependency';
    reasons: ResolutionReason[];
}

export interface ResolutionIssue {
    kind: ResolutionIssueKind;
    overlayId: string;
    message: string;
    relatedOverlayIds?: string[];
    path?: string[];
}

export interface ResolutionSummary {
    directSelections: number;
    autoAdded: number;
    includedOverlays: number;
    skippedOverlays: number;
    conflicts: number;
}

export interface VerbosePlanData {
    inputMode: PlanInputMode;
    includedOverlays: ResolvedOverlayExplanation[];
    summary: ResolutionSummary;
    issues: ResolutionIssue[];
}

export interface PlanResult {
    stack: Stack;
    selectedOverlays: string[];
    selectedOverlayLabels: string[];
    autoAddedOverlays: string[];
    conflicts: Array<{ overlay: string; conflictsWith: string[] }>;
    portMappings: Array<{ overlay: string; ports: number[]; offsetPorts: number[] }>;
    files: string[];
    portOffset: number;
    inputMode: PlanInputMode;
    verbose?: VerbosePlanData;
}
