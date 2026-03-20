/**
 * Tests for the AI mapper pure functions.
 * No LLM calls — purely testing mapIntentToAnswers and applyDiffToAnswers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { mapIntentToAnswers, applyDiffToAnswers, collectCurrentOverlayIds } from '../ai/mapper.js';
import { buildOverlayContextString, buildOverlayLookup } from '../ai/overlay-context.js';
import type { EnvironmentIntent, ManifestDiff } from '../ai/intent.js';
import type { QuestionnaireAnswers, OverlaysConfig } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeBaseAnswers(): QuestionnaireAnswers {
    return {
        stack: 'compose',
        baseImage: 'bookworm',
        language: ['nodejs'],
        database: ['postgres'],
        devTools: [],
        cloudTools: [],
        observability: [],
        playwright: false,
        needsDocker: false,
        outputPath: '.',
    };
}

// ─── mapIntentToAnswers ────────────────────────────────────────────────────────

describe('mapIntentToAnswers', () => {
    let overlaysConfig: OverlaysConfig;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    });

    it('maps language overlays correctly', () => {
        const intent: EnvironmentIntent = {
            stack: 'compose',
            language: ['nodejs'],
            services: [],
            tools: [],
            observability: [],
            cloudTools: [],
        };
        const { answers, unknownIds } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.language).toContain('nodejs');
        expect(answers.stack).toBe('compose');
        expect(unknownIds).toHaveLength(0);
    });

    it('maps service overlays to database field', () => {
        const intent: EnvironmentIntent = {
            stack: 'compose',
            services: ['postgres', 'redis'],
        };
        const { answers } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.database).toContain('postgres');
        expect(answers.database).toContain('redis');
    });

    it('maps multiple categories simultaneously', () => {
        const intent: EnvironmentIntent = {
            stack: 'compose',
            language: ['python'],
            services: ['postgres'],
            observability: ['prometheus'],
            cloudTools: ['aws-cli'],
            tools: ['git-helpers'],
        };
        const { answers, unknownIds } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.language).toContain('python');
        expect(answers.database).toContain('postgres');
        expect(answers.observability).toContain('prometheus');
        expect(answers.cloudTools).toContain('aws-cli');
        expect(answers.devTools).toContain('git-helpers');
        expect(unknownIds).toHaveLength(0);
    });

    it('records unknown overlay IDs in unknownIds', () => {
        const intent: EnvironmentIntent = {
            stack: 'plain',
            language: ['nodejs', 'non-existent-overlay'],
        };
        const { answers, unknownIds } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.language).toContain('nodejs');
        expect(unknownIds).toContain('non-existent-overlay');
    });

    it('handles playwright as a special dev tool', () => {
        const intent: EnvironmentIntent = {
            stack: 'plain',
            tools: ['playwright'],
        };
        const { answers } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.playwright).toBe(true);
    });

    it('sets needsDocker when docker-sock is selected', () => {
        const intent: EnvironmentIntent = {
            stack: 'plain',
            tools: ['docker-sock'],
        };
        const { answers } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.needsDocker).toBe(true);
    });

    it('sets needsDocker when docker-in-docker is selected', () => {
        const intent: EnvironmentIntent = {
            stack: 'compose',
            tools: ['docker-in-docker'],
        };
        const { answers } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.needsDocker).toBe(true);
    });

    it('uses provided baseImage', () => {
        const intent: EnvironmentIntent = {
            stack: 'plain',
            baseImage: 'alpine',
        };
        const { answers } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.baseImage).toBe('alpine');
    });

    it('defaults baseImage to bookworm when not specified', () => {
        const intent: EnvironmentIntent = { stack: 'plain' };
        const { answers } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.baseImage).toBe('bookworm');
    });

    it('sets containerName when provided', () => {
        const intent: EnvironmentIntent = {
            stack: 'plain',
            containerName: 'My App',
        };
        const { answers } = mapIntentToAnswers(intent, overlaysConfig);
        expect(answers.containerName).toBe('My App');
    });

    it('sets outputPath from argument', () => {
        const intent: EnvironmentIntent = { stack: 'plain' };
        const { answers } = mapIntentToAnswers(intent, overlaysConfig, '/some/path');
        expect(answers.outputPath).toBe('/some/path');
    });
});

// ─── applyDiffToAnswers ────────────────────────────────────────────────────────

describe('applyDiffToAnswers', () => {
    let overlaysConfig: OverlaysConfig;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    });

    it('adds overlays to correct categories', () => {
        const current = makeBaseAnswers();
        const diff: ManifestDiff = {
            addOverlays: ['jaeger', 'python'],
            removeOverlays: [],
        };
        const { answers } = applyDiffToAnswers(current, diff, overlaysConfig);
        expect(answers.observability).toContain('jaeger');
        expect(answers.language).toContain('python');
    });

    it('removes overlays from correct categories', () => {
        const current: QuestionnaireAnswers = {
            ...makeBaseAnswers(),
            observability: ['otel-collector'],
        };
        const diff: ManifestDiff = {
            addOverlays: ['jaeger'],
            removeOverlays: ['otel-collector'],
        };
        const { answers } = applyDiffToAnswers(current, diff, overlaysConfig);
        expect(answers.observability).toContain('jaeger');
        expect(answers.observability).not.toContain('otel-collector');
    });

    it('changes stack when diff.changeStack is set', () => {
        const current = makeBaseAnswers(); // stack: compose
        const diff: ManifestDiff = {
            addOverlays: [],
            removeOverlays: [],
            changeStack: 'plain',
        };
        const { answers } = applyDiffToAnswers(current, diff, overlaysConfig);
        expect(answers.stack).toBe('plain');
    });

    it('keeps stack unchanged when diff.changeStack is absent', () => {
        const current = makeBaseAnswers(); // stack: compose
        const diff: ManifestDiff = {
            addOverlays: [],
            removeOverlays: [],
        };
        const { answers } = applyDiffToAnswers(current, diff, overlaysConfig);
        expect(answers.stack).toBe('compose');
    });

    it('changes baseImage when diff.changeBaseImage is set', () => {
        const current = makeBaseAnswers(); // baseImage: bookworm
        const diff: ManifestDiff = {
            addOverlays: [],
            removeOverlays: [],
            changeBaseImage: 'alpine',
        };
        const { answers } = applyDiffToAnswers(current, diff, overlaysConfig);
        expect(answers.baseImage).toBe('alpine');
    });

    it('changes containerName when diff.changeContainerName is set', () => {
        const current = makeBaseAnswers();
        const diff: ManifestDiff = {
            addOverlays: [],
            removeOverlays: [],
            changeContainerName: 'New Name',
        };
        const { answers } = applyDiffToAnswers(current, diff, overlaysConfig);
        expect(answers.containerName).toBe('New Name');
    });

    it('does not mutate the original answers object', () => {
        const current = makeBaseAnswers();
        const original = { ...current, language: [...(current.language ?? [])] };
        const diff: ManifestDiff = {
            addOverlays: ['python'],
            removeOverlays: [],
        };
        applyDiffToAnswers(current, diff, overlaysConfig);
        expect(current.language).toEqual(original.language);
    });

    it('handles removing playwright via diff', () => {
        const current: QuestionnaireAnswers = { ...makeBaseAnswers(), playwright: true };
        const diff: ManifestDiff = {
            addOverlays: [],
            removeOverlays: ['playwright'],
        };
        const { answers } = applyDiffToAnswers(current, diff, overlaysConfig);
        expect(answers.playwright).toBe(false);
    });

    it('tracks unknown overlay IDs from addOverlays', () => {
        const current = makeBaseAnswers();
        const diff: ManifestDiff = {
            addOverlays: ['totally-fake-overlay'],
            removeOverlays: [],
        };
        const { unknownIds } = applyDiffToAnswers(current, diff, overlaysConfig);
        expect(unknownIds).toContain('totally-fake-overlay');
    });

    it('deduplicates overlays when the same ID is already present', () => {
        const current: QuestionnaireAnswers = { ...makeBaseAnswers(), language: ['nodejs'] };
        const diff: ManifestDiff = {
            addOverlays: ['nodejs'], // already present
            removeOverlays: [],
        };
        const { answers } = applyDiffToAnswers(current, diff, overlaysConfig);
        const nodejsCount = answers.language?.filter((id) => id === 'nodejs').length ?? 0;
        expect(nodejsCount).toBe(1);
    });
});

// ─── collectCurrentOverlayIds ─────────────────────────────────────────────────

describe('collectCurrentOverlayIds', () => {
    it('collects all overlay IDs from all categories', () => {
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            database: ['postgres'],
            devTools: ['git-helpers'],
            cloudTools: ['aws-cli'],
            observability: ['prometheus'],
            playwright: true,
            needsDocker: false,
            outputPath: '.',
        };
        const ids = collectCurrentOverlayIds(answers);
        expect(ids).toContain('nodejs');
        expect(ids).toContain('postgres');
        expect(ids).toContain('git-helpers');
        expect(ids).toContain('aws-cli');
        expect(ids).toContain('prometheus');
        expect(ids).toContain('playwright');
    });

    it('does not include playwright when playwright is false', () => {
        const answers: QuestionnaireAnswers = {
            ...makeBaseAnswers(),
            playwright: false,
        };
        const ids = collectCurrentOverlayIds(answers);
        expect(ids).not.toContain('playwright');
    });
});

// ─── buildOverlayContextString ────────────────────────────────────────────────

describe('buildOverlayContextString', () => {
    let overlaysConfig: OverlaysConfig;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    });

    it('produces a non-empty string containing overlay IDs', () => {
        const ctx = buildOverlayContextString(overlaysConfig);
        expect(ctx).toContain('nodejs');
        expect(ctx).toContain('postgres');
        expect(ctx.length).toBeGreaterThan(100);
    });

    it('includes category section headers', () => {
        const ctx = buildOverlayContextString(overlaysConfig);
        expect(ctx).toContain('### language');
        expect(ctx).toContain('### database');
    });

    it('does not include preset overlays', () => {
        const ctx = buildOverlayContextString(overlaysConfig);
        // Check that preset category entries are excluded.
        const presets = overlaysConfig.overlays.filter((o) => o.category === 'preset');
        for (const preset of presets.slice(0, 3)) {
            // Presets should NOT appear as regular entries in the catalog context.
            // (They may appear in other overlay names but not as a direct ID entry.)
            expect(ctx).not.toMatch(new RegExp(`^- \\*\\*${preset.id}\\*\\*`, 'm'));
        }
    });
});

// ─── buildOverlayLookup ───────────────────────────────────────────────────────

describe('buildOverlayLookup', () => {
    let overlaysConfig: OverlaysConfig;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    });

    it('returns a map with known overlay IDs', () => {
        const lookup = buildOverlayLookup(overlaysConfig);
        expect(lookup.has('nodejs')).toBe(true);
        expect(lookup.has('postgres')).toBe(true);
    });

    it('includes name, description, and category', () => {
        const lookup = buildOverlayLookup(overlaysConfig);
        const nodejs = lookup.get('nodejs');
        expect(nodejs?.name).toBeTruthy();
        expect(nodejs?.description).toBeTruthy();
        expect(nodejs?.category).toBe('language');
    });
});
