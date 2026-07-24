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
    hasWarnings?: boolean;
    confidence?: string;
    projectFileChanged?: boolean;
}): NextStep {
    if (input.command === 'list') {
        return { command: null, reason: 'guidance is provided in-body' };
    }
    if (input.command === 'explain') {
        return {
            command: null,
            reason: 'preview guidance is provided in-body',
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
        return { command: null, reason: 'repo already healthy' };
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
    if (input.command === 'init') {
        if (input.hasWarnings) {
            return { command: 'cs doctor', reason: 'follow up on generation warnings' };
        }
        return { command: null, reason: 'no follow-up needed' };
    }
    if (input.command === 'regen') {
        if (input.hasWarnings) {
            return { command: 'cs doctor', reason: 'follow up on generation warnings' };
        }
        if (input.changeClass === 'No material change') {
            return { command: null, reason: 'generated output already matched shared intent' };
        }
        return {
            command: 'review generated diff',
            reason: 'confirm regenerated files match the intended setup change',
        };
    }
    return { command: null, reason: 'no follow-up needed' };
}
