import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Preset Definitions', () => {
    const presetsDir = path.join(__dirname, '..', '..', 'overlays', 'presets');

    it('should have valid YAML files for all presets', () => {
        const presetFiles = ['web-api.yml', 'microservice.yml', 'docs-site.yml', 'fullstack.yml'];

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

    it('web-api preset should have correct structure', () => {
        const filePath = path.join(presetsDir, 'web-api.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('web-api');
        expect(preset.selects.required).toContain('postgres');
        expect(preset.selects.required).toContain('redis');
        expect(preset.selects.required).toContain('otel-collector');
        expect(preset.selects.required).toContain('prometheus');
        expect(preset.selects.required).toContain('grafana');
        expect(preset.selects.required).toContain('loki');

        expect(preset.selects.userChoice).toBeDefined();
        expect(preset.selects.userChoice.language).toBeDefined();
        expect(preset.selects.userChoice.language.options).toContain('nodejs');
        expect(preset.selects.userChoice.language.options).toContain('dotnet');

        expect(preset.glueConfig).toBeDefined();
        expect(preset.glueConfig.environment).toBeDefined();
        expect(preset.glueConfig.environment.DATABASE_URL).toBeDefined();
        expect(preset.glueConfig.environment.REDIS_URL).toBeDefined();
    });

    it('microservice preset should have correct structure', () => {
        const filePath = path.join(presetsDir, 'microservice.yml');
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        expect(preset.id).toBe('microservice');
        expect(preset.selects.required).toContain('otel-collector');
        expect(preset.selects.required).toContain('jaeger');
        expect(preset.selects.required).toContain('prometheus');
        expect(preset.selects.required).toContain('grafana');

        expect(preset.selects.userChoice.language).toBeDefined();
        expect(preset.selects.userChoice.messaging).toBeDefined();
        expect(preset.selects.userChoice.messaging.options).toContain('rabbitmq');
        expect(preset.selects.userChoice.messaging.options).toContain('redpanda');
        expect(preset.selects.userChoice.messaging.options).toContain('nats');
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
});
