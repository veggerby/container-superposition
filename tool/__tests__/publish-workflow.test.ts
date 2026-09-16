import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'publish.yml');
const CLASSIFIER_PATH = path.join(REPO_ROOT, '.github', 'scripts', 'classify-publish-worthy.sh');
const DOWNLOAD_ARTIFACT_METADATA_PATH = path.join(
    __dirname,
    'fixtures',
    'download-artifact-v4.3.0.json'
);
const ZERO_SHA = '0'.repeat(40);
const temporaryRepositories: string[] = [];
const temporaryDirectories: string[] = [];
const PINNED_GITVERSION_SHA = '51d325634925d7d9ce0a7efc2c586c0bc2b9eee6';

interface ActionMetadataFixture {
    repository: string;
    pin: string;
    sourceUrl: string;
    actionYmlSha256: string;
    declaredOutputs: string[];
}

interface WorkflowStep {
    name?: string;
    uses?: string;
    run?: string;
    with?: Record<string, string | number | boolean>;
    env?: Record<string, string>;
}

interface WorkflowJob {
    if?: string;
    needs?: string;
    permissions?: Record<string, string>;
    outputs?: Record<string, string>;
    concurrency?: { group: string; 'cancel-in-progress': boolean };
    steps?: WorkflowStep[];
}

interface PublishWorkflow {
    on: {
        release: { types: string[] };
        push: { branches: string[]; paths?: string[] };
        workflow_dispatch: {
            inputs: Record<string, { description: string; required: boolean; type: string }>;
        };
    };
    jobs: {
        publish: WorkflowJob;
        'classify-main-changes': WorkflowJob;
        'publish-main-prerelease': WorkflowJob;
        'prepare-pr-prerelease': WorkflowJob;
        'publish-pr-prerelease': WorkflowJob;
    };
}

function loadWorkflow(): { source: string; workflow: PublishWorkflow } {
    const source = fs.readFileSync(WORKFLOW_PATH, 'utf8');
    return { source, workflow: yaml.load(source) as PublishWorkflow };
}

function loadDownloadArtifactMetadata(): ActionMetadataFixture {
    return JSON.parse(fs.readFileSync(DOWNLOAD_ARTIFACT_METADATA_PATH, 'utf8'));
}

function findStep(job: WorkflowJob, stepName: string): WorkflowStep {
    const step = job.steps?.find((candidate) => candidate.name === stepName);
    expect(step, `Expected workflow step "${stepName}" to exist`).toBeDefined();
    return step!;
}

function git(cwd: string, ...args: string[]): string {
    return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function classifyChangedPath(changedPath: string, deletePath = false): string {
    const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-classifier-'));
    temporaryRepositories.push(repository);
    git(repository, 'init', '--quiet');
    git(repository, 'config', 'user.email', 'test@example.invalid');
    git(repository, 'config', 'user.name', 'Classifier test');
    fs.writeFileSync(path.join(repository, 'baseline.txt'), 'baseline\n');
    if (deletePath) {
        fs.mkdirSync(path.dirname(path.join(repository, changedPath)), { recursive: true });
        fs.writeFileSync(path.join(repository, changedPath), 'delete me\n');
    }
    git(repository, 'add', '.');
    git(repository, 'commit', '--quiet', '-m', 'baseline');
    const before = git(repository, 'rev-parse', 'HEAD');

    const target = path.join(repository, changedPath);
    if (deletePath) {
        fs.rmSync(target);
    } else {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, 'changed\n');
    }
    git(repository, 'add', '-A');
    git(repository, 'commit', '--quiet', '-m', 'change');
    const after = git(repository, 'rev-parse', 'HEAD');

    return execFileSync(CLASSIFIER_PATH, [before, after], {
        cwd: repository,
        encoding: 'utf8',
    }).trim();
}

