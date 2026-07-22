import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    BehaveOutputRewriter,
    discoverBehaveFeatureFiles,
    rewriteBehaveOutput,
    selectBehaveFeatureFiles,
    stageBehaveSuite,
} from '../testing/bdd.js';

function makeTempRepo(): string {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-bdd-runner-'));
    fs.mkdirSync(path.join(repoRoot, 'tests', 'behave', 'features'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'tests', 'behave', 'fixtures', 'shared-fixture'), {
        recursive: true,
    });
    fs.mkdirSync(path.join(repoRoot, 'tests', 'behave', 'steps'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'tests', 'behave', 'environment.py'), '# env\n');
    fs.writeFileSync(
        path.join(repoRoot, 'tests', 'behave', 'fixtures', 'shared-fixture', 'fixture.txt'),
        'shared\n'
    );
    fs.writeFileSync(
        path.join(repoRoot, 'tests', 'behave', 'features', 'repo.feature'),
        'Feature: Repo\n'
    );
    fs.mkdirSync(
        path.join(repoRoot, 'overlays', 'alpha', 'tests', 'behave', 'fixtures', 'overlay-fixture'),
        {
            recursive: true,
        }
    );
    fs.writeFileSync(
        path.join(repoRoot, 'overlays', 'alpha', 'tests', 'behave', 'overlay.feature'),
        'Feature: Overlay\n'
    );
    fs.writeFileSync(
        path.join(
            repoRoot,
            'overlays',
            'alpha',
            'tests',
            'behave',
            'fixtures',
            'overlay-fixture',
            'fixture.txt'
        ),
        'overlay\n'
    );
    fs.mkdirSync(path.join(repoRoot, 'overlays', 'beta'), { recursive: true });
    return repoRoot;
}

describe('Behave discovery runner utilities', () => {
    it('discovers repo and overlay feature files while tolerating overlays without behave tests', () => {
        const repoRoot = makeTempRepo();

        try {
            expect(discoverBehaveFeatureFiles(repoRoot)).toEqual([
                path.join('overlays', 'alpha', 'tests', 'behave', 'overlay.feature'),
                path.join('tests', 'behave', 'features', 'repo.feature'),
            ]);
        } finally {
            fs.rmSync(repoRoot, { recursive: true, force: true });
        }
    });

    it('supports focused path selection for repo and overlay subpaths', () => {
        const repoRoot = makeTempRepo();
        const discovered = discoverBehaveFeatureFiles(repoRoot);

        try {
            expect(
                selectBehaveFeatureFiles(repoRoot, discovered, [
                    path.join('overlays', 'alpha', 'tests', 'behave'),
                ])
            ).toEqual([path.join('overlays', 'alpha', 'tests', 'behave', 'overlay.feature')]);

            expect(
                selectBehaveFeatureFiles(repoRoot, discovered, [
                    path.join('tests', 'behave', 'features', 'repo.feature'),
                ])
            ).toEqual([path.join('tests', 'behave', 'features', 'repo.feature')]);
        } finally {
            fs.rmSync(repoRoot, { recursive: true, force: true });
        }
    });

    it('fails clearly when a requested target matches no discovered feature files', () => {
        const repoRoot = makeTempRepo();
        const discovered = discoverBehaveFeatureFiles(repoRoot);

        try {
            expect(() =>
                selectBehaveFeatureFiles(repoRoot, discovered, [
                    path.join('overlays', 'missing', 'tests', 'behave'),
                ])
            ).toThrow(/No Behave features matched/);
        } finally {
            fs.rmSync(repoRoot, { recursive: true, force: true });
        }
    });

    it('stages shared fixtures and overlay-local support data beside discovered features', () => {
        const repoRoot = makeTempRepo();
        const discovered = discoverBehaveFeatureFiles(repoRoot);
        const staged = stageBehaveSuite(repoRoot, discovered);

        try {
            expect(
                fs.existsSync(
                    path.join(
                        staged.stageFeaturesRoot,
                        'tests',
                        'behave',
                        'fixtures',
                        'shared-fixture',
                        'fixture.txt'
                    )
                )
            ).toBe(true);
            expect(
                fs.existsSync(
                    path.join(
                        staged.stageFeaturesRoot,
                        'overlays',
                        'alpha',
                        'tests',
                        'behave',
                        'fixtures',
                        'overlay-fixture',
                        'fixture.txt'
                    )
                )
            ).toBe(true);
        } finally {
            staged.cleanup();
            fs.rmSync(repoRoot, { recursive: true, force: true });
        }
    });

    it('rewrites staged failure output back to source-owned relative paths', () => {
        const repoRoot = makeTempRepo();
        const discovered = discoverBehaveFeatureFiles(repoRoot);
        const staged = stageBehaveSuite(repoRoot, discovered);

        try {
            const stagedFailure = `${path.join(staged.stageFeaturesRoot, discovered[0])}:7`;
            expect(
                rewriteBehaveOutput(stagedFailure, staged.stageFeaturesRoot, repoRoot)
            ).toContain(path.join(repoRoot, discovered[0]));
        } finally {
            staged.cleanup();
            fs.rmSync(repoRoot, { recursive: true, force: true });
        }
    });

    it('rewrites streamed behave output while preserving partial trailing chunks', () => {
        const repoRoot = makeTempRepo();
        const discovered = discoverBehaveFeatureFiles(repoRoot);
        const staged = stageBehaveSuite(repoRoot, discovered);

        try {
            const rewriter = new BehaveOutputRewriter(staged.stageFeaturesRoot, repoRoot);
            const streamed = rewriter.push(
                `${path.join(staged.stageFeaturesRoot, discovered[0])}:7\npartial `
            );
            const flushed = rewriter.flush();

            expect(streamed).toContain(path.join(repoRoot, discovered[0]));
            expect(flushed).toBe('partial ');
        } finally {
            staged.cleanup();
            fs.rmSync(repoRoot, { recursive: true, force: true });
        }
    });
});
