import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const BDD_ROOT_SEGMENT = path.join('tests', 'behave');
export const BDD_FEATURES_SEGMENT = path.join(BDD_ROOT_SEGMENT, 'features');
const OVERLAY_BDD_SEGMENT = path.join('tests', 'behave');

export function discoverBehaveFeatureFiles(repoRoot: string): string[] {
    const discovered = new Set<string>();

    const repoFeaturesRoot = path.join(repoRoot, BDD_FEATURES_SEGMENT);
    for (const featurePath of walkFeatureFiles(repoRoot, repoFeaturesRoot)) {
        discovered.add(featurePath);
    }

    const overlaysRoot = path.join(repoRoot, 'overlays');
    if (fs.existsSync(overlaysRoot)) {
        for (const entry of fs.readdirSync(overlaysRoot, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name.startsWith('.')) {
                continue;
            }

            const overlayFeaturesRoot = path.join(overlaysRoot, entry.name, OVERLAY_BDD_SEGMENT);
            for (const featurePath of walkFeatureFiles(repoRoot, overlayFeaturesRoot)) {
                discovered.add(featurePath);
            }
        }
    }

    return [...discovered].sort();
}

export function selectBehaveFeatureFiles(
    repoRoot: string,
    discoveredFiles: string[],
    rawTargets: string[]
): string[] {
    if (rawTargets.length === 0) {
        return discoveredFiles;
    }

    const selected = new Set<string>();

    for (const rawTarget of rawTargets) {
        const normalizedTarget = normalizeTarget(repoRoot, rawTarget);
        const matches = discoveredFiles.filter(
            (featurePath) =>
                featurePath === normalizedTarget ||
                featurePath.startsWith(`${normalizedTarget}${path.sep}`)
        );

        if (matches.length === 0) {
            throw new Error(
                `No Behave features matched "${rawTarget}". Use a path under tests/behave/ or overlays/<id>/tests/behave/.`
            );
        }

        for (const match of matches) {
            selected.add(match);
        }
    }

    return [...selected].sort();
}

export interface StagedBehaveSuite {
    stageRoot: string;
    stageFeaturesRoot: string;
    cleanup: () => void;
}

export function stageBehaveSuite(repoRoot: string, featurePaths: string[]): StagedBehaveSuite {
    const stageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'container-superposition-bdd-'));
    const stageFeaturesRoot = path.join(stageRoot, 'features');
    const harnessRoot = path.join(repoRoot, BDD_ROOT_SEGMENT);

    fs.mkdirSync(stageFeaturesRoot, { recursive: true });
    fs.cpSync(path.join(harnessRoot, 'steps'), path.join(stageFeaturesRoot, 'steps'), {
        recursive: true,
    });
    fs.copyFileSync(
        path.join(harnessRoot, 'environment.py'),
        path.join(stageFeaturesRoot, 'environment.py')
    );

    const sharedFixturesRoot = path.join(harnessRoot, 'fixtures');
    if (fs.existsSync(sharedFixturesRoot)) {
        fs.cpSync(sharedFixturesRoot, path.join(stageFeaturesRoot, BDD_ROOT_SEGMENT, 'fixtures'), {
            recursive: true,
        });
    }

    const copiedOverlaySupportRoots = new Set<string>();

    for (const featurePath of featurePaths) {
        if (featurePath.startsWith('..')) {
            throw new Error(`Refusing to stage feature outside repo root: ${featurePath}`);
        }

        const overlaySupportRoot = getOverlayBehaveSupportRoot(featurePath);
        if (overlaySupportRoot && !copiedOverlaySupportRoots.has(overlaySupportRoot)) {
            fs.cpSync(
                path.join(repoRoot, overlaySupportRoot),
                path.join(stageFeaturesRoot, overlaySupportRoot),
                {
                    recursive: true,
                }
            );
            copiedOverlaySupportRoots.add(overlaySupportRoot);
        }

        const sourcePath = path.join(repoRoot, featurePath);
        const destinationPath = path.join(stageFeaturesRoot, featurePath);
        fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
        fs.copyFileSync(sourcePath, destinationPath);
    }

    return {
        stageRoot,
        stageFeaturesRoot,
        cleanup: () => {
            fs.rmSync(stageRoot, { recursive: true, force: true });
        },
    };
}

