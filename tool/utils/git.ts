import { execFileSync } from 'child_process';
import * as path from 'path';

export interface GitQueryResult<T> {
    ok: boolean;
    value?: T;
}

export function listTrackedFilesUnder(
    projectRoot: string,
    outputPath: string
): GitQueryResult<string[]> {
    try {
        const relativeOutputPath = path.isAbsolute(outputPath)
            ? path.relative(projectRoot, outputPath)
            : outputPath;
        const output = execFileSync(
            'git',
            ['-C', projectRoot, 'ls-files', '--', relativeOutputPath],
            {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            }
        );
        return {
            ok: true,
            value: output
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
        };
    } catch {
        return { ok: false };
    }
}

export function isPathIgnored(projectRoot: string, relPath: string): GitQueryResult<boolean> {
    try {
        execFileSync('git', ['-C', projectRoot, 'check-ignore', '-q', '--', relPath], {
            stdio: ['ignore', 'ignore', 'ignore'],
        });
        return { ok: true, value: true };
    } catch (error: any) {
        if (typeof error?.status === 'number' && error.status === 1) {
            return { ok: true, value: false };
        }
        return { ok: false };
    }
}
