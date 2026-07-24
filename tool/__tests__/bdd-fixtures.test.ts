import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    materializeInlineWorkspaceFixture,
    parseInlineWorkspaceFixtureManifest,
    runInlineWorkspaceFixture,
} from '../testing/bdd-fixtures.js';

describe('BDD inline workspace fixtures', () => {
    it('materializes text, yaml, and json files for an inline fixture', () => {
        const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-bdd-inline-fixture-'));

        try {
            materializeInlineWorkspaceFixture({
                workspaceRoot,
                manifestText: [
                    'files:',
                    '  superposition.yml:',
                    '    yaml:',
                    '      stack: plain',
                    '      overlays:',
                    '        - nodejs',
                    '      env:',
                    '        APP_ENV: test',
                    '      mounts:',
                    '        - source=${localWorkspaceFolder}/.cache,target=/workspace/.cache,type=bind',
                    '      outputPath: ./.devcontainer',
                    '  .env:',
                    '    text: |',
                    '      APP_ENV=test',
                    '  config/settings.json:',
                    '    json:',
                    '      enabled: true',
                    '      count: 2',
                ].join('\n'),
            });

            expect(fs.readFileSync(path.join(workspaceRoot, '.env'), 'utf8')).toBe(
                'APP_ENV=test\n'
            );
            expect(fs.readFileSync(path.join(workspaceRoot, 'superposition.yml'), 'utf8')).toBe(
                [
                    'env:',
                    '  APP_ENV: test',
                    'mounts:',
                    '  - source=${localWorkspaceFolder}/.cache,target=/workspace/.cache,type=bind',
                    'outputPath: ./.devcontainer',
                    'overlays:',
                    '  - nodejs',
                    'stack: plain',
                    '',
                ].join('\n')
            );
            expect(
                fs.readFileSync(path.join(workspaceRoot, 'config', 'settings.json'), 'utf8')
            ).toBe(['{', '  "enabled": true,', '  "count": 2', '}', ''].join('\n'));
        } finally {
            fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('rejects unsupported top-level shorthand fields', () => {
        expect(() =>
            parseInlineWorkspaceFixtureManifest(
                [
                    'stack: plain',
                    'files:',
                    '  superposition.yml:',
                    '    yaml:',
                    '      stack: plain',
                ].join('\n')
            )
        ).toThrow(
            'Inline workspace fixture field "stack" is not supported; author project intent inside files.superposition.yml.yaml.'
        );
    });

    it('rejects workspace-escape paths and invalid file entries with actionable errors', () => {
        const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-bdd-inline-fixture-'));

        try {
            expect(
                runInlineWorkspaceFixture({
                    workspaceRoot,
                    manifestText: ['files:', '  ../outside.yml:', '    text: bad'].join('\n'),
                })
            ).toEqual({
                ok: false,
                message:
                    'Inline workspace fixture file path "../outside.yml" must not contain empty, ".", or ".." path segments.',
            });

            expect(
                runInlineWorkspaceFixture({
                    workspaceRoot,
                    manifestText: [
                        'files:',
                        '  superposition.yml:',
                        '    yaml: {}',
                        '    text: nope',
                    ].join('\n'),
                })
            ).toEqual({
                ok: false,
                message:
                    'Inline workspace fixture file "superposition.yml" must declare exactly one of: text, yaml, json.',
            });
        } finally {
            fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('rejects missing files field', () => {
        expect(() => parseInlineWorkspaceFixtureManifest('notFiles: true\n')).toThrow(
            'Inline workspace fixture field "notFiles" is not supported; author project intent inside files.superposition.yml.yaml.'
        );
        expect(() => parseInlineWorkspaceFixtureManifest('{}\n')).toThrow(
            'Inline workspace fixture is missing required top-level field "files".'
        );
    });
});
