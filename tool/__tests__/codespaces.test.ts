import { describe, it, expect } from 'vitest';
import type { QuestionnaireAnswers } from '../schema/types.js';

describe('Codespaces Support', () => {
    it('should include codespaces field in QuestionnaireAnswers', () => {
        // Test that the type accepts codespaces flag
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: ['docker-in-docker'],
            observability: [],
            outputPath: './.devcontainer',
            codespaces: true,
        };

        expect(answers.codespaces).toBe(true);
    });

    it('should handle optional codespaces field', () => {
        // Test that codespaces is optional
        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath: './.devcontainer',
        };

        expect(answers.codespaces).toBeUndefined();
    });

    it('should accept docker-in-docker with codespaces flag', () => {
        // Test recommended configuration for Codespaces
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: ['postgres'],
            playwright: false,
            cloudTools: [],
            devTools: ['docker-in-docker'],
            observability: [],
            outputPath: './.devcontainer',
            codespaces: true,
        };

        expect(answers.codespaces).toBe(true);
        expect(answers.devTools).toContain('docker-in-docker');
        expect(answers.devTools).not.toContain('docker-sock');
    });
});
