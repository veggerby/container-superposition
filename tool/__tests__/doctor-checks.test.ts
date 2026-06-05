/**
 * Tests for doctor check 2a, 2b (sensitive parameter exposure) and
 * check 3a-3d (first-class property promotion suggestions).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';

// We'll test checkCustomizations and related behaviour by exercising the
// exported doctor module indirectly through project-config + overlay loading.
// For isolated unit-level tests we replicate the internal logic used in
// checkParameters / checkCustomizations directly.

import type { ProjectConfigSelection, OverlayMetadata } from '../schema/types.js';
import { collectOverlayParameters } from '../utils/parameters.js';
import { parseSimpleEnvFile } from '../utils/env-file.js';

// ─── parseSimpleEnvFile unit tests ────────────────────────────────────────

describe('parseSimpleEnvFile', () => {
    it('parses KEY=VALUE lines', () => {
        const result = parseSimpleEnvFile('FOO=bar\nBAZ=qux\n');
        expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
    });

    it('ignores comment lines', () => {
        const result = parseSimpleEnvFile('# comment\nFOO=bar\n');
        expect(result).toEqual({ FOO: 'bar' });
    });

    it('ignores blank lines', () => {
        const result = parseSimpleEnvFile('\nFOO=bar\n\n');
        expect(result).toEqual({ FOO: 'bar' });
    });

    it('preserves ${VAR} values verbatim', () => {
        const result = parseSimpleEnvFile('PW=${POSTGRES_PASSWORD:-changeme}\n');
        expect(result).toEqual({ PW: '${POSTGRES_PASSWORD:-changeme}' });
    });
});

// ─── Sensitive parameter checks (2a logic) ────────────────────────────────

/**
 * Minimal overlay with a sensitive parameter.
 */
function makePostgresOverlay(): OverlayMetadata {
    return {
        id: 'postgres',
        name: 'PostgreSQL',
        description: 'PostgreSQL overlay',
        category: 'database',
        parameters: {
            POSTGRES_PASSWORD: {
                description: 'DB password',
                default: 'postgres',
                sensitive: true,
            },
            POSTGRES_USER: {
                description: 'DB user',
                default: 'postgres',
                sensitive: false,
            },
        },
    };
}

function runCheck2a(
    suppliedParams: Record<string, string>,
    overlays: OverlayMetadata[]
): Array<{ findingId?: string; message: string }> {
    const declared = collectOverlayParameters(
        overlays.map((o) => o.id),
        overlays
    );
    const results: Array<{ findingId?: string; message: string }> = [];
    const sensitiveHardcoded: string[] = [];
    for (const [key, value] of Object.entries(suppliedParams)) {
        if (!declared[key]?.sensitive) continue;
        if (value.startsWith('${')) continue;
        if (declared[key].default !== undefined && value === declared[key].default) continue;
        sensitiveHardcoded.push(key);
    }
    if (sensitiveHardcoded.length > 0) {
        results.push({
            findingId: 'sensitive-params-project-file',
            message: `Sensitive parameter(s) hardcoded: ${sensitiveHardcoded.join(', ')}`,
        });
    }
    return results;
}

describe('Doctor check 2a — sensitive params in project file', () => {
    it('warns when sensitive param has literal value', () => {
        const findings = runCheck2a({ POSTGRES_PASSWORD: 'mysecret' }, [makePostgresOverlay()]);
        expect(findings).toHaveLength(1);
        expect(findings[0].findingId).toBe('sensitive-params-project-file');
        expect(findings[0].message).toContain('POSTGRES_PASSWORD');
    });

    it('suppressed when value equals overlay default', () => {
        // 'postgres' is the overlay default
        const findings = runCheck2a({ POSTGRES_PASSWORD: 'postgres' }, [makePostgresOverlay()]);
        expect(findings).toHaveLength(0);
    });

    it('suppressed when value is a runtime expression (starts with ${)', () => {
        const findings = runCheck2a({ POSTGRES_PASSWORD: '${POSTGRES_PASSWORD:-changeme}' }, [
            makePostgresOverlay(),
        ]);
        expect(findings).toHaveLength(0);
    });

    it('does not warn for non-sensitive params', () => {
        const findings = runCheck2a({ POSTGRES_USER: 'admin' }, [makePostgresOverlay()]);
        expect(findings).toHaveLength(0);
    });
});

// ─── Sensitive parameter checks (2b logic) ────────────────────────────────

function runCheck2b(
    envFileContent: string,
    overlays: OverlayMetadata[]
): Array<{ findingId?: string; message: string }> {
    const declared = collectOverlayParameters(
        overlays.map((o) => o.id),
        overlays
    );
    const parsed = parseSimpleEnvFile(envFileContent);
    const results: Array<{ findingId?: string; message: string }> = [];
    const sensitive: string[] = [];
    for (const [key, value] of Object.entries(parsed)) {
        if (!declared[key]?.sensitive) continue;
        if (value.startsWith('${')) continue;
        if (declared[key].default !== undefined && value === declared[key].default) continue;
        sensitive.push(key);
    }
    if (sensitive.length > 0) {
        results.push({
            findingId: 'sensitive-params-devcontainer-env',
            message: `Sensitive parameter(s) in .devcontainer/.env: ${sensitive.join(', ')}`,
        });
    }
    return results;
}

