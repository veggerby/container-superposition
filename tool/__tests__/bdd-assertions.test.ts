import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    getValueAtSelector,
    loadScriptAssignments,
    parseSelector,
    parseStructuredValue,
    runBddAssertion,
} from '../testing/bdd-assertions.js';

describe('BDD semantic assertions', () => {
    it('parses shared selectors with array indexes', () => {
        expect(parseSelector('customizations.vscode.extensions[1]')).toEqual([
            'customizations',
            'vscode',
            'extensions',
            1,
        ]);
    });

    it('resolves selector values from nested objects and arrays', () => {
        expect(
            getValueAtSelector(
                {
                    customizations: {
                        vscode: {
                            extensions: ['one', 'two'],
                        },
                    },
                },
                'customizations.vscode.extensions[1]'
            )
        ).toBe('two');
    });

    it('parses structured expected values from YAML or JSON doc strings', () => {
        expect(parseStructuredValue('- one\n- two\n')).toEqual(['one', 'two']);
        expect(parseStructuredValue('{"enabled": true, "count": 2}')).toEqual({
            enabled: true,
            count: 2,
        });
    });

    it('supports exact JSON and YAML semantic assertions', () => {
        const workspaceRoot = makeWorkspace({
            '.devcontainer/devcontainer.json': JSON.stringify(
                {
                    customizations: {
                        vscode: {
                            extensions: [
                                'EditorConfig.EditorConfig',
                                'christian-kohler.npm-intellisense',
                            ],
                            settings: {
                                'files.trimTrailingWhitespace': true,
                                'editor.tabSize': 2,
                            },
                            snippets: [
                                {
                                    language: 'ts',
                                    enabled: true,
                                },
                            ],
                        },
                    },
                },
                null,
                2
            ),
            '.devcontainer/docker-compose.yml': [
                'services:',
                '  postgres:',
                '    image: postgres:${POSTGRES_VERSION:-16}-alpine',
                '    ports:',
                "      - '5432:5432'",
                '    labels:',
                '      - com.example.name=postgres',
                '      - com.example.tier=data',
            ].join('\n'),
        });

        try {
            expect(
                runBddAssertion({
                    kind: 'document-value-equals',
                    fileType: 'json',
                    workspaceRoot,
                    relativePath: '.devcontainer/devcontainer.json',
                    selector: 'customizations.vscode.extensions',
                    expectedValueText:
                        '- EditorConfig.EditorConfig\n- christian-kohler.npm-intellisense\n',
                })
            ).toEqual({ ok: true });

            expect(
                runBddAssertion({
                    kind: 'document-value-equals',
                    fileType: 'json',
                    workspaceRoot,
                    relativePath: '.devcontainer/devcontainer.json',
                    selector: 'customizations.vscode.settings',
                    expectedValueText: 'editor.tabSize: 2\nfiles.trimTrailingWhitespace: true\n',
                })
            ).toEqual({ ok: true });

            expect(
                runBddAssertion({
                    kind: 'document-array-contains-item',
                    fileType: 'yaml',
                    workspaceRoot,
                    relativePath: '.devcontainer/docker-compose.yml',
                    selector: 'services.postgres.ports',
                    expectedValueText: '5432:5432\n',
                })
            ).toEqual({ ok: true });

            expect(
                runBddAssertion({
                    kind: 'document-array-contains-item',
                    fileType: 'yaml',
                    workspaceRoot,
                    relativePath: '.devcontainer/docker-compose.yml',
                    selector: 'services.postgres.labels',
                    expectedValueText: 'com.example.tier=data\n',
                })
            ).toEqual({ ok: true });

            expect(
                runBddAssertion({
                    kind: 'document-array-contains-item',
                    fileType: 'json',
                    workspaceRoot,
                    relativePath: '.devcontainer/devcontainer.json',
                    selector: 'customizations.vscode.snippets',
                    expectedValueText: 'enabled: true\nlanguage: ts\n',
                })
            ).toEqual({ ok: true });
        } finally {
            fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('supports semantic assertions against command JSON output', () => {
        const commandOutput = JSON.stringify(
            {
                overlays: [
                    { id: 'nodejs', category: 'language' },
                    { id: 'postgres', category: 'database' },
                ],
                nextStep: {
                    command: 'cs plan --stack plain --overlays nodejs',
                },
            },
            null,
            2
        );

        expect(
            runBddAssertion({
                kind: 'command-json-value-equals',
                commandOutputText: commandOutput,
                selector: 'nextStep.command',
                expectedValueText: 'cs plan --stack plain --overlays nodejs\n',
            })
        ).toEqual({ ok: true });

        expect(
            runBddAssertion({
                kind: 'command-json-array-contains-item',
                commandOutputText: commandOutput,
                selector: 'overlays',
                expectedValueText: 'id: postgres\ncategory: database\n',
            })
        ).toEqual({ ok: true });
    });

    it('supports compose convenience assertions', () => {
        const workspaceRoot = makeWorkspace({
            '.devcontainer/docker-compose.yml': [
                'services:',
                '  postgres:',
                '    image: postgres:${POSTGRES_VERSION:-16}-alpine',
                '    environment:',
                '      POSTGRES_DB: ${POSTGRES_DB:-devdb}',
                '    ports:',
                "      - '5432:5432'",
                '    networks:',
                '      - devnet',
                'networks:',
                '  devnet:',
                '    name: workspace-devnet',
            ].join('\n'),
        });

        try {
            expect(
                runBddAssertion({
                    kind: 'compose-service-exists',
                    workspaceRoot,
                    relativePath: '.devcontainer/docker-compose.yml',
                    service: 'postgres',
                })
            ).toEqual({ ok: true });
            expect(
                runBddAssertion({
                    kind: 'compose-service-environment-equals',
                    workspaceRoot,
                    relativePath: '.devcontainer/docker-compose.yml',
                    service: 'postgres',
                    variable: 'POSTGRES_DB',
                    expectedValue: '${POSTGRES_DB:-devdb}',
                })
            ).toEqual({ ok: true });
            expect(
                runBddAssertion({
                    kind: 'compose-service-has-port',
                    workspaceRoot,
                    relativePath: '.devcontainer/docker-compose.yml',
                    service: 'postgres',
                    port: '5432:5432',
                })
            ).toEqual({ ok: true });
            expect(
                runBddAssertion({
                    kind: 'compose-service-on-network',
                    workspaceRoot,
                    relativePath: '.devcontainer/docker-compose.yml',
                    service: 'postgres',
                    network: 'devnet',
                })
            ).toEqual({ ok: true });
            expect(
                runBddAssertion({
                    kind: 'compose-network-named',
                    workspaceRoot,
                    relativePath: '.devcontainer/docker-compose.yml',
                    network: 'devnet',
                    expectedName: 'workspace-devnet',
                })
            ).toEqual({ ok: true });
        } finally {
            fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('supports script assignments, exports, and PATH ordering semantics', () => {
        const workspaceRoot = makeWorkspace({
            '.devcontainer/scripts/setup-utils.sh': [
                'export NO_COLOR=1',
                'export TERM=dumb',
                '_CS_APT_LOCK=/tmp/.cs-apt.lock',
                'export PATH="$nvm_dir/current/bin:$PATH"',
            ].join('\n'),
        });

        try {
            expect(
                loadScriptAssignments(workspaceRoot, '.devcontainer/scripts/setup-utils.sh')
            ).toMatchObject({
                NO_COLOR: { exported: true, value: '1' },
                TERM: { exported: true, value: 'dumb' },
                _CS_APT_LOCK: { exported: false, value: '/tmp/.cs-apt.lock' },
                PATH: { exported: true, value: '$nvm_dir/current/bin:$PATH' },
            });

            expect(
                runBddAssertion({
                    kind: 'script-export-equals',
                    workspaceRoot,
                    relativePath: '.devcontainer/scripts/setup-utils.sh',
                    variable: 'NO_COLOR',
                    expectedValue: '1',
                })
            ).toEqual({ ok: true });
            expect(
                runBddAssertion({
                    kind: 'script-assignment-equals',
                    workspaceRoot,
                    relativePath: '.devcontainer/scripts/setup-utils.sh',
                    variable: '_CS_APT_LOCK',
                    expectedValue: '/tmp/.cs-apt.lock',
                })
            ).toEqual({ ok: true });
            expect(
                runBddAssertion({
                    kind: 'script-path-includes-segment',
                    workspaceRoot,
                    relativePath: '.devcontainer/scripts/setup-utils.sh',
                    segment: '$PATH',
                })
            ).toEqual({ ok: true });
            expect(
                runBddAssertion({
                    kind: 'script-path-segment-before',
                    workspaceRoot,
                    relativePath: '.devcontainer/scripts/setup-utils.sh',
                    segment: '$nvm_dir/current/bin',
                    otherSegment: '$PATH',
                })
            ).toEqual({ ok: true });
        } finally {
            fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('returns actionable failure messages for scalar and object comparisons', () => {
        const workspaceRoot = makeWorkspace({
            '.devcontainer/devcontainer.json': JSON.stringify({
                remoteEnv: { PATH: 'one:two' },
                customizations: {
                    vscode: {
                        settings: {
                            'editor.tabSize': 2,
                            'files.trimTrailingWhitespace': true,
                        },
                    },
                },
            }),
        });

        try {
            expect(
                runBddAssertion({
                    kind: 'document-value-equals',
                    fileType: 'json',
                    workspaceRoot,
                    relativePath: '.devcontainer/devcontainer.json',
                    selector: 'remoteEnv.PATH',
                    expectedValueText: 'three\n',
                })
            ).toEqual({
                ok: false,
                message:
                    'Expected JSON file .devcontainer/devcontainer.json path remoteEnv.PATH to equal "three"; actual was "one:two"',
            });

            expect(
                runBddAssertion({
                    kind: 'document-value-equals',
                    fileType: 'json',
                    workspaceRoot,
                    relativePath: '.devcontainer/devcontainer.json',
                    selector: 'customizations.vscode.settings',
                    expectedValueText: 'editor.tabSize: 4\nfiles.trimTrailingWhitespace: true\n',
                })
            ).toEqual({
                ok: false,
                message: [
                    'Expected JSON file .devcontainer/devcontainer.json path customizations.vscode.settings to equal {',
                    '  "editor.tabSize": 4,',
                    '  "files.trimTrailingWhitespace": true',
                    '}; actual was {',
                    '  "editor.tabSize": 2,',
                    '  "files.trimTrailingWhitespace": true',
                    '}',
                ].join('\n'),
            });
        } finally {
            fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });
});

function makeWorkspace(files: Record<string, string>): string {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-bdd-assertions-'));

    for (const [relativePath, content] of Object.entries(files)) {
        const filePath = path.join(workspaceRoot, relativePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content);
    }

    return workspaceRoot;
}
