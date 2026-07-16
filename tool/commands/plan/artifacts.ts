import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { DevContainer, OverlaysConfig, Stack } from '../../schema/types.js';
import { extractPorts } from '../../utils/port-utils.js';
import { applyOverlay } from '../../questionnaire/composer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPECTED_TEMPLATE_SUBPATH = path.join('compose', '.devcontainer', 'devcontainer.json');
const TEMPLATES_DIR_CANDIDATES = [
    path.join(__dirname, '..', '..', '..', 'templates'),
    path.join(__dirname, '..', '..', '..', '..', 'templates'),
];
const TEMPLATES_DIR =
    TEMPLATES_DIR_CANDIDATES.find((candidate) =>
        fs.existsSync(path.join(candidate, EXPECTED_TEMPLATE_SUBPATH))
    ) ?? TEMPLATES_DIR_CANDIDATES[0];

export function computePlannedDevcontainerJson(
    stack: Stack,
    overlayIds: string[],
    overlaysDir: string
): string | null {
    try {
        const basePath = path.join(TEMPLATES_DIR, stack, '.devcontainer', 'devcontainer.json');
        if (!fs.existsSync(basePath)) {
            return null;
        }

        let config: DevContainer = JSON.parse(fs.readFileSync(basePath, 'utf8'));

        for (const id of overlayIds) {
            config = applyOverlay(config, id, overlaysDir);
        }

        return JSON.stringify(config, null, 2);
    } catch {
        return null;
    }
}

export function getFilesToCreate(
    overlayIds: string[],
    overlaysDir: string,
    outputPath: string,
    composeEnvFiles: boolean = false,
    stack: Stack = 'compose',
    portOffset: number = 0
): string[] {
    const files: string[] = [];

    files.push(path.join(outputPath, 'devcontainer.json'));
    files.push(path.join(outputPath, 'superposition.json'));
    files.push(path.join(outputPath, 'README.md'));

    let hasEnvExample = false;
    for (const id of overlayIds) {
        const envPath = path.join(overlaysDir, id, '.env.example');
        if (fs.existsSync(envPath)) {
            hasEnvExample = true;
            break;
        }
    }
    if ((stack !== 'compose' || composeEnvFiles) && hasEnvExample) {
        files.push(path.join(outputPath, '.env.example'));
        if (stack === 'compose' ? composeEnvFiles : portOffset > 0) {
            files.push(path.join(outputPath, '.env'));
        }
    }

    for (const id of overlayIds) {
        const composePath = path.join(overlaysDir, id, 'docker-compose.yml');
        if (fs.existsSync(composePath)) {
            files.push(path.join(outputPath, 'docker-compose.yml'));
            break;
        }
    }

    for (const id of overlayIds) {
        const overlayDir = path.join(overlaysDir, id);
        if (!fs.existsSync(overlayDir)) {
            continue;
        }

        const overlayEntries = fs.readdirSync(overlayDir, { withFileTypes: true });
        for (const entry of overlayEntries) {
            const name = entry.name;

            if (entry.isFile() && name.startsWith('setup') && name.endsWith('.sh')) {
                files.push(path.join(outputPath, 'scripts', `setup-${id}.sh`));
            }
            if (entry.isFile() && name.startsWith('verify') && name.endsWith('.sh')) {
                files.push(path.join(outputPath, 'scripts', `verify-${id}.sh`));
            }

            if (name.startsWith('global-')) {
                if (entry.isFile()) {
                    const ext = path.extname(name);
                    const base = ext.length > 0 ? name.slice(0, -ext.length) : name;
                    files.push(path.join(outputPath, `${base}-${id}${ext}`));
                } else if (entry.isDirectory()) {
                    files.push(path.join(outputPath, `${name}-${id}`));
                }
            }
        }
    }

    return Array.from(new Set(files)).sort();
}

export function getPortMappings(
    overlayIds: string[],
    overlaysConfig: OverlaysConfig,
    portOffset: number
): Array<{ overlay: string; ports: number[]; offsetPorts: number[] }> {
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
    const mappings: Array<{ overlay: string; ports: number[]; offsetPorts: number[] }> = [];

    for (const id of overlayIds) {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.ports || overlay.ports.length === 0) {
            continue;
        }

        const ports = extractPorts([overlay]);
        mappings.push({
            overlay: id,
            ports,
            offsetPorts: ports.map((port) => port + portOffset),
        });
    }

    return mappings;
}
