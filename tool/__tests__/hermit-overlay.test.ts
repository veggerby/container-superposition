import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadOverlayManifest } from '../schema/overlay-loader.js';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const HERMIT_DIR = path.join(REPO_ROOT, 'overlays', 'hermit');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'test-output');

function createFakeHermitToolchain(tempDir: string) {
    const binDir = path.join(tempDir, 'bin');
    const homeBinDir = path.join(tempDir, '.local', 'bin');
    const installRoot = path.join(tempDir, '.local', 'share', 'hermit');
    fs.mkdirSync(binDir);
    fs.mkdirSync(homeBinDir, { recursive: true });

    const javaPath = path.join(binDir, 'java');
    fs.writeFileSync(
        javaPath,
        `#!/bin/sh
if [ "$#" -lt 4 ] || [ "$1" != "-cp" ] || [ "$3" != "org.semanticweb.HermiT.cli.CommandLine" ]; then
    echo "unexpected java invocation: $*" >&2
    exit 64
fi
if [ "$4" = "--version" ]; then
    echo "unsupported HermIT CLI option: --version" >&2
    exit 64
fi
if [ "$4" != "--help" ]; then
    echo "unexpected HermIT CLI option: $4" >&2
    exit 64
fi
exit 0
`
    );
    fs.chmodSync(javaPath, 0o755);

    const mvnPath = path.join(binDir, 'mvn');
    fs.writeFileSync(
        mvnPath,
        `#!/bin/sh
output_dir=""
for arg in "$@"; do
    case "$arg" in
        -DoutputDirectory=*) output_dir="\${arg#-DoutputDirectory=}" ;;
    esac
done
if [ -z "$output_dir" ]; then
    echo "missing output directory" >&2
    exit 2
fi
mkdir -p "$output_dir"
touch "$output_dir/org.semanticweb.hermit-\${HERMIT_VERSION:-1.4.5.519}.jar"
exit 0
`
    );
    fs.chmodSync(mvnPath, 0o755);

    const sudoPath = path.join(binDir, 'sudo');
    fs.writeFileSync(sudoPath, '#!/bin/sh\nexec "$@"\n');
    fs.chmodSync(sudoPath, 0o755);

    return {
        binDir,
        installRoot,
        launcher: path.join(homeBinDir, 'hermit'),
        env: {
            ...process.env,
            HOME: tempDir,
            PATH: `${binDir}:${homeBinDir}:${process.env.PATH ?? ''}`,
            HERMIT_INSTALL_ROOT: installRoot,
            HERMIT_LAUNCHER: path.join(homeBinDir, 'hermit'),
        },
    };
}