export function rewriteBehaveOutput(
    output: string,
    stageFeaturesRoot: string,
    repoRoot: string
): string {
    const mappings = getBehaveOutputRewriteMappings(stageFeaturesRoot, repoRoot);

    return mappings.reduce(
        (rewritten, [fromPrefix, toPrefix]) => rewritten.split(fromPrefix).join(toPrefix),
        output
    );
}

export class BehaveOutputRewriter {
    private buffer = '';

    constructor(
        private readonly stageFeaturesRoot: string,
        private readonly repoRoot: string
    ) {}

    push(chunk: string): string {
        this.buffer += chunk;

        const lastNewlineIndex = Math.max(
            this.buffer.lastIndexOf('\n'),
            this.buffer.lastIndexOf('\r')
        );
        if (lastNewlineIndex === -1) {
            return '';
        }

        const completeOutput = this.buffer.slice(0, lastNewlineIndex + 1);
        this.buffer = this.buffer.slice(lastNewlineIndex + 1);
        return rewriteBehaveOutput(completeOutput, this.stageFeaturesRoot, this.repoRoot);
    }

    flush(): string {
        if (!this.buffer) {
            return '';
        }

        const remaining = rewriteBehaveOutput(this.buffer, this.stageFeaturesRoot, this.repoRoot);
        this.buffer = '';
        return remaining;
    }
}

function getBehaveOutputRewriteMappings(stageFeaturesRoot: string, repoRoot: string) {
    return [
        [withTrailingSeparator(stageFeaturesRoot), withTrailingSeparator(repoRoot)],
        [
            withTrailingSeparator(toPosixPath(stageFeaturesRoot)),
            withTrailingSeparator(toPosixPath(repoRoot)),
        ],
        [
            withTrailingSeparator(path.join('features', 'tests', 'behave', 'features')),
            withTrailingSeparator(path.join('tests', 'behave', 'features')),
        ],
        [
            withTrailingSeparator(path.join('features', 'overlays')),
            withTrailingSeparator('overlays'),
        ],
        ['features/tests/behave/features/', 'tests/behave/features/'],
        ['features/overlays/', 'overlays/'],
    ] as const;
}

function walkFeatureFiles(repoRoot: string, rootDir: string): string[] {
    if (!fs.existsSync(rootDir)) {
        return [];
    }

    const discovered: string[] = [];

    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
        const absolutePath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            discovered.push(...walkFeatureFiles(repoRoot, absolutePath));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith('.feature')) {
            discovered.push(path.relative(repoRoot, absolutePath));
        }
    }

    return discovered;
}

function getOverlayBehaveSupportRoot(featurePath: string): string | null {
    const normalizedPath = path.normalize(featurePath);
    const overlayMarker = `${path.join('overlays')}${path.sep}`;
    const behaveMarker = `${path.sep}${OVERLAY_BDD_SEGMENT}${path.sep}`;

    if (!normalizedPath.startsWith(overlayMarker) || !normalizedPath.includes(behaveMarker)) {
        return null;
    }

    return normalizedPath.slice(0, normalizedPath.indexOf(behaveMarker) + behaveMarker.length - 1);
}

function normalizeTarget(repoRoot: string, rawTarget: string): string {
    const candidatePath = path.isAbsolute(rawTarget)
        ? rawTarget
        : path.resolve(repoRoot, rawTarget.replace(/^[.][\\/]/, ''));
    const repoRelativePath = path.relative(repoRoot, candidatePath);

    if (repoRelativePath.startsWith('..') || path.isAbsolute(repoRelativePath)) {
        throw new Error(`Behave target must stay inside the repository: ${rawTarget}`);
    }

    return path.normalize(repoRelativePath);
}

function withTrailingSeparator(value: string): string {
    return value.endsWith(path.sep) ? value : `${value}${path.sep}`;
}

function toPosixPath(value: string): string {
    return value.split(path.sep).join('/');
}
