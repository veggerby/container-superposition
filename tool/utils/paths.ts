import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve a repo-relative path from an anchor directory, handling both
 * source (scripts/) and compiled (dist/scripts/) locations.
 *
 * Tries candidates at [anchor/relative, anchor/../relative] and returns
 * the first that exists, or the first candidate as a fallback.
 */
export function resolveRepoPath(relativePath: string, anchor: string): string {
    const candidates = [path.join(anchor, relativePath), path.join(anchor, '..', relativePath)];
    return candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
}
