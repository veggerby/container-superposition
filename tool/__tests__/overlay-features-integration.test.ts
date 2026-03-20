/**
 * Integration test: Validate all ghcr.io devcontainer feature references
 *
 * Scans every overlays/<id>/devcontainer.patch.json for ghcr.io feature keys and
 * performs a live registry lookup to confirm each one is resolvable.
 *
 * Skipped by default in unit-test runs.  Run explicitly with:
 *   npm run test:integration
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch a ghcr.io anonymous bearer token for the given repository path */
function getGhcrToken(repoPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = `https://ghcr.io/token?scope=repository:${repoPath}:pull&service=ghcr.io`;
        const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
                res.resume(); // drain to free memory
                reject(new Error(`Token endpoint returned HTTP ${res.statusCode} for ${repoPath}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data).token ?? '');
                } catch {
                    reject(new Error(`Failed to parse token response for ${repoPath}`));
                }
            });
        });
        req.setTimeout(10_000, () => {
            req.destroy(new Error(`Token request timed out for ${repoPath}`));
        });
        req.on('error', reject);
    });
}

/** Return the HTTP status code for GET /v2/<repoPath>/tags/list on ghcr.io */
function checkGhcrFeature(repoPath: string, token: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const req = https.get(
            {
                host: 'ghcr.io',
                path: `/v2/${repoPath}/tags/list`,
                headers: { Authorization: `Bearer ${token}` },
            },
            (res) => {
                res.resume(); // drain to free memory (we only need the status code)
                resolve(res.statusCode ?? 0);
            }
        );
        req.setTimeout(10_000, () => {
            req.destroy(new Error(`Feature check timed out for ${repoPath}`));
        });
        req.on('error', reject);
    });
}

/** Collect every unique ghcr.io feature path (without version tag) from all overlay patches */
function collectGhcrFeatures(): Map<string, string[]> {
    // Returns Map<featurePath, overlayIds[]>
    const result = new Map<string, string[]>();

    if (!fs.existsSync(OVERLAYS_DIR)) return result;

    for (const entry of fs.readdirSync(OVERLAYS_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const patchPath = path.join(OVERLAYS_DIR, entry.name, 'devcontainer.patch.json');
        if (!fs.existsSync(patchPath)) continue;

        let patch: Record<string, any>;
        try {
            patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
        } catch {
            continue;
        }

        const features: Record<string, any> = patch.features ?? {};
        for (const key of Object.keys(features)) {
            if (!key.startsWith('ghcr.io/')) continue;

            // Strip the version tag (":1", ":2", etc.) to get just the repo path
            const repoPath = key.replace(/^ghcr\.io\//, '').replace(/:\d+$/, '');

            if (!result.has(repoPath)) result.set(repoPath, []);
            result.get(repoPath)!.push(entry.name);
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const featureMap = collectGhcrFeatures();

describe.skipIf(process.env.INTEGRATION !== 'true')(
    'Overlay feature registry sanity (integration)',
    () => {
        if (featureMap.size === 0) {
            it('no ghcr.io features found — nothing to check', () => {
                expect(true).toBe(true);
            });
            return;
        }

        for (const [repoPath, overlays] of featureMap) {
            it(`ghcr.io/${repoPath} is resolvable (used by: ${overlays.join(', ')})`, async () => {
                const token = await getGhcrToken(repoPath);
                const status = await checkGhcrFeature(repoPath, token);
                expect(
                    status,
                    `Feature ghcr.io/${repoPath}:? returned ${status}. ` +
                        `Used by overlays: ${overlays.join(', ')}. ` +
                        `Check containers.dev/features for the correct URI.`
                ).toBe(200);
            }, 15_000); // 15 s per feature (network timeout)
        }
    }
);
