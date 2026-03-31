/**
 * AI agent setup and wrappers for intent extraction and manifest diff.
 *
 * Uses the Vercel AI SDK (ai + @ai-sdk/openai / @ai-sdk/anthropic) with
 * generateObject() for Zod-validated structured output.  No Mastra dependency.
 *
 * - `extractIntent(prompt, catalogContext)` — from-scratch mode
 * - `extractDiff(prompt, catalogContext, existingManifestYaml)` — modify mode
 *
 * Provider:  configurable via CS_AI_MODEL env var (default: openai:gpt-4o-mini)
 *            Format: "<provider>:<model-id>", e.g. "anthropic:claude-3-haiku-20240307"
 * API keys:  OPENAI_API_KEY or ANTHROPIC_API_KEY depending on provider.
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { EnvironmentIntentSchema, ManifestDiffSchema } from './intent.js';
import type { EnvironmentIntent, ManifestDiff } from './intent.js';

// ─── Error types ───────────────────────────────────────────────────────────────

export class MissingApiKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MissingApiKeyError';
    }
}

export class AgentError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown
    ) {
        super(message);
        this.name = 'AgentError';
    }
}

// ─── Model resolution ──────────────────────────────────────────────────────────

/** Default model used when CS_AI_MODEL is not set. */
const DEFAULT_MODEL = 'openai:gpt-4o-mini';

/**
 * Parse CS_AI_MODEL into provider and model-id.
 * Format: "<provider>:<model-id>"   e.g. "openai:gpt-4o-mini"
 * Legacy format (slash-separated) is also accepted: "openai/gpt-4o-mini"
 */
function parseModel(): { provider: string; modelId: string } {
    const raw = process.env['CS_AI_MODEL'] ?? DEFAULT_MODEL;
    // Support both "openai:gpt-4o-mini" and legacy "openai/gpt-4o-mini"
    const separator = raw.includes(':') ? ':' : '/';
    const idx = raw.indexOf(separator);
    if (idx === -1) {
        return { provider: 'openai', modelId: raw };
    }
    return { provider: raw.slice(0, idx).toLowerCase(), modelId: raw.slice(idx + 1) };
}

/**
 * Build a LanguageModelV1 instance for the configured provider/model.
 * Validates that the required API key is present before constructing.
 */
function buildModel(): LanguageModelV2 {
    const { provider, modelId } = parseModel();

    switch (provider) {
        case 'openai': {
            if (!process.env['OPENAI_API_KEY']) {
                throw new MissingApiKeyError(
                    'OPENAI_API_KEY environment variable is not set.\n' +
                        '  Set it with: export OPENAI_API_KEY=sk-...\n' +
                        '  Or configure a different model via CS_AI_MODEL\n' +
                        '  (e.g. CS_AI_MODEL=anthropic:claude-3-haiku-20240307).'
                );
            }
            return openai(modelId) as unknown as LanguageModelV2;
        }
        case 'anthropic': {
            if (!process.env['ANTHROPIC_API_KEY']) {
                throw new MissingApiKeyError(
                    'ANTHROPIC_API_KEY environment variable is not set.\n' +
                        '  Set it with: export ANTHROPIC_API_KEY=sk-ant-...\n' +
                        '  Or configure a different model via CS_AI_MODEL\n' +
                        '  (e.g. CS_AI_MODEL=openai:gpt-4o-mini).'
                );
            }
            return anthropic(modelId) as unknown as LanguageModelV2;
        }
        default:
            throw new AgentError(
                `Unsupported AI provider: "${provider}".\n` +
                    '  Supported providers: openai, anthropic.\n' +
                    '  Set CS_AI_MODEL to e.g. "openai:gpt-4o-mini" or "anthropic:claude-3-haiku-20240307".'
            );
    }
}

/** Validate that the required API key is present (used for early-exit checks). */
export function assertApiKeyPresent(): void {
    buildModel(); // throws MissingApiKeyError if key is absent
}

// ─── Shared system prompt ─────────────────────────────────────────────────────

