import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers, SuperpositionManifest } from '../schema/types.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..', '..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'test-manifest-regeneration');

describe('Manifest Regeneration', () => {
  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  it('should include containerName and outputPath in manifest', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'test-manifest-fields');
    
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
    
    // Verify manifest includes new fields
    const manifestPath = path.join(outputPath, 'superposition.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as SuperpositionManifest;
    expect(manifest.containerName).toBeDefined();
    expect(manifest.outputPath).toBe(outputPath);
    expect(manifest.overlays).toContain('nodejs');
  });

  it('should include portOffset in manifest when provided', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'test-port-offset');
    
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
      portOffset: 100,
    };
    
    await composeDevContainer(answers);
    
    const manifestPath = path.join(outputPath, 'superposition.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as SuperpositionManifest;
    
    expect(manifest.portOffset).toBe(100);
    expect(manifest.overlays).toContain('postgres');
  });

  it('should validate manifest structure', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'test-manifest-structure');
    
    const answers: QuestionnaireAnswers = {
      stack: 'plain',
      baseImage: 'alpine',
      language: ['python'],
      needsDocker: false,
      database: [],
      playwright: false,
      cloudTools: ['aws-cli'],
      devTools: [],
      observability: [],
      outputPath,
    };
    
    await composeDevContainer(answers);
    
    const manifestPath = path.join(outputPath, 'superposition.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as SuperpositionManifest;
    
    // Validate required fields
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.generated).toBeDefined();
    expect(new Date(manifest.generated).getTime()).toBeLessThanOrEqual(Date.now());
    expect(manifest.baseTemplate).toBe('plain');
    expect(manifest.baseImage).toBe('alpine');
    expect(Array.isArray(manifest.overlays)).toBe(true);
    expect(manifest.overlays).toContain('python');
    expect(manifest.overlays).toContain('aws-cli');
  });

  it('should handle preset information in manifest', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'test-preset-manifest');
    
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
      outputPath,
      preset: 'web-api',
      presetChoices: { language: 'nodejs' },
    };
    
    await composeDevContainer(answers);
    
    const manifestPath = path.join(outputPath, 'superposition.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as SuperpositionManifest;
    
    expect(manifest.preset).toBe('web-api');
    expect(manifest.presetChoices).toBeDefined();
    expect(manifest.presetChoices?.language).toBe('nodejs');
  });
});
