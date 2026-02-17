import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Overlay Imports', () => {
    const testOutputPath = path.join(__dirname, '..', '..', 'test-output-imports');

    beforeEach(() => {
        // Clean up test output directory
        if (fs.existsSync(testOutputPath)) {
            fs.rmSync(testOutputPath, { recursive: true, force: true });
        }
        fs.mkdirSync(testOutputPath, { recursive: true });
    });

    afterEach(() => {
        // Clean up after tests
        if (fs.existsSync(testOutputPath)) {
            fs.rmSync(testOutputPath, { recursive: true, force: true });
        }
    });

    it('should handle overlays without imports', async () => {
        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            needsDocker: false,
            language: ['nodejs'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath: testOutputPath,
        };

        await composeDevContainer(answers);

        const devcontainerPath = path.join(testOutputPath, 'devcontainer.json');
        expect(fs.existsSync(devcontainerPath)).toBe(true);

        const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
        expect(devcontainer).toBeDefined();
    });

    it('should create test overlay with imports for manual testing', () => {
        // Create a test overlay with imports in tmp directory
        const testOverlaysDir = path.join(__dirname, '..', '..', 'tmp', 'test-overlays');
        const testOverlayDir = path.join(testOverlaysDir, 'test-import-overlay');

        if (fs.existsSync(testOverlayDir)) {
            fs.rmSync(testOverlayDir, { recursive: true });
        }

        fs.mkdirSync(testOverlayDir, { recursive: true });

        // Create overlay.yml with imports
        const overlayYml = `id: test-import-overlay
name: Test Import Overlay
description: Test overlay demonstrating imports feature
category: dev
supports: []
requires: []
suggests: []
conflicts: []
tags:
    - test
    - imports
ports: []
imports:
    - .shared/vscode/recommended-extensions.json
`;
        fs.writeFileSync(path.join(testOverlayDir, 'overlay.yml'), overlayYml);

        // Create minimal devcontainer.patch.json
        const patchJson = {
            $schema:
                'https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json',
            customizations: {
                vscode: {
                    extensions: ['test.extension'],
                },
            },
        };
        fs.writeFileSync(
            path.join(testOverlayDir, 'devcontainer.patch.json'),
            JSON.stringify(patchJson, null, 4)
        );

        expect(fs.existsSync(testOverlayDir)).toBe(true);
        expect(fs.existsSync(path.join(testOverlayDir, 'overlay.yml'))).toBe(true);
        expect(fs.existsSync(path.join(testOverlayDir, 'devcontainer.patch.json'))).toBe(true);

        // Clean up
        fs.rmSync(testOverlayDir, { recursive: true });
    });
});
