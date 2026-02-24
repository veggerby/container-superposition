/**
 * Tests for the shared gitignore utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { appendGitignoreSection } from '../utils/gitignore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'cs-gitignore-test-'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('appendGitignoreSection', () => {
    let dir: string;
    let gitignorePath: string;

    beforeEach(() => {
        dir = tmpDir();
        gitignorePath = path.join(dir, '.gitignore');
    });

    it('creates a new .gitignore when none exists', () => {
        const written = appendGitignoreSection(gitignorePath, 'python (container-superposition)', [
            '.venv/',
            '__pycache__/',
            '*.pyc',
        ]);

        expect(written).toBe(true);
        expect(fs.existsSync(gitignorePath)).toBe(true);

        const content = fs.readFileSync(gitignorePath, 'utf-8');
        expect(content).toContain('# python (container-superposition)');
        expect(content).toContain('.venv/');
        expect(content).toContain('__pycache__/');
        expect(content).toContain('*.pyc');
    });

    it('appends a section to an existing .gitignore', () => {
        fs.writeFileSync(gitignorePath, '# My project\nnode_modules/\ndist/\n');

        const written = appendGitignoreSection(gitignorePath, 'python (container-superposition)', [
            '.venv/',
            '__pycache__/',
        ]);

        expect(written).toBe(true);
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        // Preserve existing content
        expect(content).toContain('node_modules/');
        expect(content).toContain('dist/');
        // Append new section
        expect(content).toContain('# python (container-superposition)');
        expect(content).toContain('.venv/');
    });

    it('returns false and writes nothing when all patterns already exist', () => {
        fs.writeFileSync(gitignorePath, '.venv/\n__pycache__/\n*.pyc\n');

        const written = appendGitignoreSection(gitignorePath, 'python (container-superposition)', [
            '.venv/',
            '__pycache__/',
            '*.pyc',
        ]);

        expect(written).toBe(false);
        // File unchanged
        expect(fs.readFileSync(gitignorePath, 'utf-8')).toBe('.venv/\n__pycache__/\n*.pyc\n');
    });

    it('only appends patterns that are not already present (partial dedup)', () => {
        fs.writeFileSync(gitignorePath, '.venv/\n');

        const written = appendGitignoreSection(gitignorePath, 'python (container-superposition)', [
            '.venv/',
            '__pycache__/',
        ]);

        expect(written).toBe(true);
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        // .venv/ must not be duplicated
        expect(content.split('.venv/').length - 1).toBe(1);
        // __pycache__/ must be added
        expect(content).toContain('__pycache__/');
    });

    it('ignores comment lines in the patterns array', () => {
        const written = appendGitignoreSection(gitignorePath, 'python (container-superposition)', [
            '# This is a comment',
            '.venv/',
        ]);

        expect(written).toBe(true);
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        // The comment from the patterns array must NOT appear as a pattern
        expect(content.indexOf('# This is a comment')).toBe(-1);
        expect(content).toContain('.venv/');
    });

    it('is idempotent — second call with same patterns does nothing', () => {
        appendGitignoreSection(gitignorePath, 'direnv (container-superposition)', [
            '.envrc.local',
            '.env',
            '.env.local',
        ]);

        const contentAfterFirst = fs.readFileSync(gitignorePath, 'utf-8');

        const writtenSecond = appendGitignoreSection(
            gitignorePath,
            'direnv (container-superposition)',
            ['.envrc.local', '.env', '.env.local']
        );

        expect(writtenSecond).toBe(false);
        expect(fs.readFileSync(gitignorePath, 'utf-8')).toBe(contentAfterFirst);
    });

    it('preserves a trailing newline on the existing file', () => {
        fs.writeFileSync(gitignorePath, 'node_modules/\n');

        appendGitignoreSection(gitignorePath, 'test', ['.venv/']);

        const content = fs.readFileSync(gitignorePath, 'utf-8');
        expect(content.endsWith('\n')).toBe(true);
    });

    it('handles a file that does not end with a newline', () => {
        // No trailing newline
        fs.writeFileSync(gitignorePath, 'node_modules/');

        appendGitignoreSection(gitignorePath, 'test', ['.venv/']);

        const content = fs.readFileSync(gitignorePath, 'utf-8');
        // node_modules/ and .venv/ should both be present, well-separated
        expect(content).toContain('node_modules/');
        expect(content).toContain('.venv/');
        // Should not produce "node_modules/.venv/" on one line
        expect(content).not.toContain('node_modules/.venv/');
    });
});
