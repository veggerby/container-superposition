import { describe, it, expect } from 'vitest';
import type { QuestionnaireAnswers, DeploymentTarget } from '../schema/types.js';
import {
    getIncompatibleOverlays,
    isOverlayCompatible,
    getRecommendedAlternatives,
    DEPLOYMENT_TARGETS,
} from '../schema/deployment-targets.js';

describe('Deployment Target Support', () => {
    describe('Type System', () => {
        it('should include target field in QuestionnaireAnswers', () => {
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: ['nodejs'],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: ['docker-in-docker'],
                observability: [],
                outputPath: './.devcontainer',
                target: 'codespaces',
            };

            expect(answers.target).toBe('codespaces');
        });

        it('should handle optional target field', () => {
            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: './.devcontainer',
            };

            expect(answers.target).toBeUndefined();
        });
    });

    describe('Compatibility Checks', () => {
        it('should identify docker-sock as incompatible with Codespaces', () => {
            expect(isOverlayCompatible('docker-sock', 'codespaces')).toBe(false);
        });

        it('should identify docker-in-docker as compatible with Codespaces', () => {
            expect(isOverlayCompatible('docker-in-docker', 'codespaces')).toBe(true);
        });

        it('should identify all overlays as compatible with local', () => {
            expect(isOverlayCompatible('docker-sock', 'local')).toBe(true);
            expect(isOverlayCompatible('docker-in-docker', 'local')).toBe(true);
        });

        it('should identify docker-sock as incompatible with Gitpod', () => {
            expect(isOverlayCompatible('docker-sock', 'gitpod')).toBe(false);
        });
    });

    describe('Recommendations', () => {
        it('should recommend docker-in-docker as alternative to docker-sock for Codespaces', () => {
            const alternatives = getRecommendedAlternatives('docker-sock', 'codespaces');
            expect(alternatives).toContain('docker-in-docker');
        });

        it('should provide recommendations for Gitpod', () => {
            const alternatives = getRecommendedAlternatives('docker-sock', 'gitpod');
            expect(alternatives).toContain('docker-in-docker');
        });
    });

    describe('Incompatible Overlays Detection', () => {
        it('should detect docker-sock as incompatible for Codespaces', () => {
            const incompatible = getIncompatibleOverlays(
                ['nodejs', 'docker-sock', 'postgres'],
                'codespaces'
            );

            expect(incompatible).toHaveLength(1);
            expect(incompatible[0].overlay).toBe('docker-sock');
            expect(incompatible[0].alternatives).toContain('docker-in-docker');
        });

        it('should return empty array for local target', () => {
            const incompatible = getIncompatibleOverlays(
                ['nodejs', 'docker-sock', 'postgres'],
                'local'
            );

            expect(incompatible).toHaveLength(0);
        });

        it('should return empty array when no target specified', () => {
            const incompatible = getIncompatibleOverlays(['nodejs', 'docker-sock', 'postgres']);

            expect(incompatible).toHaveLength(0);
        });

        it('should handle multiple incompatible overlays', () => {
            // If we add more incompatibilities in the future
            const incompatible = getIncompatibleOverlays(['docker-sock'], 'codespaces');

            expect(incompatible.length).toBeGreaterThan(0);
        });
    });

    describe('Deployment Target Configurations', () => {
        it('should have valid configuration for all targets', () => {
            const targets: DeploymentTarget[] = ['local', 'codespaces', 'gitpod', 'devpod'];

            for (const target of targets) {
                const config = DEPLOYMENT_TARGETS[target];
                expect(config).toBeDefined();
                expect(config.id).toBe(target);
                expect(config.name).toBeTruthy();
                expect(config.description).toBeTruthy();
                expect(Array.isArray(config.incompatibleOverlays)).toBe(true);
            }
        });

        it('should have port forwarding configuration for all targets', () => {
            const targets: DeploymentTarget[] = ['local', 'codespaces', 'gitpod', 'devpod'];

            for (const target of targets) {
                const config = DEPLOYMENT_TARGETS[target];
                expect(config.portForwarding).toBeDefined();
                expect(config.portForwarding.defaultBehavior).toBeDefined();
                expect(typeof config.portForwarding.autoForward).toBe('boolean');
            }
        });
    });
});
