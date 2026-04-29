/**
 * AI intent types and Zod schemas for the generate command.
 *
 * EnvironmentIntent — used when generating a manifest from scratch.
 * ManifestDiff      — used when modifying an existing manifest.
 */

import { z } from 'zod';
import type { BaseImage, Stack } from '../schema/types.js';

// ─── EnvironmentIntent ─────────────────────────────────────────────────────────

/**
 * Structured representation of the user's environment intent extracted from a
 * natural-language prompt. Every field maps directly to overlay categories or
 * QuestionnaireAnswers fields — the LLM cannot invent overlay IDs here.
 */
export interface EnvironmentIntent {
    stack: Stack;
    baseImage?: BaseImage;
    language?: string[];
    runtimeVersions?: Record<string, string>;
    services?: string[];
    tools?: string[];
    observability?: string[];
    cloudTools?: string[];
    containerName?: string;
    goals?: string[];
}

export const EnvironmentIntentSchema = z.object({
    stack: z
        .enum(['plain', 'compose'])
        .describe('Base template — use compose when services are needed'),
    baseImage: z
        .enum(['bookworm', 'trixie', 'alpine', 'ubuntu', 'custom'])
        .optional()
        .describe('Base container image'),
    language: z
        .array(z.string())
        .optional()
        .describe('Language/framework overlay IDs (e.g. nodejs, python, dotnet)'),
    runtimeVersions: z
        .record(z.string(), z.string())
        .optional()
        .describe('Preferred runtime versions by overlay id, e.g. { nodejs: "20" }'),
    services: z
        .array(z.string())
        .optional()
        .describe('Database/service overlay IDs (e.g. postgres, redis, mongodb)'),
    tools: z
        .array(z.string())
        .optional()
        .describe('Dev-tool overlay IDs (e.g. docker-sock, git-helpers, playwright)'),
    observability: z
        .array(z.string())
        .optional()
        .describe('Observability overlay IDs (e.g. otel-collector, jaeger, prometheus, grafana)'),
    cloudTools: z
        .array(z.string())
        .optional()
        .describe('Cloud-tool overlay IDs (e.g. aws-cli, gcloud, terraform)'),
    containerName: z.string().optional().describe('Container/project display name'),
    goals: z
        .array(z.string())
        .optional()
        .describe('High-level goals mentioned in the prompt (for explainer output only)'),
});

// ─── ManifestDiff ──────────────────────────────────────────────────────────────

/**
 * Incremental change to apply to an existing manifest. Emitted by the LLM when
 * a `superposition.yml` is already present.
 */
export interface ManifestDiff {
    addOverlays: string[];
    removeOverlays: string[];
    changeStack?: Stack;
    changeBaseImage?: BaseImage;
    changeContainerName?: string;
}

export const ManifestDiffSchema = z.object({
    addOverlays: z.array(z.string()).describe('Overlay IDs to add — must exist in the catalog'),
    removeOverlays: z.array(z.string()).describe('Overlay IDs to remove from the current manifest'),
    changeStack: z.enum(['plain', 'compose']).optional().describe('New stack, if it should change'),
    changeBaseImage: z
        .enum(['bookworm', 'trixie', 'alpine', 'ubuntu', 'custom'])
        .optional()
        .describe('New base image, if it should change'),
    changeContainerName: z.string().optional().describe('New container name, if it should change'),
});