const BASE_SYSTEM =
    'You are an expert devcontainer environment architect. You help developers create ' +
    'and modify container-based development environments. You must ONLY select overlay IDs ' +
    'from the catalog provided in the user message — never invent IDs. ' +
    'Always prefer compose stack when services (databases, messaging, monitoring) are requested. ' +
    'Use plain stack for language-only or CLI-only environments. ' +
    'When uncertain, default to compose to give flexibility. Respond with valid JSON only.';

// ─── extractIntent ─────────────────────────────────────────────────────────────

const INTENT_SYSTEM =
    BASE_SYSTEM +
    "\n\nYour task is to extract a structured EnvironmentIntent from the user's prompt. " +
    'Map "services", "databases" or named services to the `services` field. ' +
    'Map languages and frameworks to the `language` field. ' +
    'Map monitoring / tracing / logging tools to the `observability` field. ' +
    'Map cloud CLI tools (aws, gcloud, azure, terraform, pulumi, kubectl) to `cloudTools`. ' +
    'Map dev utilities (docker, git helpers, playwright, just) to `tools`. ' +
    'Only include IDs you can find in the overlay catalog.';

/**
 * Extract an `EnvironmentIntent` from a natural-language prompt using the LLM.
 *
 * @param prompt          The user's prompt describing the desired environment.
 * @param catalogContext  Compact overlay catalog string from buildOverlayContextString().
 * @returns Parsed and Zod-validated EnvironmentIntent.
 */
export async function extractIntent(
    prompt: string,
    catalogContext: string
): Promise<EnvironmentIntent> {
    const model = buildModel();

    let result: { object: EnvironmentIntent };
    try {
        result = (await generateObject({
            model,
            schema: EnvironmentIntentSchema,
            system: INTENT_SYSTEM,
            messages: [
                {
                    role: 'user',
                    content: `${catalogContext}\n\nUser request: ${prompt}`,
                },
            ],
        })) as { object: EnvironmentIntent };
    } catch (err) {
        if (err instanceof MissingApiKeyError) throw err;
        throw new AgentError(
            `Failed to extract environment intent from LLM: ${err instanceof Error ? err.message : String(err)}`,
            err
        );
    }

    return result.object;
}

// ─── extractDiff ───────────────────────────────────────────────────────────────

const DIFF_SYSTEM =
    BASE_SYSTEM +
    '\n\nYour task is to produce a ManifestDiff that describes how to modify an EXISTING ' +
    "superposition.yml manifest based on the user's prompt. You will be given the current " +
    'manifest YAML and the overlay catalog. Only reference IDs from the catalog in addOverlays. ' +
    'Only reference IDs already in the manifest in removeOverlays. ' +
    'Leave changeStack / changeBaseImage / changeContainerName undefined unless the prompt ' +
    'explicitly requests those changes.';

/**
 * Extract a `ManifestDiff` from a modify-mode prompt using the LLM.
 *
 * @param prompt               The user's incremental change prompt.
 * @param catalogContext       Compact overlay catalog string.
 * @param existingManifestYaml Current superposition.yml content as a YAML string.
 * @returns Parsed and Zod-validated ManifestDiff.
 */
export async function extractDiff(
    prompt: string,
    catalogContext: string,
    existingManifestYaml: string
): Promise<ManifestDiff> {
    const model = buildModel();

    let result: { object: ManifestDiff };
    try {
        result = (await generateObject({
            model,
            schema: ManifestDiffSchema,
            system: DIFF_SYSTEM,
            messages: [
                {
                    role: 'user',
                    content: [
                        catalogContext,
                        '',
                        'Current manifest:',
                        '```yaml',
                        existingManifestYaml,
                        '```',
                        '',
                        `User request: ${prompt}`,
                    ].join('\n'),
                },
            ],
        })) as { object: ManifestDiff };
    } catch (err) {
        if (err instanceof MissingApiKeyError) throw err;
        throw new AgentError(
            `Failed to extract manifest diff from LLM: ${err instanceof Error ? err.message : String(err)}`,
            err
        );
    }

    return result.object;
}
