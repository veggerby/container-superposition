import { describe, expect, it } from 'vitest';
import { computeLineDiff, formatUnifiedDiff, generateUnifiedDiff } from '../commands/plan/diff.js';

describe('plan diff helpers', () => {
    it('computes equal, delete, and insert edits in order', () => {
        expect(computeLineDiff(['a', 'b', 'c'], ['a', 'c', 'd'])).toEqual([
            { type: 'equal', value: 'a' },
            { type: 'delete', value: 'b' },
            { type: 'equal', value: 'c' },
            { type: 'insert', value: 'd' },
        ]);
    });

    it('formats unified diffs with headers and hunks', () => {
        const diff = formatUnifiedDiff(
            [
                { type: 'equal', value: 'alpha' },
                { type: 'delete', value: 'beta' },
                { type: 'insert', value: 'bravo' },
                { type: 'equal', value: 'charlie' },
            ],
            'a/file.txt',
            'b/file.txt',
            1
        );

        expect(diff).toContain('--- a/file.txt');
        expect(diff).toContain('+++ b/file.txt');
        expect(diff).toContain('@@ -1,3 +1,3 @@');
        expect(diff).toContain('-beta');
        expect(diff).toContain('+bravo');
    });

    it('returns empty diff for identical content', () => {
        expect(generateUnifiedDiff('same\ncontent', 'same\ncontent', 'file.txt')).toBe('');
    });
});
