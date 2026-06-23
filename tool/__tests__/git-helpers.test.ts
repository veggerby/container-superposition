import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

function writeExecutable(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
    fs.chmodSync(filePath, 0o755);
}

describe('git-helpers setup', () => {
    it('replaces broken host gh credential helper path with container-safe gh helper', () => {
        const repoRoot = path.join(__dirname, '..', '..');
        const setupScript = path.join(repoRoot, 'overlays', 'git-helpers', 'setup.sh');
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-helpers-test-'));
        const homeDir = path.join(tempRoot, 'home');
        const binDir = path.join(tempRoot, 'bin');
        fs.mkdirSync(homeDir, { recursive: true });
        fs.mkdirSync(binDir, { recursive: true });

        writeExecutable(
            path.join(binDir, 'gh'),
            `#!/bin/bash
if [ "$1" = "--version" ]; then
  echo "gh version test"
  exit 0
fi
exit 0
`
        );

        writeExecutable(
            path.join(binDir, 'git-lfs'),
            `#!/bin/bash
if [ "$1" = "version" ]; then
  echo "git-lfs/test"
  exit 0
fi
exit 0
`
        );

        const env = {
            ...process.env,
            HOME: homeDir,
            XDG_CONFIG_HOME: path.join(tempRoot, 'xdg-config'),
            PATH: `${binDir}:${process.env.PATH ?? ''}`,
            GIT_CONFIG_NOSYSTEM: '1',
        };

        execFileSync(
            'git',
            [
                'config',
                '--global',
                'credential.helper',
                '!/home/linuxbrew/.linuxbrew/bin/gh auth git-credential',
            ],
            { env }
        );

        execFileSync('bash', [setupScript], { env, cwd: tempRoot, stdio: 'pipe' });

        const helpers = execFileSync(
            'git',
            ['config', '--global', '--get-all', 'credential.helper'],
            {
                env,
                encoding: 'utf-8',
            }
        )
            .trim()
            .split('\n')
            .filter(Boolean);

        expect(helpers).toContain('!gh auth git-credential');
        expect(helpers).not.toContain('!/home/linuxbrew/.linuxbrew/bin/gh auth git-credential');
    });
});
