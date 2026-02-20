import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Preset Definitions', () => {
    const presetsDir = path.join(__dirname, '..', '..', 'overlays', '.presets');

    it('should have valid YAML files for all presets', () => {
        const presetFiles = [
            'web-api.yml',
            'microservice.yml',
            'docs-site.yml',
            'fullstack.yml',
            'event-sourced-service.yml',
            'frontend.yml',
            'data-engineering.yml',
            'k8s-operator-dev.yml',
        ];

        for (const file of presetFiles) {
            const filePath = path.join(presetsDir, file);
            expect(fs.existsSync(filePath), `Preset file ${file} should exist`).toBe(true);

            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = yaml.load(content) as any;

            // Verify required fields
            expect(parsed.id, `${file}: id should be defined`).toBeDefined();
            expect(parsed.name, `${file}: name should be defined`).toBeDefined();
            expect(parsed.type, `${file}: type should be 'meta'`).toBe('meta');
            expect(parsed.category, `${file}: category should be 'preset'`).toBe('preset');
            expect(parsed.selects, `${file}: selects should be defined`).toBeDefined();
            expect(
                parsed.selects.required,
                `${file}: selects.required should be an array`
            ).toBeInstanceOf(Array);
        }
    });

    it('web-api preset should have correct structure with parameters', () => {
        const filePath = path.join(presetsDir, 'web-api.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('web-api');

        // Language is still a userChoice
        expect(preset.selects.userChoice).toBeDefined();
        expect(preset.selects.userChoice.language).toBeDefined();
        expect(preset.selects.userChoice.language.options).toContain('nodejs');
        expect(preset.selects.userChoice.language.options).toContain('dotnet');

        // Database, cache, broker, observability are now parameters
        expect(preset.parameters).toBeDefined();
        expect(preset.parameters.database).toBeDefined();
        expect(preset.parameters.database.default).toBe('postgres');
        expect(preset.parameters.database.options.map((o: any) => o.id)).toContain('postgres');
        expect(preset.parameters.database.options.map((o: any) => o.id)).toContain('mongodb');
        expect(preset.parameters.database.options.map((o: any) => o.id)).toContain('none');

        expect(preset.parameters.cache).toBeDefined();
        expect(preset.parameters.cache.default).toBe('redis');
        expect(preset.parameters.cache.options.map((o: any) => o.id)).toContain('redis');
        expect(preset.parameters.cache.options.map((o: any) => o.id)).toContain('none');

        expect(preset.parameters.broker).toBeDefined();
        expect(preset.parameters.broker.default).toBe('none');
        expect(preset.parameters.broker.options.map((o: any) => o.id)).toContain('rabbitmq');
        expect(preset.parameters.broker.options.map((o: any) => o.id)).toContain('nats');
        expect(preset.parameters.broker.options.map((o: any) => o.id)).toContain('redpanda');

        expect(preset.parameters.observability).toBeDefined();
        expect(preset.parameters.observability.default).toBe('standard');
        expect(preset.parameters.observability.options.map((o: any) => o.id)).toContain('minimal');
        expect(preset.parameters.observability.options.map((o: any) => o.id)).toContain('standard');
        expect(preset.parameters.observability.options.map((o: any) => o.id)).toContain('full');

        expect(preset.glueConfig).toBeDefined();
        expect(preset.glueConfig.environment).toBeDefined();
        expect(preset.glueConfig.environment.DATABASE_URL).toBeDefined();
        expect(preset.glueConfig.environment.REDIS_URL).toBeDefined();
    });

    it('web-api preset parameters should have valid overlay references', () => {
        const filePath = path.join(presetsDir, 'web-api.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        // Each parameter option should have an overlays array
        for (const [paramName, param] of Object.entries(preset.parameters as Record<string, any>)) {
            expect(Array.isArray(param.options), `${paramName}: options should be an array`).toBe(
                true
            );
            for (const opt of param.options) {
                expect(opt.id, `${paramName} option should have id`).toBeDefined();
                expect(
                    Array.isArray(opt.overlays),
                    `${paramName}.${opt.id}: overlays should be an array`
                ).toBe(true);
            }
        }
    });

    it('microservice preset should have correct structure with parameters', () => {
        const filePath = path.join(presetsDir, 'microservice.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('microservice');
        expect(preset.selects.required).toContain('otel-collector');
        expect(preset.selects.required).toContain('jaeger');
        expect(preset.selects.required).toContain('prometheus');
        expect(preset.selects.required).toContain('grafana');

        expect(preset.selects.userChoice.language).toBeDefined();

        // broker is now a parameter
        expect(preset.parameters).toBeDefined();
        expect(preset.parameters.broker).toBeDefined();
        expect(preset.parameters.broker.options.map((o: any) => o.id)).toContain('rabbitmq');
        expect(preset.parameters.broker.options.map((o: any) => o.id)).toContain('redpanda');
        expect(preset.parameters.broker.options.map((o: any) => o.id)).toContain('nats');
        expect(preset.parameters.broker.options.map((o: any) => o.id)).toContain('none');

        expect(preset.parameters.observability).toBeDefined();
        expect(preset.parameters.observability.default).toBe('standard');
    });

    it('docs-site preset should have correct structure', () => {
        const filePath = path.join(presetsDir, 'docs-site.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('docs-site');
        expect(preset.selects.required).toContain('mkdocs');
        expect(preset.selects.required).toContain('pre-commit');
        expect(preset.selects.required).toContain('modern-cli-tools');
        expect(preset.supports).toEqual([]); // Works with both plain and compose
    });

    it('fullstack preset should have correct structure', () => {
        const filePath = path.join(presetsDir, 'fullstack.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('fullstack');
        expect(preset.selects.required).toContain('nodejs');
        expect(preset.selects.required).toContain('postgres');
        expect(preset.selects.required).toContain('redis');
        expect(preset.selects.required).toContain('minio');

        expect(preset.selects.userChoice.backend).toBeDefined();
        expect(preset.selects.userChoice.backend.options).toContain('dotnet');
        expect(preset.selects.userChoice.backend.options).toContain('python');
    });

    it('event-sourced-service preset should have correct structure', () => {
        const filePath = path.join(presetsDir, 'event-sourced-service.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('event-sourced-service');
        expect(preset.selects.required).toContain('minio');
        expect(preset.selects.required).toContain('otel-collector');
        expect(preset.selects.required).toContain('jaeger');
        expect(preset.selects.required).toContain('prometheus');
        expect(preset.selects.required).toContain('grafana');

        expect(preset.selects.userChoice.language).toBeDefined();
        expect(preset.selects.userChoice.language.options).toContain('nodejs');
        expect(preset.selects.userChoice.language.options).toContain('go');

        expect(preset.selects.userChoice.eventStore).toBeDefined();
        expect(preset.selects.userChoice.eventStore.options).toContain('postgres');
        expect(preset.selects.userChoice.eventStore.options).toContain('mongodb');

        expect(preset.selects.userChoice.messaging).toBeDefined();
        expect(preset.selects.userChoice.messaging.options).toContain('rabbitmq');
        expect(preset.selects.userChoice.messaging.options).toContain('redpanda');
        expect(preset.selects.userChoice.messaging.options).toContain('nats');

        expect(preset.glueConfig).toBeDefined();
        expect(preset.glueConfig.environment).toBeDefined();
        expect(preset.glueConfig.environment.MINIO_ENDPOINT).toBeDefined();
    });

    it('frontend preset should have correct structure', () => {
        const filePath = path.join(presetsDir, 'frontend.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('frontend');
        expect(preset.selects.required).toContain('playwright');
        expect(preset.selects.required).toContain('modern-cli-tools');
        expect(preset.supports).toEqual([]); // Works with both plain and compose

        expect(preset.selects.userChoice.language).toBeDefined();
        expect(preset.selects.userChoice.language.options).toContain('nodejs');
        expect(preset.selects.userChoice.language.options).toContain('bun');

        expect(preset.glueConfig).toBeDefined();
        expect(preset.glueConfig.environment).toBeDefined();
        expect(preset.glueConfig.environment.DEV_SERVER_PORT).toBeDefined();
    });

    it('data-engineering preset should have correct structure', () => {
        const filePath = path.join(presetsDir, 'data-engineering.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('data-engineering');
        expect(preset.selects.required).toContain('python');
        expect(preset.selects.required).toContain('minio');
        expect(preset.selects.required).toContain('modern-cli-tools');

        expect(preset.selects.userChoice.database).toBeDefined();
        expect(preset.selects.userChoice.database.options).toContain('postgres');
        expect(preset.selects.userChoice.database.options).toContain('mongodb');

        expect(preset.glueConfig).toBeDefined();
        expect(preset.glueConfig.environment).toBeDefined();
        expect(preset.glueConfig.environment.MINIO_ENDPOINT).toBeDefined();
        expect(preset.glueConfig.environment.DATABASE_URL).toBeDefined();
    });

    it('k8s-operator-dev preset should have correct structure', () => {
        const filePath = path.join(presetsDir, 'k8s-operator-dev.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('k8s-operator-dev');
        expect(preset.selects.required).toContain('go');
        expect(preset.selects.required).toContain('kubectl-helm');
        expect(preset.selects.required).toContain('modern-cli-tools');
        expect(preset.supports).toEqual([]); // Works with both plain and compose

        expect(preset.glueConfig).toBeDefined();
        expect(preset.glueConfig.environment).toBeDefined();
        expect(preset.glueConfig.environment.KUBECONFIG).toBeDefined();
    });

    describe('Parameter resolution logic', () => {
        it('web-api parameter options should resolve to overlay arrays', () => {
            const filePath = path.join(presetsDir, 'web-api.yml');
            const content = fs.readFileSync(filePath, 'utf-8');
            const preset = yaml.load(content) as any;

            // postgres option should include postgres overlay
            const postgresOption = preset.parameters.database.options.find(
                (o: any) => o.id === 'postgres'
            );
            expect(postgresOption).toBeDefined();
            expect(postgresOption.overlays).toContain('postgres');

            // none option should have empty overlays
            const noneDbOption = preset.parameters.database.options.find(
                (o: any) => o.id === 'none'
            );
            expect(noneDbOption).toBeDefined();
            expect(noneDbOption.overlays).toHaveLength(0);

            // standard observability should include prometheus and grafana
            const standardObs = preset.parameters.observability.options.find(
                (o: any) => o.id === 'standard'
            );
            expect(standardObs).toBeDefined();
            expect(standardObs.overlays).toContain('prometheus');
            expect(standardObs.overlays).toContain('grafana');

            // full observability should include more tools
            const fullObs = preset.parameters.observability.options.find(
                (o: any) => o.id === 'full'
            );
            expect(fullObs).toBeDefined();
            expect(fullObs.overlays.length).toBeGreaterThan(standardObs.overlays.length);
        });

        it('preset parameter defaults should be valid option ids', () => {
            const presetFiles = ['web-api.yml', 'microservice.yml'];
            for (const file of presetFiles) {
                const filePath = path.join(presetsDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const preset = yaml.load(content) as any;

                if (!preset.parameters) continue;

                for (const [paramName, param] of Object.entries(
                    preset.parameters as Record<string, any>
                )) {
                    const defaultId = param.default;
                    const optionIds = param.options.map((o: any) => o.id);
                    expect(
                        optionIds,
                        `${file}: parameter '${paramName}' default '${defaultId}' should be a valid option`
                    ).toContain(defaultId);
                }
            }
        });
    });
});
