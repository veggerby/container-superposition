import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const TASKFILE_PATH = path.join(REPO_ROOT, 'Taskfile.yml');

type TaskDefinition = {
    cmds?: Array<string | { task: string }>;
    desc?: string;
};

type Taskfile = {
    version: string;
    tasks: Record<string, TaskDefinition>;
};

function loadTaskfile(): Taskfile {
    return yaml.load(fs.readFileSync(TASKFILE_PATH, 'utf8')) as Taskfile;
}

describe('Taskfile contributor workflow', () => {
    it('defines the expected repo-root wrapper tasks', () => {
        const taskfile = loadTaskfile();

        expect(taskfile.version).toBe('3');
        expect(taskfile.tasks).toMatchObject({
            default: expect.any(Object),
            lint: expect.any(Object),
            'lint:fix': expect.any(Object),
            test: expect.any(Object),
            'test:bdd': expect.any(Object),
            build: expect.any(Object),
            'docs:generate': expect.any(Object),
            'schema:generate': expect.any(Object),
            init: expect.any(Object),
            'init:build': expect.any(Object),
            regen: expect.any(Object),
            doctor: expect.any(Object),
            validate: expect.any(Object),
            'validate:generated': expect.any(Object),
        });
    });

    it('keeps wrapper tasks delegated to npm scripts or composed tasks', () => {
        const taskfile = loadTaskfile();

        expect(taskfile.tasks.lint.cmds).toEqual(['npm run lint']);
        expect(taskfile.tasks['lint:fix'].cmds).toEqual(['npm run lint:fix']);
        expect(taskfile.tasks.test.cmds).toEqual(['npm test']);
        expect(taskfile.tasks['test:bdd'].cmds).toEqual(['npm run test:bdd']);
        expect(taskfile.tasks.build.cmds).toEqual(['npm run build']);
        expect(taskfile.tasks['docs:generate'].cmds).toEqual(['npm run docs:generate']);
        expect(taskfile.tasks['schema:generate'].cmds).toEqual(['npm run schema:generate']);
        expect(taskfile.tasks.init.cmds).toEqual(['npm run init']);
        expect(taskfile.tasks['init:build'].cmds).toEqual(['npm run init:build']);
        expect(taskfile.tasks.regen.cmds).toEqual(['npm run init -- regen']);
        expect(taskfile.tasks.doctor.cmds).toEqual(['npm run init -- doctor']);
    });

    it('runs lint:fix before lint in the required validation flow', () => {
        const taskfile = loadTaskfile();

        expect(taskfile.tasks.validate.cmds).toEqual([
            { task: 'lint:fix' },
            { task: 'lint' },
            { task: 'test' },
        ]);
        expect(taskfile.tasks['validate:generated'].cmds).toEqual([
            { task: 'validate' },
            { task: 'test:bdd' },
            { task: 'docs:generate' },
            { task: 'schema:generate' },
            { task: 'regen' },
            { task: 'doctor' },
        ]);
    });
});
