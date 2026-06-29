import type { NextStep } from './types.js';

export function resolveNextStep(input: {
    repoHasProjectFile?: boolean;
    sourceKind?: 'project-file' | 'manifest' | 'cli' | 'existing-devcontainer' | 'none';
    command:
        | 'list'
        | 'explain'
        | 'plan'
        | 'hash'
        | 'init'
        | 'regen'
        | 'doctor'
        | 'adopt'
        | 'migrate';
    changeClass?: string;
    hasBlockingIssues?: boolean;
    confidence?: string;
    projectFileChanged?: boolean;
}): NextStep {
    if (input.command === 'list') {
        return { command: 'cs explain <id>', reason: 'inspect fit before preview' };
    }
    if (input.command === 'explain') {
        return {
            command: 'cs plan --stack <plain|compose> --overlays <ids>',
            reason: 'preview before write',
        };
    }
    if (input.command === 'plan') {
        if (input.sourceKind === 'manifest') {
            return {
                command: 'cs migrate',
                reason: 'move from compatibility manifest to shared project file',
            };
        }
        if (input.repoHasProjectFile) {
            return {
                command: 'cs regen',
                reason: 'replay shared project file into generated output',
            };
        }
        return { command: 'cs init', reason: 'persist shared project file before generation' };
    }
    if (input.command === 'hash') {
        return {
            command: 'cs plan --stack <plain|compose> --overlays <ids>',
            reason: 'compare intent with preview-safe plan',
        };
    }
    if (input.command === 'doctor') {
        if (input.hasBlockingIssues) {
            return { command: 'cs doctor --fix', reason: 'review safe remediation plan first' };
        }
        return { command: 'No next step suggested', reason: 'repo already healthy' };
    }
    if (input.command === 'adopt') {
        if (input.confidence === 'Low confidence' || input.confidence === 'No viable conversion') {
            return { command: 'cs init', reason: 'conversion confidence too weak for write path' };
        }
        return {
            command: 'cs regen',
            reason: 'review conversion artifacts, then replay canonical intent',
        };
    }
    if (input.command === 'migrate') {
        return {
            command: 'cs regen',
            reason: 'project file written; generated output still unchanged',
        };
    }
    if (input.command === 'regen') {
        return { command: 'cs doctor', reason: 'validate regenerated output' };
    }
    return { command: null, reason: 'No next step suggested' };
}
