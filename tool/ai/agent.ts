/**
 * Mastra agent setup and wrappers for intent extraction and manifest diff.
 *
 * The agent wraps:
 * - `extractIntent(prompt, catalogContext)` — from-scratch mode
 * - `extractDiff(prompt, catalogContext, existingManifestYaml)` — modify mode
 *
 * Provider: OpenAI (model configurable via CS_AI_MODEL env var).
 * API key:  OPENAI_API_KEY — the command fails early with a clear error if absent.
 */

import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { EnvironmentIntentSchema, ManifestDiffSchema } from './intent.js';
import type { EnvironmentIntent, ManifestDiff } from './intent.js';

// ─── Model resolution ──────────────────────────────────────────────────────────

/** Default model used when CS_AI_MODEL is not set. */
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

/** Resolve the model string from env or fall back to default. */
function resolveModel(): string {
    return process.env['CS_AI_MODEL'] ?? DEFAULT_MODEL;
}

/** Validate that the required API key is present before making any network call. */
export function assertApiKeyPresent(): void {
    const model = resolveModel();
    // Only check OpenAI key for the default provider; other providers use
    // Mastra's built-in routing and may use different env vars.
    if (model.startsWith('openai/') && !process.env['OPENAI_API_KEY']) {
        throw new MissingApiKeyError(
            'OPENAI_API_KEY environment variable is not set.\n' +
                '  Set it with: export OPENAI_API_KEY=sk-...\n' +
                '  Or configure a different model via CS_AI_MODEL (e.g. CS_AI_MODEL=anthropic/claude-3-haiku).'
        );
    }

    if (model.startsWith('anthropic/') && !process.env['ANTHROPIC_API_KEY']) {
        throw new MissingApiKeyError(
            'ANTHROPIC_API_KEY environment variable is not set.\n' +
                '  Set it with: export ANTHROPIC_API_KEY=sk-ant-...'
        );
    }
}

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

// ─── Shared instructions ───────────────────────────────────────────────────────

const BASE_INSTRUCTIONS = `You are an expert devcontainer environment architect. You help developers create \
and modify container-based development environments. You must ONLY select overlay IDs from the catalog provided \
in the user's message — never invent IDs. Always prefer compose stack when services (databases, messaging, \
monitoring) are requested. Use plain stack for language-only or CLI-only environments. \
When uncertain, default to compose to give flexibility. Respond with valid JSON only.`;

// ─── Factory ───────────────────────────────────────────────────────────────────

function buildAgent(id: string, instructions: string): Agent {
    const model = resolveModel();
    return new Agent({
        id,
        name: id,
        instructions,
        model,
    });
}

// ─── extractIntent ─────────────────────────────────────────────────────────────

const INTENT_INSTRUCTIONS =
    BASE_INSTRUCTIONS +
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
 * @param prompt        The user's prompt describing the desired environment.
 * @param catalogContext  Compact overlay catalog string from buildOverlayContextString().
 * @returns Parsed and Zod-validated EnvironmentIntent.
 */
export async function extractIntent(
    prompt: string,
    catalogContext: string
): Promise<EnvironmentIntent> {
    assertApiKeyPresent();

    const agent = buildAgent('overlay-intent-extractor', INTENT_INSTRUCTIONS);

    let result: Awaited<ReturnType<typeof agent.generate>>;
    try {
        result = await agent.generate(
            [
                {
                    role: 'user',
                    content: `${catalogContext}\n\nUser request: ${prompt}`,
                },
            ],
            {
                structuredOutput: {
                    schema: EnvironmentIntentSchema,
                },
            }
        );
    } catch (err) {
        throw new AgentError(
            `Failed to extract environment intent from LLM: ${err instanceof Error ? err.message : String(err)}`,
            err
        );
    }

    const raw = (result as { object?: unknown }).object;
    const parsed = EnvironmentIntentSchema.safeParse(raw);
    if (!parsed.success) {
        throw new AgentError(`LLM returned invalid EnvironmentIntent: ${parsed.error.message}`);
    }
    return parsed.data as EnvironmentIntent;
}

// ─── extractDiff ───────────────────────────────────────────────────────────────

const DIFF_INSTRUCTIONS =
    BASE_INSTRUCTIONS +
    '\n\nYour task is to produce a ManifestDiff that describes how to modify an EXISTING ' +
    "superposition.yml manifest based on the user's prompt. You will be given the current " +
    'manifest YAML and the overlay catalog. Only reference IDs from the catalog in addOverlays. ' +
    'Only reference IDs already in the manifest in removeOverlays. ' +
    'Leave changeStack / changeBaseImage / changeContainerName undefined unless the prompt ' +
    'explicitly requests those changes.';

/**
 * Extract a `ManifestDiff` from a modify-mode prompt using the LLM.
 *
 * @param prompt              The user's incremental change prompt.
 * @param catalogContext      Compact overlay catalog string.
 * @param existingManifestYaml Current superposition.yml content as a YAML string.
 * @returns Parsed and Zod-validated ManifestDiff.
 */
export async function extractDiff(
    prompt: string,
    catalogContext: string,
    existingManifestYaml: string
): Promise<ManifestDiff> {
    assertApiKeyPresent();

    const agent = buildAgent('overlay-diff-extractor', DIFF_INSTRUCTIONS);

    let result: Awaited<ReturnType<typeof agent.generate>>;
    try {
        result = await agent.generate(
            [
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
            {
                structuredOutput: {
                    schema: ManifestDiffSchema,
                },
            }
        );
    } catch (err) {
        throw new AgentError(
            `Failed to extract manifest diff from LLM: ${err instanceof Error ? err.message : String(err)}`,
            err
        );
    }

    const raw = (result as { object?: unknown }).object;
    const parsed = ManifestDiffSchema.safeParse(raw);
    if (!parsed.success) {
        throw new AgentError(`LLM returned invalid ManifestDiff: ${parsed.error.message}`);
    }
    return parsed.data as ManifestDiff;
}

// Re-export z for convenience in tests
export { z };