function createPackageArtifactFixture(packageJson: Record<string, unknown> = {}): string {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-artifact-'));
    temporaryDirectories.push(directory);
    const packageDirectory = path.join(directory, 'source', 'package');
    fs.mkdirSync(packageDirectory, { recursive: true });
    fs.writeFileSync(
        path.join(packageDirectory, 'package.json'),
        JSON.stringify({
            name: 'container-superposition',
            version: '0.1.3-pr.741.123456',
            scripts: { preinstall: 'touch canary-ran' },
            ...packageJson,
        })
    );
    fs.writeFileSync(path.join(packageDirectory, 'index.js'), 'export {};\n');
    execFileSync('tar', ['-czf', 'package-output.tgz', '-C', 'source', 'package'], {
        cwd: directory,
    });
    fs.mkdirSync(path.join(directory, '.prepared'));
    fs.copyFileSync(
        path.join(directory, 'package-output.tgz'),
        path.join(directory, '.prepared', 'package-output.tgz')
    );
    return directory;
}

function runWorkflowShell(script: string, cwd: string, env: Record<string, string> = {}): void {
    execFileSync('bash', ['-euo', 'pipefail', '-c', script], {
        cwd,
        stdio: 'pipe',
        env: {
            ...process.env,
            ...env,
            GITHUB_OUTPUT: path.join(cwd, 'github-output'),
        },
    });
}

function classifyInitialTree(paths: string[]): string {
    const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-classifier-initial-'));
    temporaryRepositories.push(repository);
    git(repository, 'init', '--quiet');
    git(repository, 'config', 'user.email', 'test@example.invalid');
    git(repository, 'config', 'user.name', 'Classifier test');
    for (const changedPath of paths) {
        const target = path.join(repository, changedPath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, 'initial\n');
    }
    git(repository, 'add', '.');
    git(repository, 'commit', '--quiet', '-m', 'initial');
    const after = git(repository, 'rev-parse', 'HEAD');

    return execFileSync(CLASSIFIER_PATH, [ZERO_SHA, after], {
        cwd: repository,
        encoding: 'utf8',
    }).trim();
}

