import type {
    OverlaysConfig,
    ProjectConfigSelection,
    SuperpositionManifest,
} from '../../schema/types.js';
import type {
    ArtifactReviewRow,
    AdoptConfidence,
    FrameRow,
    NextStep,
} from '../../ux/semantics/types.js';

export interface DetectionTables {
    /** Stripped feature URI → overlay ID */
    featureToOverlay: Record<string, string>;
    /** Image name prefix → overlay ID (first prefix wins on match) */
    imagePrefixToOverlay: Array<{ prefix: string; overlayId: string }>;
    /** Lowercase extension ID → overlay ID */
    extensionToOverlay: Record<string, string>;
}

export type DetectionConfidence = 'exact' | 'heuristic';
export type DetectionSourceType = 'feature' | 'service' | 'extension' | 'remoteenv' | 'script';

export interface DetectionResult {
    source: string;
    overlayId: string;
    confidence: DetectionConfidence;
    sourceType: DetectionSourceType;
}

export interface UnmatchedItem {
    source: string;
    reason: string;
}

export interface AdoptOptions {
    dir?: string;
    dryRun?: boolean;
    force?: boolean;
    /** true = --backup, false = --no-backup, undefined = auto (skip in git repos) */
    backup?: boolean;
    backupDir?: string;
    projectFile?: boolean;
    json?: boolean;
}

export interface AnalysisResult {
    detections: DetectionResult[];
    unmatchedItems: UnmatchedItem[];
    customDevcontainerPatch: Record<string, any> | null;
    customComposePatch: Record<string, any> | null;
    suggestedStack: 'plain' | 'compose';
    suggestedOverlays: string[];
    suggestedCommand: string;
    hasDockerCompose: boolean;
}

export interface AdoptConfidenceModel {
    confidence: AdoptConfidence;
    recommendation: string;
    reasons: string[];
}

export interface AdoptOutputModel {
    dir: string;
    detections: DetectionResult[];
    unmatchedItems: UnmatchedItem[];
    customDevcontainerPatch: Record<string, any> | null;
    customComposePatch: Record<string, any> | null;
    suggestedStack: 'plain' | 'compose';
    suggestedOverlays: string[];
    suggestedCommand: string;
    confidence: AdoptConfidence;
    recommendation: string;
    confidenceReasons: string[];
    managed: string[];
    preserved: UnmatchedItem[];
    manualReview: UnmatchedItem[];
    artifactWrites: ArtifactReviewRow[];
}

export interface AdoptSection {
    title: string;
    body: string | string[];
}

export interface AdoptFrameInput {
    dryRun: boolean;
    devcontainerJsonPath: string;
    projectFilePath: string;
    manifestPath: string;
    nextStepModel: NextStep;
}

export interface AdoptArtifactRowsInput {
    projectFilePath: string;
    manifestPath: string;
    customPatchPath: string;
    customComposePath: string;
    hasCustomDevcontainerPatch: boolean;
    hasCustomComposePatch: boolean;
    backupDisposition: 'create' | 'skip' | 'not needed';
    backupReason: string;
}

export interface AdoptSuccessSectionsInput {
    writtenPaths: string[];
    analysis: AnalysisResult;
}

export interface AdoptWriteArtifactsInput {
    manifestPath: string;
    projectFilePath: string;
    customDir: string;
    customPatchPath: string;
    customComposePath: string;
    manifest: SuperpositionManifest;
    projectSelection: ProjectConfigSelection;
    customDevcontainerPatch: Record<string, any> | null;
    customComposePatch: Record<string, any> | null;
}

export interface BaseImageSelection {
    baseImage: ProjectConfigSelection['baseImage'];
    customImage?: string;
}

export interface BuildProjectConfigSelectionInput {
    analysis: AnalysisResult;
    baseImageSelection: BaseImageSelection;
    projectRoot: string;
    absoluteDir: string;
    devcontainer: any;
}

export interface AnalyseLoadedDevcontainerInput {
    devcontainer: any;
    dir: string;
    overlaysConfig: OverlaysConfig;
    tables: DetectionTables;
    overlaysDir: string;
}

export type AdoptFrameRows = FrameRow[];