describe('Doctor check 2b — sensitive params in .devcontainer/.env', () => {
    it('warns when sensitive param has plain-text value in .env', () => {
        const findings = runCheck2b('POSTGRES_PASSWORD=mysecret\n', [makePostgresOverlay()]);
        expect(findings).toHaveLength(1);
        expect(findings[0].findingId).toBe('sensitive-params-devcontainer-env');
    });

    it('suppressed when value equals overlay default', () => {
        const findings = runCheck2b('POSTGRES_PASSWORD=postgres\n', [makePostgresOverlay()]);
        expect(findings).toHaveLength(0);
    });

    it('suppressed when value is a ${VAR} reference', () => {
        const findings = runCheck2b('POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeme}\n', [
            makePostgresOverlay(),
        ]);
        expect(findings).toHaveLength(0);
    });

    it('no findings when file is empty', () => {
        const findings = runCheck2b('', [makePostgresOverlay()]);
        expect(findings).toHaveLength(0);
    });
});

// ─── Customization promotion checks (3a-3d logic) ─────────────────────────

function runCheckCustomizations(
    selection: Partial<ProjectConfigSelection>
): Array<{ findingId?: string }> {
    const cust = selection.customizations;
    if (!cust) return [];
    const results: Array<{ findingId?: string }> = [];

    const hasEnv = Object.keys(selection.env ?? {}).length > 0;
    const hasMounts = (selection.mounts ?? []).length > 0;
    const hasPorts = (selection.ports ?? []).length > 0;

    const patchRemoteEnvCount = Object.keys(cust.devcontainerPatch?.remoteEnv ?? {}).length;
    const composeEnvCount = Object.keys(
        (cust.dockerComposePatch as any)?.services?.devcontainer?.environment ?? {}
    ).length;
    if ((patchRemoteEnvCount > 0 || composeEnvCount > 0) && !hasEnv) {
        results.push({ findingId: 'customizations-env-promote' });
    }

    const patchMounts = cust.devcontainerPatch?.mounts;
    if (Array.isArray(patchMounts) && patchMounts.length > 0 && !hasMounts) {
        results.push({ findingId: 'customizations-mounts-promote' });
    }

    try {
        const composeServices = (cust.dockerComposePatch as any)?.services ?? {};
        const hasComposePorts = Object.values(composeServices).some(
            (svc: unknown) => Array.isArray((svc as any)?.ports) && (svc as any).ports.length > 0
        );
        if (hasComposePorts && !hasPorts) {
            results.push({ findingId: 'customizations-ports-promote' });
        }
    } catch {
        // skip
    }

    return results;
}

describe('Doctor check 3a — remoteEnv promotion', () => {
    it('warns when customizations.devcontainerPatch.remoteEnv set and env: absent', () => {
        const findings = runCheckCustomizations({
            customizations: { devcontainerPatch: { remoteEnv: { MY_VAR: 'foo' } } },
        });
        expect(findings.some((f) => f.findingId === 'customizations-env-promote')).toBe(true);
    });

    it('suppressed when env: has at least one key', () => {
        const findings = runCheckCustomizations({
            env: { MY_VAR: { value: 'foo' } },
            customizations: { devcontainerPatch: { remoteEnv: { OTHER: 'bar' } } },
        });
        expect(findings.some((f) => f.findingId === 'customizations-env-promote')).toBe(false);
    });

    it('no finding when customizations is absent', () => {
        const findings = runCheckCustomizations({ env: { A: { value: 'b' } } });
        expect(findings).toHaveLength(0);
    });
});

describe('Doctor check 3b — dockerComposePatch environment promotion', () => {
    it('warns when dockerComposePatch has devcontainer environment and env: absent', () => {
        const findings = runCheckCustomizations({
            customizations: {
                dockerComposePatch: {
                    services: { devcontainer: { environment: { MY_VAR: 'foo' } } },
                },
            },
        });
        expect(findings.some((f) => f.findingId === 'customizations-env-promote')).toBe(true);
    });
});

describe('Doctor check 3c — mounts promotion', () => {
    it('warns when customizations.devcontainerPatch.mounts set and mounts: absent', () => {
        const findings = runCheckCustomizations({
            customizations: {
                devcontainerPatch: { mounts: ['source=x,target=y,type=bind'] },
            },
        });
        expect(findings.some((f) => f.findingId === 'customizations-mounts-promote')).toBe(true);
    });

    it('suppressed when mounts: is non-empty', () => {
        const findings = runCheckCustomizations({
            mounts: [{ source: 'x', destination: 'y' }],
            customizations: {
                devcontainerPatch: { mounts: ['source=x,target=y,type=bind'] },
            },
        });
        expect(findings.some((f) => f.findingId === 'customizations-mounts-promote')).toBe(false);
    });
});

describe('Doctor check 3d — ports promotion', () => {
    it('warns when dockerComposePatch contains port bindings and ports: absent', () => {
        const findings = runCheckCustomizations({
            customizations: {
                dockerComposePatch: {
                    services: { app: { ports: ['8080:8080'] } },
                },
            },
        });
        expect(findings.some((f) => f.findingId === 'customizations-ports-promote')).toBe(true);
    });

    it('suppressed when ports: is non-empty', () => {
        const findings = runCheckCustomizations({
            ports: [{ value: '8080:8080' }],
            customizations: {
                dockerComposePatch: {
                    services: { app: { ports: ['8080:8080'] } },
                },
            },
        });
        expect(findings.some((f) => f.findingId === 'customizations-ports-promote')).toBe(false);
    });
});
