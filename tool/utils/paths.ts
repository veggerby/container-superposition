import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve a repo-relative path from an anchor directory, handling both
 * source (scripts/) and compiled (dist/scripts/) locations.
 *
 * Walks up from the anchor directory collecting candidate paths:
 * anchor/relative, anchor/../relative, anchor/../../relative, ...
 * Returns the first that exists, or the first candidate as a fallback.
 */

// Maximum number of parent directories to walk up when searching for repo-relative paths.
// 5 levels is sufficient to cover source (<repo>/tool/questionnaire) and compiled
// (<repo>/dist/tool/questionnaire) layouts without walking too far up the filesystem.
const MAX_DIRECTORY_WALK_DEPTH = 5;

export function resolveRepoPath(relativePath: string, anchor: string): string {
    const candidates: string[] = [];
    let currentAnchor = anchor;

    // Walk up from the anchor directory, collecting candidate paths like:
    // anchor/relative, anchor/../relative, anchor/../../relative, ...
    // Stop after MAX_DIRECTORY_WALK_DEPTH levels or when reaching the filesystem root.
    for (let i = 0; i < MAX_DIRECTORY_WALK_DEPTH; i++) {
        candidates.push(path.join(currentAnchor, relativePath));
        const parent = path.dirname(currentAnchor);
        if (parent === currentAnchor) {
            break;
        }
        currentAnchor = parent;
    }

    return candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
}
