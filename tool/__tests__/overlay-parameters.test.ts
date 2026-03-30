/**
 * Tests for overlay parameter resolution and {{cs.KEY}} substitution engine.
 */

import { describe, it, expect } from 'vitest';
import {
    collectOverlayParameters,
    resolveParameters,
    substituteParameters,
    findUnresolvedTokens,
    redactSensitiveValues,
} from '../utils/parameters.js';
import type { OverlayMetadata } from '../schema/types.js';

// Helper to build minimal overlay metadata
function makeOverlay(id: string, parameters?: OverlayMetadata['parameters']): OverlayMetadata {
    return {
        id,
        name: id,
        description: `${id} overlay`,
        category: 'database',
        supports: ['compose'],
        requires: [],
        suggests: [],
        conflicts: [],
        tags: [],
        ports: [],
        parameters,
    };
}

describe('collectOverlayParameters', () => {
    it('returns empty map when no overlays declare parameters', () => {
        const defs = [makeOverlay('redis'), makeOverlay('nodejs')];
        const result = collectOverlayParameters(['redis', 'nodejs'], defs);
        expect(result).toEqual({});
    });

    it('collects parameters from selected overlays only', () => {
        const defs = [
            makeOverlay('postgres', {
                POSTGRES_DB: { description: 'Database name', default: 'devdb' },
                POSTGRES_USER: { description: 'User', default: 'postgres' },
            }),
            makeOverlay('redis'),
            makeOverlay('nodejs', {
                NODE_ENV: { description: 'Node environment', default: 'development' },
            }),
        ];
        const result = collectOverlayParameters(['postgres', 'redis'], defs);
        expect(result).toHaveProperty('POSTGRES_DB');
        expect(result).toHaveProperty('POSTGRES_USER');
        expect(result).not.toHaveProperty('NODE_ENV');
    });

    it('first overlay wins when two overlays declare the same parameter', () => {
        const defs = [
            makeOverlay('a', { SHARED: { description: 'From A', default: 'a-default' } }),
            makeOverlay('b', { SHARED: { description: 'From B', default: 'b-default' } }),
        ];
        const result = collectOverlayParameters(['a', 'b'], defs);
        expect(result.SHARED?.default).toBe('a-default');
        expect(result.SHARED?.overlayId).toBe('a');
    });

    it('enriches declarations with the declaring overlayId', () => {
        const defs = [
            makeOverlay('postgres', {
                POSTGRES_DB: { description: 'Database name', default: 'devdb' },
            }),
        ];
        const result = collectOverlayParameters(['postgres'], defs);
        expect(result.POSTGRES_DB?.overlayId).toBe('postgres');
    });
});

describe('resolveParameters', () => {
    it('uses supplied values when provided', () => {
        const declared = {
            POSTGRES_DB: { description: 'DB', default: 'devdb', overlayId: 'postgres' },
        };
        const { values, missingRequired } = resolveParameters(declared, {
            POSTGRES_DB: 'myapp',
        });
        expect(values.POSTGRES_DB).toBe('myapp');
        expect(missingRequired).toHaveLength(0);
    });

    it('falls back to default when no supplied value', () => {
        const declared = {
            POSTGRES_DB: { description: 'DB', default: 'devdb', overlayId: 'postgres' },
        };
        const { values, missingRequired } = resolveParameters(declared, {});
        expect(values.POSTGRES_DB).toBe('devdb');
        expect(missingRequired).toHaveLength(0);
    });

    it('reports missing required parameters (no default, no supplied)', () => {
        const declared = {
            REQUIRED_KEY: { description: 'Required', overlayId: 'postgres' },
        };
        const { values, missingRequired } = resolveParameters(declared, {});
        expect(missingRequired).toContain('REQUIRED_KEY');
        expect(Object.keys(values)).not.toContain('REQUIRED_KEY');
    });

    it('supplied value overrides default', () => {
        const declared = {
            DB: { description: 'DB', default: 'default-db', overlayId: 'postgres' },
        };
        const { values } = resolveParameters(declared, { DB: 'override-db' });
        expect(values.DB).toBe('override-db');
    });

    it('reports unknown supplied parameters as warnings', () => {
        const declared = {
            KNOWN: { description: 'Known', default: 'val', overlayId: 'postgres' },
        };
        const { unknownSupplied } = resolveParameters(declared, {
            KNOWN: 'x',
            UNKNOWN_PARAM: 'y',
        });
        expect(unknownSupplied).toContain('UNKNOWN_PARAM');
        expect(unknownSupplied).not.toContain('KNOWN');
    });

    it('handles empty declared and supplied maps', () => {
        const { values, missingRequired, unknownSupplied } = resolveParameters({}, {});
        expect(values).toEqual({});
        expect(missingRequired).toHaveLength(0);
        expect(unknownSupplied).toHaveLength(0);
    });
});

