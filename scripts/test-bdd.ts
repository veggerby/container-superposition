#!/usr/bin/env node

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import * as pty from 'node-pty';
import {
    BehaveOutputRewriter,
    discoverBehaveFeatureFiles,
    selectBehaveFeatureFiles,
    stageBehaveSuite,
} from '../tool/testing/bdd.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT_CANDIDATES = [path.join(__dirname, '..'), path.join(__dirname, '..', '..')];
const REPO_ROOT =
    REPO_ROOT_CANDIDATES.find(
        (candidate) =>
            fs.existsSync(path.join(candidate, 'package.json')) &&
            fs.existsSync(path.join(candidate, 'overlays')) &&
            fs.existsSync(path.join(candidate, 'tests', 'behave'))
    ) ?? REPO_ROOT_CANDIDATES[0];

const REQUIREMENTS_PATH = path.join(REPO_ROOT, 'tests', 'behave', 'requirements.txt');
const VENV_DIR = path.join(REPO_ROOT, '.venv');
const REQUIREMENTS_HASH_PATH = path.join(VENV_DIR, '.bdd-requirements.sha256');
const VENV_PYTHON =
    process.platform === 'win32'
        ? path.join(VENV_DIR, 'Scripts', 'python.exe')
        : path.join(VENV_DIR, 'bin', 'python');

async function main(): Promise<void> {
    const rawTargets = process.argv.slice(2);

    if (rawTargets.includes('--help') || rawTargets.includes('-h')) {
        printHelp();
        return;
    }

    const discoveredFeatures = discoverBehaveFeatureFiles(REPO_ROOT);
    const selectedFeatures = selectBehaveFeatureFiles(REPO_ROOT, discoveredFeatures, rawTargets);

    if (selectedFeatures.length === 0) {
        throw new Error('No Behave feature files were discovered.');
    }

    const pythonBinary = ensureBehaveRuntime();
    const stagedSuite = stageBehaveSuite(REPO_ROOT, selectedFeatures);

    try {
        const exitCode = await runBehaveInPty({
            pythonBinary,
            stageRoot: stagedSuite.stageRoot,
            stageFeaturesRoot: stagedSuite.stageFeaturesRoot,
        });
        process.exit(exitCode);
    } finally {
        stagedSuite.cleanup();
    }
}

async function runBehaveInPty(input: {
    pythonBinary: string;
    stageRoot: string;
    stageFeaturesRoot: string;
}): Promise<number> {
    const outputRewriter = new BehaveOutputRewriter(input.stageFeaturesRoot, REPO_ROOT);

    const behaveProcess = pty.spawn(input.pythonBinary, ['-m', 'behave', '--color', 'features'], {
        cwd: input.stageRoot,
        env: {
            ...process.env,
            CS_BDD_NODE_BINARY: process.execPath,
            CS_BDD_REPO_ROOT: REPO_ROOT,
            CS_BDD_STAGE_FEATURES_ROOT: input.stageFeaturesRoot,
            TERM: process.env.TERM || 'xterm-256color',
        },
        cols: process.stdout.columns || 120,
        rows: process.stdout.rows || 40,
        name: 'xterm-256color',
    });

    behaveProcess.onData((chunk) => {
        const rewritten = outputRewriter.push(chunk);
        if (rewritten) {
            process.stdout.write(rewritten);
        }
    });

    if (process.stdout.isTTY) {
        process.stdout.on('resize', () => {
            behaveProcess.resize(process.stdout.columns || 120, process.stdout.rows || 40);
        });
    }

    return await new Promise<number>((resolve) => {
        behaveProcess.onExit(({ exitCode }) => {
            const remaining = outputRewriter.flush();
            if (remaining) {
                process.stdout.write(remaining);
            }
            resolve(exitCode);
        });
    });
}

function ensureBehaveRuntime(): string {
    const bootstrapPython = findBootstrapPython();
    const requirementsHash = hashFile(REQUIREMENTS_PATH);
    const needsVirtualEnv = !fs.existsSync(VENV_PYTHON);
    const installedRequirementsHash = fs.existsSync(REQUIREMENTS_HASH_PATH)
        ? fs.readFileSync(REQUIREMENTS_HASH_PATH, 'utf8').trim()
        : '';

    if (needsVirtualEnv) {
        runOrThrow(
            bootstrapPython,
            ['-m', 'venv', VENV_DIR],
            REPO_ROOT,
            'Failed to create .venv for Behave'
        );
    }

    if (needsVirtualEnv || installedRequirementsHash !== requirementsHash) {
        runOrThrow(
            VENV_PYTHON,
            ['-m', 'pip', 'install', '-r', REQUIREMENTS_PATH],
            REPO_ROOT,
            'Failed to install Behave requirements'
        );
        fs.writeFileSync(REQUIREMENTS_HASH_PATH, `${requirementsHash}\n`);
    }

    return VENV_PYTHON;
}

function findBootstrapPython(): string {
    for (const candidate of [process.env.PYTHON, 'python3', 'python']) {
        if (!candidate) {
            continue;
        }

        const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
        if (result.status === 0) {
            return candidate;
        }
    }

    throw new Error(
        'Python 3 is required for npm run test:bdd. Use the standard repo devcontainer or install python3 locally.'
    );
}

function hashFile(filePath: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function runOrThrow(command: string, args: string[], cwd: string, errorMessage: string): void {
    const result = spawnSync(command, args, {
        cwd,
        env: process.env,
        encoding: 'utf8',
        stdio: 'pipe',
    });

    if (result.status === 0) {
        return;
    }

    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(details ? `${errorMessage}\n${details}` : errorMessage);
}

function printHelp(): void {
    console.log(
        `Usage: npm run test:bdd -- [feature-or-subpath ...]\n\nRuns the repo Behave suite with shared steps and auto-discovers:\n- tests/behave/features/**/*.feature\n- overlays/<id>/tests/behave/**/*.feature`
    );
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
});