describe('HermIT overlay', () => {
    it('declares a plain dev overlay with Java required and Fuseki suggested', () => {
        const manifest = loadOverlayManifest(HERMIT_DIR);

        expect(manifest).toMatchObject({
            id: 'hermit',
            name: 'HermIT Ontology Reasoner',
            category: 'dev',
            supports: [],
            requires: ['java'],
            suggests: ['fuseki'],
            conflicts: [],
            ports: [],
        });
        expect(manifest?.tags).toEqual(
            expect.arrayContaining(['ontology', 'owl', 'reasoner', 'semantic-web', 'hermit'])
        );
        expect(manifest?.parameters?.HERMIT_VERSION?.default).toBe('1.4.5.519');
    });

    it('pins the Maven Central coordinate and launcher contract in setup and verify hooks', () => {
        const setup = fs.readFileSync(path.join(HERMIT_DIR, 'setup.sh'), 'utf8');
        const verify = fs.readFileSync(path.join(HERMIT_DIR, 'verify.sh'), 'utf8');

        expect(setup).toContain('HERMIT_VERSION="{{cs.HERMIT_VERSION}}"');
        expect(setup).toContain('net.sourceforge.owlapi:org.semanticweb.hermit:${HERMIT_VERSION}');
        expect(setup).toContain('maven-dependency-plugin:3.6.1:copy-dependencies');
        expect(setup).toContain('org.semanticweb.HermiT.cli.CommandLine');
        expect(setup).toContain('/usr/local/bin/hermit');
        expect(setup).toContain('launcher_targets_hermit_lib_dir');
        expect(verify).toContain('launcher_targets_hermit_lib_dir');
        expect(setup).toContain('"${HERMIT_LAUNCHER}" --help >/dev/null');
        expect(verify).toContain('hermit --help >/dev/null');
    });

    it.each(['../1.4.5.519', '1.4.5.519/evil', '1.4.5.519<bad>'])(
        'rejects malformed HERMIT_VERSION %s before privileged setup operations',
        (hermitVersion) => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermit-setup-validation-'));
            try {
                const binDir = path.join(tempDir, 'bin');
                const sudoMarker = path.join(tempDir, 'sudo-called');
                fs.mkdirSync(binDir);
                for (const command of ['java', 'mvn']) {
                    const commandPath = path.join(binDir, command);
                    fs.writeFileSync(commandPath, '#!/bin/sh\nexit 0\n');
                    fs.chmodSync(commandPath, 0o755);
                }
                const sudoPath = path.join(binDir, 'sudo');
                fs.writeFileSync(
                    sudoPath,
                    `#!/bin/sh\ntouch "${sudoMarker}"\necho "sudo must not be called" >&2\nexit 99\n`
                );
                fs.chmodSync(sudoPath, 0o755);

                const result = spawnSync('bash', [path.join(HERMIT_DIR, 'setup.sh')], {
                    encoding: 'utf8',
                    env: {
                        ...process.env,
                        HERMIT_VERSION: hermitVersion,
                        PATH: `${binDir}:${process.env.PATH ?? ''}`,
                    },
                });

                expect(result.status).not.toBe(0);
                expect(result.stderr).toContain('Invalid HERMIT_VERSION');
                expect(result.stdout).not.toContain('Resolving Maven artifact');
                expect(fs.existsSync(sudoMarker)).toBe(false);
            } finally {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        }
    );

    it('rejects unsafe HERMIT_INSTALL_ROOT before privileged setup operations', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermit-install-root-validation-'));
        try {
            const binDir = path.join(tempDir, 'bin');
            const sudoMarker = path.join(tempDir, 'sudo-called');
            fs.mkdirSync(binDir);
            for (const command of ['java', 'mvn']) {
                const commandPath = path.join(binDir, command);
                fs.writeFileSync(commandPath, '#!/bin/sh\nexit 0\n');
                fs.chmodSync(commandPath, 0o755);
            }
            const sudoPath = path.join(binDir, 'sudo');
            fs.writeFileSync(
                sudoPath,
                `#!/bin/sh\ntouch "${sudoMarker}"\necho "sudo must not be called" >&2\nexit 99\n`
            );
            fs.chmodSync(sudoPath, 0o755);

            const result = spawnSync('bash', [path.join(HERMIT_DIR, 'setup.sh')], {
                encoding: 'utf8',
                env: {
                    ...process.env,
                    HERMIT_VERSION: '1.4.5.519',
                    HERMIT_INSTALL_ROOT: '/',
                    PATH: `${binDir}:${process.env.PATH ?? ''}`,
                },
            });

            expect(result.status).not.toBe(0);
            expect(result.stderr).toContain('Unsafe HERMIT_INSTALL_ROOT or HERMIT_INSTALL_DIR');
            expect(result.stdout).not.toContain('Resolving Maven artifact');
            expect(fs.existsSync(sudoMarker)).toBe(false);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('rejects unsafe HERMIT_LAUNCHER before privileged setup operations', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermit-launcher-validation-'));
        try {
            const binDir = path.join(tempDir, 'bin');
            const sudoMarker = path.join(tempDir, 'sudo-called');
            fs.mkdirSync(binDir);
            for (const command of ['java', 'mvn']) {
                const commandPath = path.join(binDir, command);
                fs.writeFileSync(commandPath, '#!/bin/sh\nexit 0\n');
                fs.chmodSync(commandPath, 0o755);
            }
            const sudoPath = path.join(binDir, 'sudo');
            fs.writeFileSync(
                sudoPath,
                `#!/bin/sh\ntouch "${sudoMarker}"\necho "sudo must not be called" >&2\nexit 99\n`
            );
            fs.chmodSync(sudoPath, 0o755);

            const result = spawnSync('bash', [path.join(HERMIT_DIR, 'setup.sh')], {
                encoding: 'utf8',
                env: {
                    ...process.env,
                    HERMIT_VERSION: '1.4.5.519',
                    HERMIT_LAUNCHER: '/usr/bin/hermit',
                    PATH: `${binDir}:${process.env.PATH ?? ''}`,
                },
            });

            expect(result.status).not.toBe(0);
            expect(result.stderr).toContain('Unsafe HERMIT_LAUNCHER path');
            expect(result.stdout).not.toContain('Resolving Maven artifact');
            expect(fs.existsSync(sudoMarker)).toBe(false);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('reinstalls a stale launcher that targets a different HermIT version', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermit-stale-launcher-'));
        try {
            const toolchain = createFakeHermitToolchain(tempDir);
            const requestedVersion = '1.4.5.519';
            const staleVersion = '2.0.0';
            const requestedLibDir = path.join(toolchain.installRoot, requestedVersion, 'lib');
            const staleLibDir = path.join(toolchain.installRoot, staleVersion, 'lib');
            fs.mkdirSync(requestedLibDir, { recursive: true });
            fs.mkdirSync(staleLibDir, { recursive: true });
            fs.writeFileSync(
                path.join(requestedLibDir, `org.semanticweb.hermit-${requestedVersion}.jar`),
                ''
            );
            fs.writeFileSync(
                path.join(staleLibDir, `org.semanticweb.hermit-${staleVersion}.jar`),
                ''
            );
            fs.writeFileSync(
                toolchain.launcher,
                `#!/bin/sh\nexec java -cp '${staleLibDir}/*' org.semanticweb.HermiT.cli.CommandLine "$@"\n`
            );
            fs.chmodSync(toolchain.launcher, 0o755);

            const result = spawnSync('bash', [path.join(HERMIT_DIR, 'setup.sh')], {
                encoding: 'utf8',
                env: {
                    ...toolchain.env,
                    HERMIT_VERSION: requestedVersion,
                },
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain(
                `Existing HermIT launcher does not target ${requestedLibDir}; reinstalling`
            );
            const launcher = fs.readFileSync(toolchain.launcher, 'utf8');
            expect(launcher).toContain(`${requestedLibDir}/*`);
            expect(launcher).not.toContain(`${staleLibDir}/*`);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('verify fails when the launcher points at a different HermIT version', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermit-verify-stale-launcher-'));
        try {
            const toolchain = createFakeHermitToolchain(tempDir);
            const requestedVersion = '1.4.5.519';
            const staleVersion = '2.0.0';
            const requestedLibDir = path.join(toolchain.installRoot, requestedVersion, 'lib');
            const staleLibDir = path.join(toolchain.installRoot, staleVersion, 'lib');
            fs.mkdirSync(requestedLibDir, { recursive: true });
            fs.mkdirSync(staleLibDir, { recursive: true });
            fs.writeFileSync(
                path.join(requestedLibDir, `org.semanticweb.hermit-${requestedVersion}.jar`),
                ''
            );
            fs.writeFileSync(
                toolchain.launcher,
                `#!/bin/sh\nexec java -cp '${staleLibDir}/*' org.semanticweb.HermiT.cli.CommandLine "$@"\n`
            );
            fs.chmodSync(toolchain.launcher, 0o755);

            const result = spawnSync('bash', [path.join(HERMIT_DIR, 'verify.sh')], {
                encoding: 'utf8',
                env: {
                    ...toolchain.env,
                    HERMIT_VERSION: requestedVersion,
                },
            });

            expect(result.status).not.toBe(0);
            expect(result.stderr).toContain(
                `hermit launcher does not target selected HermIT library directory: ${requestedLibDir}`
            );
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('materializes Java plus HermIT lifecycle hooks without compose output or HermIT-owned ports', async () => {
        const projectRoot = path.join(TEST_OUTPUT_DIR, 'test-hermit-overlay');
        const outputPath = path.join(projectRoot, '.devcontainer');

        if (fs.existsSync(projectRoot)) {
            fs.rmSync(projectRoot, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: ['hermit'],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        );
        const manifest = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'superposition.json'), 'utf8')
        );

        expect(manifest.overlays).toContain('hermit');
        expect(manifest.overlays).toContain('java');
        expect(devcontainer.features).toHaveProperty('ghcr.io/devcontainers/features/java:1');
        expect(devcontainer.postCreateCommand['setup-hermit']).toBe(
            'bash .devcontainer/scripts/setup-hermit.sh'
        );
        expect(devcontainer.postStartCommand['verify-hermit']).toBe(
            'bash .devcontainer/scripts/verify-hermit.sh'
        );
        expect(fs.existsSync(path.join(outputPath, 'scripts', 'setup-hermit.sh'))).toBe(true);
        expect(fs.existsSync(path.join(outputPath, 'scripts', 'verify-hermit.sh'))).toBe(true);
        expect(fs.existsSync(path.join(outputPath, 'docker-compose.yml'))).toBe(false);
        expect(devcontainer.forwardPorts ?? []).toEqual(expect.arrayContaining([8080, 8081]));
        expect(devcontainer.forwardPorts ?? []).not.toContain(3030);

        fs.rmSync(projectRoot, { recursive: true });
    });
});
