import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'validate-overlays.yml');

interface WorkflowStep {
    name?: string;
    uses?: string;
    run?: string;
}

interface WorkflowJob {
    steps?: WorkflowStep[];
}

interface ValidateOverlaysWorkflow {
    on: {
        push?: {
            branches?: string[];
            paths: string[];
        };
        pull_request: {
            paths: string[];
        };
    };
    jobs: {
        validate: WorkflowJob;
    };
}

describe('Behave command and workflow wiring', () => {
    it('exposes npm run test:bdd through the shared discovery wrapper', () => {
        const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')) as {
            scripts: Record<string, string>;
        };

        expect(packageJson.scripts['test:bdd']).toBe('tsx scripts/test-bdd.ts');
    });

    it('keeps validate-overlays CI wired to Behave on pull requests and main pushes', () => {
        const workflow = yaml.load(
            fs.readFileSync(WORKFLOW_PATH, 'utf8')
        ) as ValidateOverlaysWorkflow;
        const pullRequestPaths = workflow.on.pull_request.paths;
        const pushPaths = workflow.on.push?.paths ?? [];
        const stepCommands = workflow.jobs.validate.steps?.map((step) => step.run ?? '') ?? [];

        const expectedPaths = [
            'overlays/**',
            'tool/**',
            'tests/behave/**',
            'scripts/**',
            'package.json',
            'Taskfile.yml',
            'superposition.yml',
            '.github/workflows/validate-overlays.yml',
        ];

        expect(pullRequestPaths).toEqual(expect.arrayContaining(expectedPaths));
        expect(pushPaths).toEqual(expect.arrayContaining(expectedPaths));
        expect(workflow.on.push?.branches).toEqual(expect.arrayContaining(['main']));
        expect(
            workflow.jobs.validate.steps?.some((step) => step.uses === 'actions/setup-python@v5')
        ).toBe(true);
        expect(stepCommands).toContain('npm run test:bdd');
    });
});
