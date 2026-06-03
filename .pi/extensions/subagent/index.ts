import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { discoverAgents, type AgentConfig, type AgentScope } from './agents.ts';

const extensionDir = path.dirname(fileURLToPath(import.meta.url));

const AgentScopeSchema = Type.Union(
    [Type.Literal('bundled'), Type.Literal('user'), Type.Literal('project'), Type.Literal('all')],
    {
        description:
            'Where to discover subagents. "bundled" uses this package only, "user" adds ~/.pi/agent/agents, "project" adds .pi/agents, and "all" combines bundled + user + project.',
        default: 'bundled',
    }
);

const TaskItemSchema = Type.Object({
    agent: Type.String({ description: 'Subagent name to invoke' }),
    task: Type.String({ description: 'Task to delegate to the subagent' }),
    cwd: Type.Optional(Type.String({ description: 'Working directory for this child pi process' })),
});

const ChainItemSchema = Type.Object({
    agent: Type.String({ description: 'Subagent name to invoke' }),
    task: Type.String({
        description: 'Task to delegate. Use {previous} to interpolate the prior step output.',
    }),
    cwd: Type.Optional(Type.String({ description: 'Working directory for this child pi process' })),
});

const SubagentParamsSchema = Type.Object({
    agent: Type.Optional(
        Type.String({ description: 'Subagent name to invoke for single-agent mode' })
    ),
    task: Type.Optional(Type.String({ description: 'Task to delegate for single-agent mode' })),
    tasks: Type.Optional(
        Type.Array(TaskItemSchema, {
            description: 'Parallel tasks to run as {agent, task} entries',
        })
    ),
    chain: Type.Optional(
        Type.Array(ChainItemSchema, {
            description: 'Sequential tasks to run with optional {previous} handoff between steps',
        })
    ),
    agentScope: Type.Optional(AgentScopeSchema),
    cwd: Type.Optional(Type.String({ description: 'Working directory for the child pi process' })),
});

const resolvePiInvocation = (args: string[]): { command: string; args: string[] } => {
    const currentScript = process.argv[1];
    if (currentScript && !currentScript.startsWith('/$bunfs/root/')) {
        return { command: process.execPath, args: [currentScript, ...args] };
    }

    const execName = path.basename(process.execPath).toLowerCase();
    if (!/^(node|bun)(\.exe)?$/.test(execName)) {
        return { command: process.execPath, args };
    }

    return { command: 'pi', args };
};

const buildPrompt = (agent: AgentConfig, task: string): string => {
    return [agent.systemPrompt.trim(), '', `Task: ${task.trim()}`].join('\n').trim();
};

const runChildAgent = async (
    agent: AgentConfig,
    task: string,
    cwd: string,
    signal?: AbortSignal
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'kontekst-pi-subagent-'));
    const promptPath = path.join(tempDir, `${agent.name}.md`);

    try {
        await writeFile(promptPath, buildPrompt(agent, task), {
            encoding: 'utf8',
            mode: 0o600,
        });

        const args = [
            '-p',
            '--no-session',
            '--append-system-prompt',
            promptPath,
            'Proceed with the delegated task.',
        ];
        if (agent.model) {
            args.unshift(agent.model);
            args.unshift('--model');
        }
        if (agent.tools && agent.tools.length > 0) {
            args.unshift(agent.tools.join(','));
            args.unshift('--tools');
        }

        const invocation = resolvePiInvocation(args);

        return await new Promise((resolve, reject) => {
            const child = spawn(invocation.command, invocation.args, {
                cwd,
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: false,
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('error', reject);
            child.on('close', (code) => {
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: code ?? 1,
                });
            });

            if (signal) {
                const abort = () => {
                    child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!child.killed) {
                            child.kill('SIGKILL');
                        }
                    }, 2000);
                };

                if (signal.aborted) {
                    abort();
                } else {
                    signal.addEventListener('abort', abort, { once: true });
                }
            }
        });
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
};

const MAX_PARALLEL_TASKS = 8;
const MAX_PARALLEL_CONCURRENCY = 4;
const PARALLEL_OUTPUT_CAP = 50 * 1024;

type DelegatedTask = {
    agent: string;
    task: string;
    cwd?: string;
};

type DelegatedResult = {
    agent: AgentConfig;
    task: string;
    cwd: string;
    stdout: string;
    stderr: string;
    exitCode: number;
};

const formatAvailableAgents = (agents: AgentConfig[]): string => {
    return agents.map((agent) => `${agent.name} (${agent.source})`).join(', ') || 'none';
};

const resolveAgent = (agents: AgentConfig[], agentName: string): AgentConfig | undefined => {
    return agents.find((candidate) => candidate.name === agentName.trim());
};

const outputForResult = (result: DelegatedResult): string => {
    return (
        result.stdout || result.stderr || `Subagent ${result.agent.name} finished with no output.`
    );
};

const truncateOutput = (output: string): string => {
    const size = Buffer.byteLength(output, 'utf8');
    if (size <= PARALLEL_OUTPUT_CAP) {
        return output;
    }

    let truncated = output.slice(0, PARALLEL_OUTPUT_CAP);
    while (Buffer.byteLength(truncated, 'utf8') > PARALLEL_OUTPUT_CAP) {
        truncated = truncated.slice(0, -1);
    }

    return `${truncated}\n\n[Output truncated: ${size - Buffer.byteLength(truncated, 'utf8')} bytes omitted.]`;
};

