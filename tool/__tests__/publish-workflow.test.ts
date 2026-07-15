import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'publish.yml');
const PRERELEASE_LABEL = 'publish-prerelease';

interface WorkflowStep {
    name?: string;
    uses?: string;
    run?: string;
    with?: { script?: string };
}

interface WorkflowJob {
    if?: string;
    permissions?: Record<string, string>;
    steps?: WorkflowStep[];
}

interface PublishWorkflow {
    on: {
        release: { types: string[] };
        pull_request: { types: string[] };
    };
    jobs: {
        publish: WorkflowJob;
        'publish-prerelease': WorkflowJob;
    };
}

function loadWorkflow(): { source: string; workflow: PublishWorkflow } {
    const source = fs.readFileSync(WORKFLOW_PATH, 'utf8');
    return { source, workflow: yaml.load(source) as PublishWorkflow };
}

function shouldPublishPrerelease(eventName: string, draft: boolean, labels: string[]): boolean {
    return eventName === 'pull_request' && (!draft || labels.includes(PRERELEASE_LABEL));
}

function findStep(job: WorkflowJob, stepName: string): WorkflowStep {
    const step = job.steps?.find((candidate) => candidate.name === stepName);
    expect(step, `Expected workflow step "${stepName}" to exist`).toBeDefined();
    return step!;
}

describe('publish workflow prerelease gate', () => {
    it('keeps required triggers and release gate shape', () => {
        const { source, workflow } = loadWorkflow();

        expect(source).not.toContain('pull_request_target');
        expect(workflow.on.release.types).toEqual(['published']);
        expect([...workflow.on.pull_request.types].sort()).toEqual(
            [
                'converted_to_draft',
                'labeled',
                'opened',
                'ready_for_review',
                'reopened',
                'synchronize',
                'unlabeled',
            ].sort()
        );

        expect(workflow.jobs.publish.if).toContain("github.event_name == 'release'");
        expect(workflow.jobs.publish.if).toContain("startsWith(github.ref, 'refs/tags/v')");
    });

    it('keeps release summary and release PR comment steps in publish job', () => {
        const { workflow } = loadWorkflow();
        const releaseJob = workflow.jobs.publish;

        expect(releaseJob.permissions).toEqual({
            contents: 'write',
            'id-token': 'write',
            'pull-requests': 'write',
        });

        const releaseStepNames = releaseJob.steps?.map((step) => step.name ?? '') ?? [];
        expect(releaseStepNames).toContain('Publish to npm');
        expect(releaseStepNames).toContain('Add release commands to workflow summary');
        expect(releaseStepNames).toContain('Comment on associated PR with release version');

        const publishIndex = releaseStepNames.indexOf('Publish to npm');
        const summaryIndex = releaseStepNames.indexOf('Add release commands to workflow summary');
        const commentIndex = releaseStepNames.indexOf(
            'Comment on associated PR with release version'
        );
        expect(summaryIndex).toBeGreaterThan(publishIndex);
        expect(commentIndex).toBeGreaterThan(publishIndex);
    });

    it('gates publish-prerelease before publish, shared tag, summary, and comment steps', () => {
        const { workflow } = loadWorkflow();
        const prereleaseJob = workflow.jobs['publish-prerelease'];

        expect(prereleaseJob.permissions).toEqual({
            contents: 'read',
            'id-token': 'write',
            'pull-requests': 'write',
        });
        expect(prereleaseJob.if).toContain("github.event_name == 'pull_request'");
        expect(prereleaseJob.if).toContain('github.event.pull_request.draft == false');
        expect(prereleaseJob.if).toContain(
            "contains(github.event.pull_request.labels.*.name, 'publish-prerelease')"
        );

        const prereleaseStepNames = prereleaseJob.steps?.map((step) => step.name ?? '') ?? [];
        expect(prereleaseStepNames).toContain('Publish prerelease to npm');
        expect(prereleaseStepNames).toContain('Add shared prerelease dist-tag');
        expect(prereleaseStepNames).toContain('Add prerelease commands to workflow summary');
        expect(prereleaseStepNames).toContain('Comment on PR with prerelease version');
        expect(prereleaseStepNames.some((name) => name.toLowerCase().includes('skip'))).toBe(false);

        const publishIndex = prereleaseStepNames.indexOf('Publish prerelease to npm');
        const sharedTagIndex = prereleaseStepNames.indexOf('Add shared prerelease dist-tag');
        const summaryIndex = prereleaseStepNames.indexOf(
            'Add prerelease commands to workflow summary'
        );
        const commentIndex = prereleaseStepNames.indexOf('Comment on PR with prerelease version');
        expect(sharedTagIndex).toBeGreaterThan(publishIndex);
        expect(summaryIndex).toBeGreaterThan(sharedTagIndex);
        expect(commentIndex).toBeGreaterThan(sharedTagIndex);

        const publishStep = findStep(prereleaseJob, 'Publish prerelease to npm');
        expect(publishStep.run).toContain(
            'npm publish --provenance --access public --tag pr-${{ github.event.pull_request.number }}'
        );

        const sharedTagStep = findStep(prereleaseJob, 'Add shared prerelease dist-tag');
        expect(sharedTagStep.run).toContain(
            'npm dist-tag add container-superposition@$VERSION prerelease'
        );

        const summaryStep = findStep(prereleaseJob, 'Add prerelease commands to workflow summary');
        expect(summaryStep.run).toContain('npm install container-superposition@$VERSION');
        expect(summaryStep.run).toContain('npx container-superposition@$VERSION regen');
        expect(summaryStep.run).toContain('npm install container-superposition@pr-$PR_NUMBER');
        expect(summaryStep.run).toContain('npm install container-superposition@prerelease');
        expect(summaryStep.run).toContain('npx container-superposition@prerelease regen');

        const commentStep = findStep(prereleaseJob, 'Comment on PR with prerelease version');
        expect(commentStep.with?.script).toContain(
            '`npm install container-superposition@${version}`'
        );
        expect(commentStep.with?.script).toContain(
            '`npx container-superposition@${version} regen`'
        );
        expect(commentStep.with?.script).toContain('`npm install container-superposition@${tag}`');
        expect(commentStep.with?.script).toContain(
            "'npm install container-superposition@prerelease'"
        );
        expect(commentStep.with?.script).toContain(
            "'npx container-superposition@prerelease regen'"
        );

        const allJobs = Object.entries(workflow.jobs);
        const prereleaseCommentJobs = allJobs.filter(([, job]) =>
            job.steps?.some((step) => step.name === 'Comment on PR with prerelease version')
        );
        expect(prereleaseCommentJobs.map(([name]) => name)).toEqual(['publish-prerelease']);

        const releaseCommentJobs = allJobs.filter(([, job]) =>
            job.steps?.some((step) => step.name === 'Comment on associated PR with release version')
        );
        expect(releaseCommentJobs.map(([name]) => name)).toEqual(['publish']);
    });

    it.each([
        ['pull_request', true, [], false],
        ['pull_request', true, ['publish-prerelease'], true],
        ['pull_request', true, ['Publish-Prerelease'], false],
        ['pull_request', true, ['other'], false],
        ['pull_request', false, [], true],
        ['pull_request', false, ['publish-prerelease'], true],
        ['release', false, ['publish-prerelease'], false],
    ])(
        'evaluates prerelease gate for event=%s draft=%s labels=%j',
        (eventName, draft, labels, expected) => {
            expect(shouldPublishPrerelease(eventName, draft, labels)).toBe(expected);
        }
    );
});
