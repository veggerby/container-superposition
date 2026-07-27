import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const SUPPORTED_TOP_LEVEL_FIELD = 'files';
const SUPPORTED_FILE_CONTENT_FIELDS = ['text', 'yaml', 'json'] as const;
const YAML_DUMP_OPTIONS: yaml.DumpOptions = {
    indent: 2,
    noRefs: true,
    lineWidth: -1,
    sortKeys: true,
};

type SupportedFileContentField = (typeof SUPPORTED_FILE_CONTENT_FIELDS)[number];

export interface InlineWorkspaceFixtureRequest {
    workspaceRoot: string;
    manifestText: string;
}

export interface InlineWorkspaceFixtureResult {
    ok: boolean;
    message?: string;
}

interface InlineWorkspaceFixtureManifest {
    files: Record<string, InlineWorkspaceFixtureFileEntry>;
}

type InlineWorkspaceFixtureFileEntry = { text: string } | { yaml: unknown } | { json: unknown };

export function runInlineWorkspaceFixture(
    request: InlineWorkspaceFixtureRequest
): InlineWorkspaceFixtureResult {
    try {
        materializeInlineWorkspaceFixture(request);
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
        };
    }
}

export function materializeInlineWorkspaceFixture({
    workspaceRoot,
    manifestText,
}: InlineWorkspaceFixtureRequest): void {
    const manifest = parseInlineWorkspaceFixtureManifest(manifestText);

    for (const [relativePath, entry] of Object.entries(manifest.files)) {
        const filePath = resolveWorkspaceFixturePath(workspaceRoot, relativePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(
            filePath,
            serializeInlineWorkspaceFixtureFile(relativePath, entry),
            'utf8'
        );
    }
}

export function parseInlineWorkspaceFixtureManifest(
    manifestText: string
): InlineWorkspaceFixtureManifest {
    if (!manifestText.trim()) {
        throw new Error('Inline workspace fixture manifest must not be empty.');
    }

    let parsed: unknown;
    try {
        parsed = yaml.load(manifestText);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Inline workspace fixture is not valid YAML: ${reason}`);
    }

    if (!isRecord(parsed)) {
        throw new Error(
            'Inline workspace fixture must be a YAML mapping with required top-level field "files".'
        );
    }

    const topLevelKeys = Object.keys(parsed);
    for (const key of topLevelKeys) {
        if (key !== SUPPORTED_TOP_LEVEL_FIELD) {
            throw new Error(
                `Inline workspace fixture field ${JSON.stringify(key)} is not supported; author project intent inside files.superposition.yml.yaml.`
            );
        }
    }

    if (!(SUPPORTED_TOP_LEVEL_FIELD in parsed)) {
        throw new Error('Inline workspace fixture is missing required top-level field "files".');
    }

    const { files } = parsed;
    if (!isRecord(files) || Object.keys(files).length === 0) {
        throw new Error(
            'Inline workspace fixture field "files" must be a non-empty mapping of workspace-relative file paths.'
        );
    }

    for (const [relativePath, entry] of Object.entries(files)) {
        validateInlineWorkspaceFixtureFileEntry(relativePath, entry);
    }

    return {
        files: files as Record<string, InlineWorkspaceFixtureFileEntry>,
    };
}

export function resolveWorkspaceFixturePath(workspaceRoot: string, relativePath: string): string {
    if (!relativePath.trim()) {
        throw new Error('Inline workspace fixture file path must not be empty.');
    }

    if (path.isAbsolute(relativePath)) {
        throw new Error(
            `Inline workspace fixture file path ${JSON.stringify(relativePath)} must be workspace-relative.`
        );
    }

    const segments = relativePath.split(/[\\/]+/);
    if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
        throw new Error(
            `Inline workspace fixture file path ${JSON.stringify(relativePath)} must not contain empty, ".", or ".." path segments.`
        );
    }

    const resolvedPath = path.resolve(workspaceRoot, relativePath);
    const workspaceRelativePath = path.relative(workspaceRoot, resolvedPath);
    if (
        workspaceRelativePath === '' ||
        workspaceRelativePath.startsWith(`..${path.sep}`) ||
        workspaceRelativePath === '..' ||
        path.isAbsolute(workspaceRelativePath)
    ) {
        throw new Error(
            `Inline workspace fixture file path ${JSON.stringify(relativePath)} escapes the temporary workspace.`
        );
    }

    return resolvedPath;
}

function validateInlineWorkspaceFixtureFileEntry(relativePath: string, entry: unknown): void {
    if (!isRecord(entry)) {
        throw new Error(
            `Inline workspace fixture file ${JSON.stringify(relativePath)} must declare exactly one of: ${SUPPORTED_FILE_CONTENT_FIELDS.join(', ')}.`
        );
    }

    const keys = Object.keys(entry);
    const supportedKeys = keys.filter((key): key is SupportedFileContentField =>
        SUPPORTED_FILE_CONTENT_FIELDS.includes(key as SupportedFileContentField)
    );

    if (keys.length !== 1 || supportedKeys.length !== 1) {
        throw new Error(
            `Inline workspace fixture file ${JSON.stringify(relativePath)} must declare exactly one of: ${SUPPORTED_FILE_CONTENT_FIELDS.join(', ')}.`
        );
    }

    const [contentField] = supportedKeys;
    if (contentField === 'text' && typeof entry.text !== 'string') {
        throw new Error(
            `Inline workspace fixture file ${JSON.stringify(relativePath)} field "text" must be a string.`
        );
    }
}

function serializeInlineWorkspaceFixtureFile(
    relativePath: string,
    entry: InlineWorkspaceFixtureFileEntry
): string {
    if ('text' in entry) {
        return entry.text;
    }

    if ('json' in entry) {
        return `${JSON.stringify(entry.json, null, 2)}\n`;
    }

    if ('yaml' in entry) {
        return yaml.dump(entry.yaml, YAML_DUMP_OPTIONS);
    }

    throw new Error(
        `Inline workspace fixture file ${JSON.stringify(relativePath)} must declare exactly one of: ${SUPPORTED_FILE_CONTENT_FIELDS.join(', ')}.`
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
