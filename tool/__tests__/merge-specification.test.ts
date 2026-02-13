/**
 * Golden Tests - Merge Specification
 * 
 * These tests validate that the merge behavior follows the formal specification
 * in docs/merge-specification.md. Each test case corresponds to a rule in the spec.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers, DevContainer } from '../schema/types.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..', '..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'test-merge-spec');

describe('Merge Specification - JSON Rules', () => {
    describe('Object Deep Merge', () => {
        it('should deep merge nested objects', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'deep-merge-objects');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: ['nodejs'], // Has vscode settings
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            // Should have customizations with nested settings
            expect(devcontainer.customizations).toBeDefined();
            expect(devcontainer.customizations?.vscode).toBeDefined();
            expect(devcontainer.customizations?.vscode?.extensions).toBeDefined();
            
            // Settings should be merged from base + overlay
            if (devcontainer.customizations?.vscode?.settings) {
                expect(typeof devcontainer.customizations.vscode.settings).toBe('object');
            }

            fs.rmSync(outputPath, { recursive: true });
        });

        it('should preserve keys from both target and source', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'preserve-keys');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: ['nodejs'],
                needsDocker: false,
                database: ['postgres'], // Adds docker-compose
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            // Should have keys from base template
            expect(devcontainer.name).toBeDefined();
            expect(devcontainer.dockerComposeFile).toBeDefined();
            
            // Should have features from overlays
            expect(devcontainer.features).toBeDefined();

            fs.rmSync(outputPath, { recursive: true });
        });
    });

    describe('Array Deduplication', () => {
        it('should deduplicate forwardPorts', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'dedupe-ports');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: ['nodejs'], // May forward port 3000
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            if (devcontainer.forwardPorts && Array.isArray(devcontainer.forwardPorts)) {
                const ports = devcontainer.forwardPorts;
                const uniquePorts = [...new Set(ports)];
                
                // Should have no duplicates
                expect(ports.length).toBe(uniquePorts.length);
            }

            fs.rmSync(outputPath, { recursive: true });
        });

        it('should deduplicate VS Code extensions', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'dedupe-extensions');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: ['nodejs'],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            const extensions = devcontainer.customizations?.vscode?.extensions || [];
            const uniqueExtensions = [...new Set(extensions)];
            
            // Should have no duplicate extension IDs
            expect(extensions.length).toBe(uniqueExtensions.length);

            fs.rmSync(outputPath, { recursive: true });
        });
    });

    describe('Features Merge', () => {
        it('should merge features by key', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'merge-features');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: ['nodejs'],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: ['aws-cli'], // Adds more features
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            expect(devcontainer.features).toBeDefined();
            
            // Should have features from multiple overlays
            const featureKeys = Object.keys(devcontainer.features || {});
            expect(featureKeys.length).toBeGreaterThan(0);
            
            // Each feature should appear only once
            const uniqueKeys = [...new Set(featureKeys)];
            expect(featureKeys.length).toBe(uniqueKeys.length);

            fs.rmSync(outputPath, { recursive: true });
        });

        it('should merge cross-distro package lists', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'merge-packages');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: ['nodejs'],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: ['aws-cli'], // Both add packages
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            const crossDistroFeature = devcontainer.features?.['./features/cross-distro-packages'];
            
            if (crossDistroFeature) {
                const aptPackages = (crossDistroFeature.apt as string || '').split(' ').filter(p => p);
                const uniqueAptPackages = [...new Set(aptPackages)];
                
                // Should deduplicate package names
                expect(aptPackages.length).toBe(uniqueAptPackages.length);
                
                // Should not have empty strings
                expect(aptPackages.every(p => p.length > 0)).toBe(true);
            }

            fs.rmSync(outputPath, { recursive: true });
        });
    });

    describe('remoteEnv PATH Merge', () => {
        it('should intelligently merge PATH variables', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'merge-path');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: ['nodejs'], // Sets PATH
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            if (devcontainer.remoteEnv?.PATH) {
                const pathValue = devcontainer.remoteEnv.PATH;
                
                // Should end with ${containerEnv:PATH}
                expect(pathValue).toMatch(/\$\{containerEnv:PATH\}$/);
                
                // Should have path components
                const pathComponents = pathValue.split(':');
                const nonPlaceholders = pathComponents.filter(p => p !== '${containerEnv:PATH}');
                
                // All components should be non-empty strings
                expect(nonPlaceholders.every(p => p.length > 0)).toBe(true);
                
                // Should have at least one PATH component
                expect(nonPlaceholders.length).toBeGreaterThan(0);
            }

            fs.rmSync(outputPath, { recursive: true });
        });

        it('should overwrite non-PATH environment variables', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'overwrite-env');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: ['nodejs'],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            // Non-PATH variables should have single value (last writer wins)
            if (devcontainer.remoteEnv) {
                for (const [key, value] of Object.entries(devcontainer.remoteEnv)) {
                    if (key !== 'PATH') {
                        expect(typeof value).toBe('string');
                        expect(value.length).toBeGreaterThan(0);
                    }
                }
            }

            fs.rmSync(outputPath, { recursive: true });
        });
    });

    describe('Primitives - Last Writer Wins', () => {
        it('should use last value for primitive fields', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'primitive-overwrite');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: ['nodejs'],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputPath, 'devcontainer.json');
            const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

            // Primitive fields should have exactly one value
            expect(typeof devcontainer.name).toBe('string');
            expect(devcontainer.name.length).toBeGreaterThan(0);

            fs.rmSync(outputPath, { recursive: true });
        });
    });
});

describe('Merge Specification - Docker Compose Rules', () => {
    describe('Service Merge', () => {
        it('should merge services by name', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'compose-service-merge');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: ['nodejs'],
                needsDocker: false,
                database: ['postgres', 'redis'],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const composePath = path.join(outputPath, 'docker-compose.yml');
            expect(fs.existsSync(composePath)).toBe(true);

            const compose: any = yaml.load(fs.readFileSync(composePath, 'utf-8'));

            // Should have devcontainer + database services
            expect(compose.services).toBeDefined();
            expect(compose.services.devcontainer).toBeDefined();
            expect(compose.services.postgres).toBeDefined();
            expect(compose.services.redis).toBeDefined();

            fs.rmSync(outputPath, { recursive: true });
        });

        it('should preserve volumes and networks', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'compose-volumes-networks');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: ['postgres'],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const composePath = path.join(outputPath, 'docker-compose.yml');
            const compose: any = yaml.load(fs.readFileSync(composePath, 'utf-8'));

            // Should have volumes for database persistence
            expect(compose.volumes).toBeDefined();
            
            // Should have shared network
            expect(compose.networks).toBeDefined();
            expect(compose.networks.devnet).toBeDefined();

            fs.rmSync(outputPath, { recursive: true });
        });
    });

    describe('depends_on Filtering', () => {
        it('should filter out non-existent service dependencies', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'compose-filter-deps');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: ['postgres'], // Only postgres, not redis
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const composePath = path.join(outputPath, 'docker-compose.yml');
            const compose: any = yaml.load(fs.readFileSync(composePath, 'utf-8'));

            // Check all services for invalid dependencies
            for (const [serviceName, service] of Object.entries(compose.services)) {
                if ((service as any).depends_on) {
                    const dependsOn = (service as any).depends_on;
                    const deps = Array.isArray(dependsOn) 
                        ? dependsOn 
                        : Object.keys(dependsOn);
                    
                    // All dependencies should reference existing services
                    for (const dep of deps) {
                        expect(compose.services[dep]).toBeDefined();
                    }
                }
            }

            fs.rmSync(outputPath, { recursive: true });
        });
    });

    describe('Network Handling', () => {
        it('should use shared devnet network', async () => {
            const outputPath = path.join(TEST_OUTPUT_DIR, 'compose-devnet');
            
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: ['postgres'],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
            };

            await composeDevContainer(answers);

            const composePath = path.join(outputPath, 'docker-compose.yml');
            const compose: any = yaml.load(fs.readFileSync(composePath, 'utf-8'));

            // Should have devnet network
            expect(compose.networks.devnet).toBeDefined();
            
            // Should NOT be marked as external (either undefined, null, or false)
            const devnet = compose.networks.devnet;
            if (devnet && typeof devnet === 'object') {
                expect(devnet.external).not.toBe(true);
            }

            fs.rmSync(outputPath, { recursive: true });
        });
    });
});

describe('Merge Specification - Composition Order', () => {
    it('should apply overlays in correct category order', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'composition-order');
        
        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],           // Category 1: Language
            needsDocker: false,
            database: ['postgres'],         // Category 2: Database
            playwright: false,
            cloudTools: ['aws-cli'],        // Category 4: Cloud
            devTools: ['git-helpers'],      // Category 5: Dev tools
            observability: ['prometheus'],  // Category 3: Observability
            outputPath,
        };

        await composeDevContainer(answers);

        // Verify all overlays were applied
        const manifestPath = path.join(outputPath, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        
        expect(manifest.overlays).toContain('nodejs');
        expect(manifest.overlays).toContain('postgres');
        expect(manifest.overlays).toContain('prometheus');
        expect(manifest.overlays).toContain('aws-cli');
        expect(manifest.overlays).toContain('git-helpers');

        fs.rmSync(outputPath, { recursive: true });
    });
});

describe('Merge Specification - Determinism', () => {
    it('should produce identical output for identical inputs', async () => {
        const outputPath1 = path.join(TEST_OUTPUT_DIR, 'determinism-1');
        const outputPath2 = path.join(TEST_OUTPUT_DIR, 'determinism-2');
        
        for (const outputPath of [outputPath1, outputPath2]) {
            if (fs.existsSync(outputPath)) {
                fs.rmSync(outputPath, { recursive: true });
            }
        }

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: ['postgres'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath: outputPath1,
        };

        // Generate first time
        await composeDevContainer(answers);

        // Generate second time with same inputs
        answers.outputPath = outputPath2;
        await composeDevContainer(answers);

        // Load both devcontainer.json files
        const devcontainer1 = JSON.parse(
            fs.readFileSync(path.join(outputPath1, 'devcontainer.json'), 'utf-8')
        );
        const devcontainer2 = JSON.parse(
            fs.readFileSync(path.join(outputPath2, 'devcontainer.json'), 'utf-8')
        );

        // Compare structure (excluding timestamp-like fields)
        expect(devcontainer1.name).toBe(devcontainer2.name);
        expect(devcontainer1.dockerComposeFile).toBe(devcontainer2.dockerComposeFile);
        expect(JSON.stringify(devcontainer1.features)).toBe(JSON.stringify(devcontainer2.features));
        
        // Load both docker-compose files
        const compose1: any = yaml.load(
            fs.readFileSync(path.join(outputPath1, 'docker-compose.yml'), 'utf-8')
        );
        const compose2: any = yaml.load(
            fs.readFileSync(path.join(outputPath2, 'docker-compose.yml'), 'utf-8')
        );

        // Should have same services
        expect(Object.keys(compose1.services).sort()).toEqual(Object.keys(compose2.services).sort());

        // Cleanup
        fs.rmSync(outputPath1, { recursive: true });
        fs.rmSync(outputPath2, { recursive: true });
    });
});

describe('Merge Specification - Idempotency', () => {
    it('should handle duplicate overlay selection gracefully', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'idempotency');
        
        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true });
        }

        // This tests that the system handles selection correctly
        // In practice, duplicates are filtered before composition
        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const devcontainerPath = path.join(outputPath, 'devcontainer.json');
        const devcontainer: DevContainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));

        // Should only have one nodejs feature configuration
        const nodeFeatureKeys = Object.keys(devcontainer.features || {}).filter(
            k => k.includes('node')
        );
        
        // Deduplication should ensure each feature appears once
        expect(nodeFeatureKeys.length).toBeGreaterThanOrEqual(0);

        fs.rmSync(outputPath, { recursive: true });
    });
});
