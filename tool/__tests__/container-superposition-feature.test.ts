import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featureDir = path.join(__dirname, '..', '..', 'features', 'container-superposition');
const metadata = JSON.parse(
    fs.readFileSync(path.join(featureDir, 'devcontainer-feature.json'), 'utf8')
) as Record<string, any>;
const installer = fs.readFileSync(path.join(featureDir, 'install.sh'), 'utf8');

describe('Container Superposition Dev Container Feature', () => {
    it('declares the official Node Feature dependency and a safe package-selection option', () => {
        expect(metadata.id).toBe('container-superposition');
        expect(metadata.dependsOn).toEqual({
            'ghcr.io/devcontainers/features/node:1': { version: 'lts' },
        });
        expect(metadata.options).toEqual({
            version: {
                type: 'string',
                default: 'latest',
                description:
                    'Exact container-superposition npm version or simple dist-tag to install',
            },
        });
    });

    it('validates package selection, installs the real package, and does not automate workspace lifecycle actions', () => {
        expect(installer).toContain('^\u005b0-9\u005d+\\.\u005b0-9\u005d+\\.\u005b0-9\u005d+');
        expect(installer).toContain(
            'npm install --global --no-audit --no-fund "container-superposition@${PACKAGE_SELECTION}"'
        );
        expect(installer).toContain('command -v cs');
        expect(installer).toContain('cs --version');
        expect(installer).not.toContain('cs regen');
        expect(installer).not.toContain('cs amend refresh');
        expect(() =>
            execFileSync('bash', ['-n', path.join(featureDir, 'install.sh')])
        ).not.toThrow();
    });
});
