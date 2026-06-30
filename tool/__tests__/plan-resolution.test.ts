import { describe, expect, it } from 'vitest';
import {
    detectConflicts,
    filterCompatibleOverlays,
    resolveDependencies,
} from '../commands/plan/resolution.js';

const overlaysConfig = {
    overlays: [
        { id: 'app', requires: ['db'], conflicts: [], supports: ['plain', 'compose'] },
        { id: 'db', requires: ['metrics'], conflicts: [], supports: ['compose'] },
        { id: 'metrics', requires: [], conflicts: [], supports: [] },
        { id: 'redis', requires: [], conflicts: ['memcached'], supports: [] },
        { id: 'memcached', requires: [], conflicts: ['redis'], supports: [] },
    ],
} as any;

describe('plan resolution helpers', () => {
    it('resolves direct, required, and transitive dependency explanations once', () => {
        const result = resolveDependencies(['app'], overlaysConfig, 'command-line');

        expect(result.resolved).toEqual(['app', 'db', 'metrics']);
        expect(result.autoAdded).toEqual(['db', 'metrics']);
        expect(result.explanations.get('app')?.reasons[0]?.kind).toBe('selected');
        expect(result.explanations.get('db')?.reasons[0]?.kind).toBe('required');
        expect(result.explanations.get('metrics')?.reasons[0]?.kind).toBe('transitive');
    });

    it('filters incompatible overlays without dropping universal overlays', () => {
        const result = filterCompatibleOverlays(['app', 'db', 'metrics'], overlaysConfig, 'plain');

        expect(result.compatible).toEqual(['app', 'metrics']);
        expect(result.incompatible).toEqual(['db']);
    });

    it('detects bidirectional conflicts among selected overlays', () => {
        expect(detectConflicts(['redis', 'memcached'], overlaysConfig)).toEqual([
            { overlay: 'redis', conflictsWith: ['memcached'] },
            { overlay: 'memcached', conflictsWith: ['redis'] },
        ]);
    });
});