describe('substituteParameters', () => {
    it('replaces {{cs.KEY}} tokens with resolved values', () => {
        const result = substituteParameters(
            'host=postgres db={{cs.POSTGRES_DB}} user={{cs.POSTGRES_USER}}',
            { POSTGRES_DB: 'myapp', POSTGRES_USER: 'alice' }
        );
        expect(result).toBe('host=postgres db=myapp user=alice');
    });

    it('leaves unresolved tokens intact when key not in resolved map', () => {
        const result = substituteParameters('value={{cs.MISSING}}', { OTHER: 'x' });
        expect(result).toBe('value={{cs.MISSING}}');
    });

    it('does NOT substitute Docker Compose ${VAR} expressions', () => {
        const input = 'image: postgres:${POSTGRES_VERSION:-16}-alpine';
        const result = substituteParameters(input, { POSTGRES_VERSION: '15' });
        expect(result).toBe(input); // unchanged
    });

    it('does NOT substitute Docker Compose ${VAR:-default} expressions', () => {
        const input = 'POSTGRES_DB: ${POSTGRES_DB:-devdb}';
        const result = substituteParameters(input, { POSTGRES_DB: 'myapp' });
        expect(result).toBe(input); // unchanged
    });

    it('does NOT substitute VS Code ${localWorkspaceFolder} expressions', () => {
        const input = '"workspaceFolder": "${localWorkspaceFolder}"';
        const result = substituteParameters(input, { localWorkspaceFolder: '/workspace' });
        expect(result).toBe(input); // unchanged
    });

    it('does NOT substitute GitHub Actions ${{ github.* }} expressions', () => {
        const input = 'run: echo ${{ github.sha }}';
        const result = substituteParameters(input, { 'github.sha': 'abc123' });
        expect(result).toBe(input); // unchanged
    });

    it('resolves {{cs.*}} nested inside Docker Compose default expressions', () => {
        // The issue recommends: ${POSTGRES_PORT:-{{cs.POSTGRES_PORT}}}
        // cs resolves the inner token; Docker handles the outer at runtime
        const input = "ports: '${POSTGRES_PORT:-{{cs.POSTGRES_PORT}}}:5432'";
        const result = substituteParameters(input, { POSTGRES_PORT: '5433' });
        expect(result).toBe("ports: '${POSTGRES_PORT:-5433}:5432'");
        // Docker Compose outer ${...} is left intact for runtime
    });

    it('handles multiple substitutions of the same key', () => {
        const result = substituteParameters('{{cs.DB}} and {{cs.DB}} again', { DB: 'mydb' });
        expect(result).toBe('mydb and mydb again');
    });

    it('returns content unchanged when resolved map is empty', () => {
        const input = 'no tokens here';
        expect(substituteParameters(input, {})).toBe(input);
    });
});

describe('findUnresolvedTokens', () => {
    it('returns empty array when no tokens present', () => {
        expect(findUnresolvedTokens('clean content')).toHaveLength(0);
    });

    it('returns empty array when all tokens are resolved', () => {
        // Already substituted, so no {{cs.*}} remain
        expect(findUnresolvedTokens('db=myapp user=alice')).toHaveLength(0);
    });

    it('finds remaining {{cs.*}} tokens', () => {
        const found = findUnresolvedTokens('db={{cs.POSTGRES_DB}} user={{cs.POSTGRES_USER}}');
        expect(found).toContain('{{cs.POSTGRES_DB}}');
        expect(found).toContain('{{cs.POSTGRES_USER}}');
    });

    it('does not flag Docker Compose ${VAR} as unresolved', () => {
        expect(findUnresolvedTokens('${POSTGRES_VERSION:-16}')).toHaveLength(0);
    });
});

describe('redactSensitiveValues', () => {
    it('redacts sensitive parameter values', () => {
        const values = { POSTGRES_PASSWORD: 'secret', POSTGRES_DB: 'myapp' };
        const declared = {
            POSTGRES_PASSWORD: {
                description: 'Password',
                sensitive: true,
                overlayId: 'postgres',
            },
            POSTGRES_DB: { description: 'DB', overlayId: 'postgres' },
        };
        const result = redactSensitiveValues(values, declared);
        expect(result.POSTGRES_PASSWORD).toBe('***');
        expect(result.POSTGRES_DB).toBe('myapp');
    });

    it('passes through non-sensitive values unchanged', () => {
        const values = { KEY: 'value' };
        const declared = {
            KEY: { description: 'Key', sensitive: false, overlayId: 'postgres' },
        };
        expect(redactSensitiveValues(values, declared).KEY).toBe('value');
    });
});