afterEach(() => {
    for (const repository of temporaryRepositories.splice(0)) {
        fs.rmSync(repository, { recursive: true, force: true });
    }
    for (const directory of temporaryDirectories.splice(0)) {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

describe('publish workflow release channels', () => {
    it('keeps final releases as the only latest path', () => {
        const { workflow } = loadWorkflow();
        const releaseJob = workflow.jobs.publish;

        expect(workflow.on.release.types).toEqual(['published']);
        expect(releaseJob.if).toContain("github.event_name == 'release'");
        expect(releaseJob.if).toContain("startsWith(github.ref, 'refs/tags/v')");
        expect(releaseJob.permissions).toEqual({
            contents: 'write',
            'id-token': 'write',
            'pull-requests': 'write',
        });
        expect(findStep(releaseJob, 'Publish to npm').run).toBe(
            'npm publish --provenance --access public'
        );
        expect(findStep(releaseJob, 'Add release commands to workflow summary').run).toContain(
            'container-superposition@$VERSION'
        );
        expect(releaseJob.steps?.map((step) => step.name)).toContain(
            'Comment on associated PR with release version'
        );
    });

    it('uses a complete-diff classifier rather than native path filters for main prereleases', () => {
        const { workflow } = loadWorkflow();
        const classifierJob = workflow.jobs['classify-main-changes'];
        const mainJob = workflow.jobs['publish-main-prerelease'];

        expect(workflow.on.push.branches).toEqual(['main']);
        expect(workflow.on.push.paths).toBeUndefined();
        expect(classifierJob.if).toContain("github.event_name == 'push'");
        expect(classifierJob.if).toContain("github.ref == 'refs/heads/main'");
        expect(classifierJob.permissions).toEqual({ contents: 'read' });
        expect(classifierJob.outputs).toEqual({
            publish_worthy: '${{ steps.classify.outputs.publish_worthy }}',
        });
        expect(
            findStep(classifierJob, 'Checkout pushed main commit with complete history').with
        ).toEqual({
            ref: '${{ github.sha }}',
            'fetch-depth': 0,
        });
        expect(
            findStep(classifierJob, 'Checkout pushed main commit with complete history').uses
        ).toBe('actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683');
        const classify = findStep(classifierJob, 'Classify complete main diff');
        expect(classify.env).toEqual({
            BEFORE_SHA: '${{ github.event.before }}',
            AFTER_SHA: '${{ github.sha }}',
        });
        expect(classify.run).toContain('classify-publish-worthy.sh');
        expect(classify.run).toContain('$BEFORE_SHA');
        expect(classify.run).toContain('$AFTER_SHA');
        expect(classify.run).toContain('Main prerelease skipped');

        expect(mainJob.needs).toBe('classify-main-changes');
        expect(mainJob.if).toContain(
            "needs.classify-main-changes.outputs.publish_worthy == 'true'"
        );
        expect(mainJob.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
        expect(findStep(mainJob, 'Checkout code').uses).toBe(
            'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683'
        );
        expect(findStep(mainJob, 'Setup GitVersion').uses).toBe(
            `gittools/actions/gitversion/setup@${PINNED_GITVERSION_SHA}`
        );
        expect(findStep(mainJob, 'Determine version with GitVersion').uses).toBe(
            `gittools/actions/gitversion/execute@${PINNED_GITVERSION_SHA}`
        );
        expect(findStep(mainJob, 'Setup Node.js').uses).toBe(
            'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020'
        );
        expect(findStep(mainJob, 'Publish main prerelease to npm').run).toBe(
            'npm publish --provenance --access public --tag prerelease'
        );
    });

    it('keeps manual PR preparation trusted, intent-bound, and shell-safe', () => {
        const { workflow } = loadWorkflow();
        const prJob = workflow.jobs['prepare-pr-prerelease'];

        expect(workflow.on.workflow_dispatch.inputs.pr_number).toMatchObject({
            required: true,
            type: 'string',
        });
        expect(workflow.on.workflow_dispatch.inputs.expected_head_sha).toMatchObject({
            required: true,
            type: 'string',
        });
        expect(prJob.if).toContain("github.event_name == 'workflow_dispatch'");
        expect(prJob.if).toContain("github.ref == 'refs/heads/main'");
        expect(prJob.permissions).toEqual({
            contents: 'read',
            'pull-requests': 'read',
        });
        expect(prJob.concurrency).toEqual({
            group: 'pr-prerelease-dispatch',
            'cancel-in-progress': true,
        });

        const inputs = findStep(prJob, 'Validate PR number and expected head SHA');
        expect(inputs.env).toEqual({
            PR_NUMBER: '${{ inputs.pr_number }}',
            EXPECTED_HEAD_SHA: '${{ inputs.expected_head_sha }}',
        });
        expect(inputs.run).toContain('^[1-9][0-9]*$');
        expect(inputs.run).toContain('^[0-9a-fA-F]{40}$');
        expect(inputs.run).toContain('expected_sha=${EXPECTED_HEAD_SHA,,}');

        const resolveHead = findStep(prJob, 'Resolve and verify immutable PR head SHA');
        expect(resolveHead.env).toEqual({
            GH_TOKEN: '${{ github.token }}',
            PR_NUMBER: '${{ steps.dispatch-inputs.outputs.number }}',
            EXPECTED_HEAD_SHA: '${{ steps.dispatch-inputs.outputs.expected_sha }}',
        });
        expect(resolveHead.run).toContain('repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}');
        expect(resolveHead.run).toContain("--jq '.head | [.sha, .repo.full_name] | @tsv'");
        expect(resolveHead.run).toContain('PR_HEAD_SHA=${PR_HEAD_SHA,,}');
        expect(resolveHead.run).toContain('echo "repository=$PR_HEAD_REPOSITORY"');
        expect(resolveHead.run).toContain('"$PR_HEAD_SHA" != "$EXPECTED_HEAD_SHA"');
        expect(findStep(prJob, 'Checkout immutable verified PR head').with).toEqual({
            repository: '${{ steps.pr-head.outputs.repository }}',
            ref: '${{ steps.pr-head.outputs.sha }}',
            'fetch-depth': 0,
            'persist-credentials': false,
        });
        expect(findStep(prJob, 'Setup GitVersion').uses).toBe(
            `gittools/actions/gitversion/setup@${PINNED_GITVERSION_SHA}`
        );
        expect(findStep(prJob, 'Determine version with GitVersion').uses).toBe(
            `gittools/actions/gitversion/execute@${PINNED_GITVERSION_SHA}`
        );

        for (const step of prJob.steps ?? []) {
            if (step.run !== undefined) {
                expect(
                    step.run,
                    `Dispatch step "${step.name}" interpolates an expression into shell`
                ).not.toContain('${{');
            }
        }
        expect(findStep(prJob, 'Pack prepared PR package').run).toBe(
            'npm pack --pack-destination .prepared'
        );
        const upload = findStep(prJob, 'Upload prepared PR package');
        expect(upload.uses).toBe(
            'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02'
        );
        expect(upload.with).toMatchObject({
            name: 'pr-prerelease-package',
            'retention-days': 1,
            overwrite: false,
        });
    });

    it('executes the workflow-owned checksum producer and inert consumer contract', () => {
        const { workflow } = loadWorkflow();
        const producer = findStep(
            workflow.jobs['prepare-pr-prerelease'],
            'Create checksum manifest'
        );
        const consumer = findStep(
            workflow.jobs['publish-pr-prerelease'],
            'Validate inert artifact transport and archive'
        );
        const fixture = createPackageArtifactFixture();

        runWorkflowShell(producer.run!, fixture);
        expect(fs.readFileSync(path.join(fixture, '.prepared', 'package.sha256'), 'utf8')).toMatch(
            /^[0-9a-f]{64}  package\.tgz\n$/
        );

        const validConsumer = path.join(fixture, 'valid-consumer');
        fs.mkdirSync(validConsumer);
        fs.cpSync(path.join(fixture, '.prepared'), path.join(validConsumer, 'prepared-artifact'), {
            recursive: true,
        });
        runWorkflowShell(consumer.run!, validConsumer);
        expect(fs.existsSync(path.join(validConsumer, 'canary-ran'))).toBe(false);

        for (const [name, manifest] of [
            ['old producer pathname', (digest: string) => `${digest}  .prepared/package.tgz\n`],
            ['digest mismatch', () => `${'0'.repeat(64)}  package.tgz\n`],
        ] as const) {
            const consumerDirectory = path.join(fixture, name.replaceAll(' ', '-'));
            fs.mkdirSync(consumerDirectory);
            fs.cpSync(
                path.join(fixture, '.prepared'),
                path.join(consumerDirectory, 'prepared-artifact'),
                {
                    recursive: true,
                }
            );
            const checksumPath = path.join(
                consumerDirectory,
                'prepared-artifact',
                'package.sha256'
            );
            const digest = fs.readFileSync(checksumPath, 'utf8').split('  ')[0];
            fs.writeFileSync(checksumPath, manifest(digest));
            expect(() => runWorkflowShell(consumer.run!, consumerDirectory), name).toThrow();
        }
    });

    it('uses only declared outputs from the pinned download-artifact action interface', () => {
        const { source, workflow } = loadWorkflow();
        const metadata = loadDownloadArtifactMetadata();
        const download = findStep(
            workflow.jobs['publish-pr-prerelease'],
            'Download prepared PR package'
        );
        const referencedOutputs = [
            ...source.matchAll(/\$\{\{\s*steps\.download-package\.outputs\.([\w-]+)\s*\}\}/g),
        ].map((match) => match[1]);

        expect(download.uses).toBe(`${metadata.repository}@${metadata.pin}`);
        expect(metadata.sourceUrl).toBe(
            `https://raw.githubusercontent.com/${metadata.repository}/${metadata.pin}/action.yml`
        );
        expect(metadata.actionYmlSha256).toMatch(/^[0-9a-f]{64}$/);
        expect(metadata.declaredOutputs).toEqual(['download-path']);
        expect(referencedOutputs.every((output) => metadata.declaredOutputs.includes(output))).toBe(
            true
        );
        expect(referencedOutputs).not.toContain('artifact-digest');
    });

    it('never executes PR code while holding an OIDC token', () => {
        const { workflow } = loadWorkflow();
        const prepare = workflow.jobs['prepare-pr-prerelease'];
        const publisher = workflow.jobs['publish-pr-prerelease'];

        expect(prepare.permissions?.['id-token']).toBeUndefined();
        expect(publisher.needs).toBe('prepare-pr-prerelease');
        expect(publisher.concurrency).toEqual(prepare.concurrency);
        expect(publisher.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
        expect(publisher.steps?.some((step) => step.uses?.startsWith('actions/checkout'))).toBe(
            false
        );
        for (const forbidden of ['npm ci', 'npm run', 'npm version', 'npm pack']) {
            expect(
                publisher.steps?.some((step) => step.run?.includes(forbidden)),
                `publisher must not execute ${forbidden}`
            ).toBe(false);
        }

        const download = findStep(publisher, 'Download prepared PR package');
        expect(download.uses).toBe(
            'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093'
        );
        expect(download.with).toEqual({ name: 'pr-prerelease-package', path: 'prepared-artifact' });
        expect(findStep(publisher, 'Revalidate trusted dispatch inputs').run).toContain(
            '^[1-9][0-9]*$'
        );
        const validate = findStep(publisher, 'Validate inert artifact transport and archive');
        for (const contract of [
            'Artifact must contain exactly two files',
            '! -L',
            'sha256sum --check',
            'tar -tvzf',
            '(^|\\/)\\.\\.?($|\\/)',
            '\\/\\/',
            'package/package.json',
        ]) {
            expect(validate.run).toContain(contract);
        }
        expect(findStep(publisher, 'Setup Node.js for trusted npm publication').uses).toBe(
            'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020'
        );
        expect(findStep(publisher, 'Validate package identity and version').run).toContain(
            'container-superposition'
        );
        expect(findStep(publisher, 'Publish validated PR tarball').run).toBe(
            'npm publish "$TARBALL" --provenance --access public --ignore-scripts --tag "pr-$PR_NUMBER"'
        );
        for (const stepName of [
            'Verify published main prerelease',
            'Verify published PR package',
        ]) {
            const verifyStep = findStep(
                stepName === 'Verify published main prerelease'
                    ? workflow.jobs['publish-main-prerelease']
                    : publisher,
                stepName
            );
            expect(verifyStep.run).toContain('Waiting for npm registry to update...');
            expect(verifyStep.run).toContain('sleep 10');
            expect(verifyStep.run).toContain(
                'Package published successfully but not yet visible in registry'
            );
        }
    });

    it('classifies every publish-worthy path class with NUL-delimited Git paths', () => {
        const publishWorthyPaths = [
            'package.json',
            'package-lock.json',
            '.npmignore',
            'tsconfig.json',
            'README.md',
            'LICENSE',
            'scripts/build.sh',
            'templates/base/file.txt',
            'features/feature/file.txt',
            'overlays/example/overlay.yml',
            'docs/nested/guide.md',
            'tool/commands/publish.ts',
            'tool/odd\nname.ts',
        ];
        for (const changedPath of publishWorthyPaths) {
            expect(classifyChangedPath(changedPath), changedPath).toBe('true');
        }

        for (const changedPath of [
            'CHANGELOG.md',
            '.github/workflows/publish.yml',
            'tool/__tests__/publish.test.ts',
            'tool/commands/publish.test.ts',
            'tool/commands/publish.spec.js',
            'docs/guide.txt',
        ]) {
            expect(classifyChangedPath(changedPath), changedPath).toBe('false');
        }
        expect(classifyChangedPath('templates/deleted.txt', true)).toBe('true');
        expect(classifyInitialTree(['docs/guide.md'])).toBe('true');
        expect(classifyInitialTree(['CHANGELOG.md'])).toBe('false');
    });

    it('fails closed for malformed or unavailable classifier commits', () => {
        expect(() =>
            execFileSync(CLASSIFIER_PATH, ['not-a-sha', 'still-not-a-sha'], {
                encoding: 'utf8',
                stdio: 'pipe',
            })
        ).toThrow();
    });

    it('rejects prepared tarballs that define publishConfig', () => {
        const { workflow } = loadWorkflow();
        const producer = findStep(
            workflow.jobs['prepare-pr-prerelease'],
            'Create checksum manifest'
        );
        const validateArtifact = findStep(
            workflow.jobs['publish-pr-prerelease'],
            'Validate inert artifact transport and archive'
        );
        const validatePackage = findStep(
            workflow.jobs['publish-pr-prerelease'],
            'Validate package identity and version'
        );
        const fixture = createPackageArtifactFixture({
            publishConfig: { registry: 'https://example.invalid' },
        });
        runWorkflowShell(producer.run!, fixture);
        const consumerDirectory = path.join(fixture, 'publish-config-rejection');
        fs.mkdirSync(consumerDirectory);
        fs.cpSync(
            path.join(fixture, '.prepared'),
            path.join(consumerDirectory, 'prepared-artifact'),
            {
                recursive: true,
            }
        );

        runWorkflowShell(validateArtifact.run!, consumerDirectory);
        expect(() =>
            runWorkflowShell(validatePackage.run!, consumerDirectory, {
                PACKAGE_JSON: path.join(consumerDirectory, 'package.json'),
                PR_NUMBER: '741',
                RUN_ID: '123456',
            })
        ).toThrow();
    });

    it('accepts validated PR versions with a semver prerelease base', () => {
        const { workflow } = loadWorkflow();
        const producer = findStep(
            workflow.jobs['prepare-pr-prerelease'],
            'Create checksum manifest'
        );
        const validateArtifact = findStep(
            workflow.jobs['publish-pr-prerelease'],
            'Validate inert artifact transport and archive'
        );
        const validatePackage = findStep(
            workflow.jobs['publish-pr-prerelease'],
            'Validate package identity and version'
        );
        const fixture = createPackageArtifactFixture({
            version: '0.1.3-rc.1-pr.741.123456',
        });
        runWorkflowShell(producer.run!, fixture);
        const consumerDirectory = path.join(fixture, 'semver-prerelease-base');
        fs.mkdirSync(consumerDirectory);
        fs.cpSync(
            path.join(fixture, '.prepared'),
            path.join(consumerDirectory, 'prepared-artifact'),
            {
                recursive: true,
            }
        );

        runWorkflowShell(validateArtifact.run!, consumerDirectory);
        runWorkflowShell(validatePackage.run!, consumerDirectory, {
            PACKAGE_JSON: path.join(consumerDirectory, 'package.json'),
            PR_NUMBER: '741',
            RUN_ID: '123456',
        });
    });

    it('prevents automatic PR publishing and unsafe publication fallbacks', () => {
        const { source, workflow } = loadWorkflow();

        expect(source).not.toContain('pull_request:');
        expect(source).not.toContain('pull_request_target');
        expect(source).not.toContain('NPM_TOKEN');
        expect(source).not.toContain('NODE_AUTH_TOKEN');
        expect(source).not.toContain('npm dist-tag');
        expect(source).not.toContain('publish-prerelease');
        expect(source).not.toContain('secrets.NPM_');

        for (const job of [
            workflow.jobs['publish-main-prerelease'],
            workflow.jobs['publish-pr-prerelease'],
        ]) {
            expect(job.if).not.toContain("github.event_name == 'release'");
            expect(job.steps?.some((step) => step.uses === 'actions/github-script@v7')).toBe(false);
        }
    });
});