const runDelegatedTask = async (
    agents: AgentConfig[],
    delegatedTask: DelegatedTask,
    defaultCwd: string,
    signal?: AbortSignal
): Promise<DelegatedResult> => {
    const agent = resolveAgent(agents, delegatedTask.agent);
    if (!agent) {
        throw new Error(
            `Unknown subagent "${delegatedTask.agent}". Available agents: ${formatAvailableAgents(agents)}`
        );
    }

    const cwd = delegatedTask.cwd ?? defaultCwd;
    const run = await runChildAgent(agent, delegatedTask.task, cwd, signal);
    return { agent, task: delegatedTask.task, cwd, ...run };
};

const mapWithConcurrency = async <TIn, TOut>(
    items: TIn[],
    concurrency: number,
    fn: (item: TIn, index: number) => Promise<TOut>
): Promise<TOut[]> => {
    const results = new Array<TOut>(items.length);
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(concurrency, items.length));

    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (nextIndex < items.length) {
                const index = nextIndex++;
                results[index] = await fn(items[index], index);
            }
        })
    );

    return results;
};

export default function (pi: ExtensionAPI) {
    pi.registerTool({
        name: 'subagent',
        label: 'Subagent',
        description:
            'Delegate tasks to named subagents running in separate pi processes with isolated context windows. Supports single, parallel, and sequential chain modes.',
        parameters: SubagentParamsSchema,
        promptSnippet:
            'Delegate focused review, planning, implementation, or QA work to named subagents.',
        promptGuidelines: [
            'Use subagent when a bundled or configured specialist should handle a focused task in isolation.',
            "Use subagent with chain for ordered role handoffs where each step needs the previous step's output.",
            'Use subagent with tasks for independent role work that can run in parallel.',
        ],
        async execute(_toolCallId, params, signal, onUpdate, ctx) {
            const agentScope = (params.agentScope ?? 'bundled') as AgentScope;
            const discovery = discoverAgents(ctx.cwd, agentScope);
            const hasSingle = Boolean(params.agent && params.task);
            const hasParallel = Boolean(params.tasks?.length);
            const hasChain = Boolean(params.chain?.length);
            const modeCount = Number(hasSingle) + Number(hasParallel) + Number(hasChain);

            const baseDetails = {
                agentScope,
                availableAgents: discovery.agents,
                bundledAgentsDir: discovery.bundledAgentsDir,
                projectAgentsDir: discovery.projectAgentsDir,
                packageExtensionDir: extensionDir,
            };

            if (modeCount !== 1) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Invalid subagent parameters. Provide exactly one mode: agent+task, tasks, or chain. Available agents: ${formatAvailableAgents(discovery.agents)}`,
                        },
                    ],
                    details: baseDetails,
                    isError: true,
                };
            }

            try {
                if (hasSingle) {
                    const result = await runDelegatedTask(
                        discovery.agents,
                        { agent: params.agent!, task: params.task!, cwd: params.cwd },
                        ctx.cwd,
                        signal
                    );

                    return {
                        content: [{ type: 'text', text: outputForResult(result) }],
                        details: {
                            ...baseDetails,
                            mode: 'single',
                            results: [result],
                        },
                        isError: result.exitCode !== 0,
                    };
                }

                if (hasChain) {
                    const results: DelegatedResult[] = [];
                    let previous = '';

                    for (let index = 0; index < params.chain!.length; index++) {
                        const step = params.chain![index];
                        const task = step.task.replace(/\{previous\}/g, previous);
                        onUpdate?.({
                            content: [
                                {
                                    type: 'text',
                                    text: `Running chain step ${index + 1}/${params.chain!.length}: ${step.agent}`,
                                },
                            ],
                            details: { ...baseDetails, mode: 'chain', results },
                        });

                        const result = await runDelegatedTask(
                            discovery.agents,
                            { agent: step.agent, task, cwd: step.cwd },
                            ctx.cwd,
                            signal
                        );
                        results.push(result);
                        previous = outputForResult(result);

                        if (result.exitCode !== 0) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: `Chain stopped at step ${index + 1} (${result.agent.name}).\n\n${previous}`,
                                    },
                                ],
                                details: { ...baseDetails, mode: 'chain', results },
                                isError: true,
                            };
                        }
                    }

                    return {
                        content: [
                            {
                                type: 'text',
                                text: previous || 'Subagent chain finished with no output.',
                            },
                        ],
                        details: { ...baseDetails, mode: 'chain', results },
                    };
                }

                const tasks = params.tasks!;
                if (tasks.length > MAX_PARALLEL_TASKS) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Too many parallel subagent tasks (${tasks.length}). Maximum is ${MAX_PARALLEL_TASKS}.`,
                            },
                        ],
                        details: baseDetails,
                        isError: true,
                    };
                }

                const results = await mapWithConcurrency(
                    tasks,
                    MAX_PARALLEL_CONCURRENCY,
                    async (task, index) => {
                        onUpdate?.({
                            content: [
                                {
                                    type: 'text',
                                    text: `Running parallel subagent task ${index + 1}/${tasks.length}: ${task.agent}`,
                                },
                            ],
                            details: { ...baseDetails, mode: 'parallel' },
                        });
                        return runDelegatedTask(discovery.agents, task, ctx.cwd, signal);
                    }
                );

                const successful = results.filter((result) => result.exitCode === 0).length;
                const summaries = results.map((result) => {
                    const status =
                        result.exitCode === 0 ? 'completed' : `failed (${result.exitCode})`;
                    return `### [${result.agent.name}] ${status}\n\n${truncateOutput(outputForResult(result))}`;
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Parallel subagents: ${successful}/${results.length} succeeded\n\n${summaries.join('\n\n---\n\n')}`,
                        },
                    ],
                    details: { ...baseDetails, mode: 'parallel', results },
                    isError: successful !== results.length,
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: error instanceof Error ? error.message : String(error),
                        },
                    ],
                    details: baseDetails,
                    isError: true,
                };
            }
        },
    });
}
