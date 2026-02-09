import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { composeDevContainer } from '../questionnaire/composer.js';
import { loadCustomPatches, hasCustomDirectory } from '../schema/custom-loader.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..', '..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'test-custom');

describe('Custom Patches', () => {
  beforeEach(() => {
    // Clean up test directory before each test
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  it('should detect when custom directory exists', async () => {
    const customDir = path.join(TEST_OUTPUT_DIR, 'custom');
    
    // Initially should not exist
    expect(hasCustomDirectory(TEST_OUTPUT_DIR)).toBe(false);
    
    // Create custom directory
    fs.mkdirSync(customDir);
    
    // Should now be detected
    expect(hasCustomDirectory(TEST_OUTPUT_DIR)).toBe(true);
  });

  it('should load custom devcontainer.patch.json', async () => {
    const customDir = path.join(TEST_OUTPUT_DIR, 'custom');
    fs.mkdirSync(customDir);
    
    const patch = {
      mounts: ['source=${localWorkspaceFolder}/../shared,target=/workspace/shared,type=bind'],
      remoteEnv: {
        CUSTOM_VAR: 'custom-value'
      }
    };
    
    fs.writeFileSync(
      path.join(customDir, 'devcontainer.patch.json'),
      JSON.stringify(patch, null, 2)
    );
    
    const customPatches = loadCustomPatches(TEST_OUTPUT_DIR);
    expect(customPatches).not.toBeNull();
    expect(customPatches?.devcontainerPatch?.mounts).toEqual(patch.mounts);
    expect(customPatches?.devcontainerPatch?.remoteEnv?.CUSTOM_VAR).toBe('custom-value');
  });

  it('should load custom docker-compose.patch.yml', async () => {
    const customDir = path.join(TEST_OUTPUT_DIR, 'custom');
    fs.mkdirSync(customDir);
    
    const patch = {
      services: {
        'custom-service': {
          image: 'myorg/custom:latest',
          networks: ['devnet']
        }
      }
    };
    
    fs.writeFileSync(
      path.join(customDir, 'docker-compose.patch.yml'),
      yaml.dump(patch)
    );
    
    const customPatches = loadCustomPatches(TEST_OUTPUT_DIR);
    expect(customPatches).not.toBeNull();
    expect(customPatches?.dockerComposePatch?.services?.['custom-service']).toBeDefined();
    expect(customPatches?.dockerComposePatch?.services?.['custom-service'].image).toBe('myorg/custom:latest');
  });

  it('should load custom environment.env file', async () => {
    const customDir = path.join(TEST_OUTPUT_DIR, 'custom');
    fs.mkdirSync(customDir);
    
    const envContent = `# Custom environment variables
MY_API_KEY=secret123
CUSTOM_SETTING=value
DATABASE_URL="postgresql://localhost:5432/mydb"
`;
    
    fs.writeFileSync(path.join(customDir, 'environment.env'), envContent);
    
    const customPatches = loadCustomPatches(TEST_OUTPUT_DIR);
    expect(customPatches).not.toBeNull();
    expect(customPatches?.environmentVars?.MY_API_KEY).toBe('secret123');
    expect(customPatches?.environmentVars?.CUSTOM_SETTING).toBe('value');
    // Quotes are now preserved
    expect(customPatches?.environmentVars?.DATABASE_URL).toBe('"postgresql://localhost:5432/mydb"');
  });

  it('should detect custom scripts', async () => {
    const customDir = path.join(TEST_OUTPUT_DIR, 'custom');
    const scriptsDir = path.join(customDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    
    fs.writeFileSync(path.join(scriptsDir, 'post-create.sh'), '#!/bin/bash\necho "Custom post-create"');
    fs.writeFileSync(path.join(scriptsDir, 'post-start.sh'), '#!/bin/bash\necho "Custom post-start"');
    
    const customPatches = loadCustomPatches(TEST_OUTPUT_DIR);
    expect(customPatches).not.toBeNull();
    expect(customPatches?.scripts?.postCreate).toHaveLength(1);
    expect(customPatches?.scripts?.postStart).toHaveLength(1);
    // Paths are now computed dynamically based on outputPath
    const outputDirName = path.basename(TEST_OUTPUT_DIR);
    expect(customPatches?.scripts?.postCreate?.[0]).toBe(`bash ${outputDirName}/custom/scripts/post-create.sh`);
    expect(customPatches?.scripts?.postStart?.[0]).toBe(`bash ${outputDirName}/custom/scripts/post-start.sh`);
  });

  it('should scan custom files directory', async () => {
    const customDir = path.join(TEST_OUTPUT_DIR, 'custom');
    const filesDir = path.join(customDir, 'files');
    fs.mkdirSync(filesDir, { recursive: true });
    
    fs.writeFileSync(path.join(filesDir, 'config.yml'), 'key: value');
    
    const nestedDir = path.join(filesDir, 'nested');
    fs.mkdirSync(nestedDir);
    fs.writeFileSync(path.join(nestedDir, 'script.sh'), '#!/bin/bash\necho test');
    
    const customPatches = loadCustomPatches(TEST_OUTPUT_DIR);
    expect(customPatches).not.toBeNull();
    expect(customPatches?.files).toHaveLength(2);
    
    const configFile = customPatches?.files?.find(f => f.destination === 'config.yml');
    expect(configFile).toBeDefined();
    
    const scriptFile = customPatches?.files?.find(f => f.destination.includes('nested'));
    expect(scriptFile).toBeDefined();
  });

  it('should apply custom devcontainer patches during composition', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'with-custom');
    
    // First, generate base devcontainer
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
    
    // Add custom patches
    const customDir = path.join(outputPath, 'custom');
    fs.mkdirSync(customDir);
    
    const patch = {
      mounts: ['source=${localWorkspaceFolder}/../shared,target=/workspace/shared,type=bind'],
      customizations: {
        vscode: {
          extensions: ['myorg.custom-extension']
        }
      }
    };
    
    fs.writeFileSync(
      path.join(customDir, 'devcontainer.patch.json'),
      JSON.stringify(patch, null, 2)
    );
    
    // Regenerate
    await composeDevContainer(answers);
    
    // Verify custom patches were applied
    const devcontainerPath = path.join(outputPath, 'devcontainer.json');
    const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
    
    expect(devcontainer.mounts).toContain('source=${localWorkspaceFolder}/../shared,target=/workspace/shared,type=bind');
    expect(devcontainer.customizations?.vscode?.extensions).toContain('myorg.custom-extension');
  });

  it('should apply custom docker-compose patches during composition', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'with-compose-custom');
    
    // Generate compose-based devcontainer
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
    };
    
    await composeDevContainer(answers);
    
    // Add custom docker-compose patch
    const customDir = path.join(outputPath, 'custom');
    fs.mkdirSync(customDir);
    
    const patch = {
      services: {
        redis: {
          image: 'redis:alpine',
          networks: ['devnet']
        }
      }
    };
    
    fs.writeFileSync(
      path.join(customDir, 'docker-compose.patch.yml'),
      yaml.dump(patch)
    );
    
    // Regenerate
    await composeDevContainer(answers);
    
    // Verify custom service was added
    const composePath = path.join(outputPath, 'docker-compose.yml');
    const compose = yaml.load(fs.readFileSync(composePath, 'utf-8')) as any;
    
    expect(compose.services.redis).toBeDefined();
    expect(compose.services.redis.image).toBe('redis:alpine');
  });

  it('should apply custom environment variables', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'with-env-custom');
    
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
    };
    
    await composeDevContainer(answers);
    
    // Add custom environment variables
    const customDir = path.join(outputPath, 'custom');
    fs.mkdirSync(customDir);
    
    fs.writeFileSync(
      path.join(customDir, 'environment.env'),
      'MY_CUSTOM_VAR=custom-value\n'
    );
    
    // Regenerate
    await composeDevContainer(answers);
    
    // Verify custom env vars were added
    const envPath = path.join(outputPath, '.env.example');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    expect(envContent).toContain('# Custom Environment Variables');
    expect(envContent).toContain('MY_CUSTOM_VAR=custom-value');
  });

  it('should track customizations in manifest', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'with-manifest');
    
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
    
    // Verify no customizations initially
    const manifestPath = path.join(outputPath, 'superposition.json');
    let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.customizations).toBeUndefined();
    
    // Add custom directory
    const customDir = path.join(outputPath, 'custom');
    fs.mkdirSync(customDir);
    fs.writeFileSync(
      path.join(customDir, 'devcontainer.patch.json'),
      JSON.stringify({ mounts: [] }, null, 2)
    );
    
    // Regenerate
    await composeDevContainer(answers);
    
    // Verify customizations are tracked with dynamic location
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.customizations).toBeDefined();
    expect(manifest.customizations.enabled).toBe(true);
    // Location is now computed from outputPath basename
    const outputDirName = path.basename(outputPath);
    expect(manifest.customizations.location).toBe(`${outputDirName}/custom`);
  });

  it('should preserve custom directory during regeneration', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'preserve-custom');
    
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
    
    // Initial generation
    await composeDevContainer(answers);
    
    // Add custom directory with files
    const customDir = path.join(outputPath, 'custom');
    fs.mkdirSync(customDir);
    
    const customContent = { mounts: ['test'] };
    fs.writeFileSync(
      path.join(customDir, 'devcontainer.patch.json'),
      JSON.stringify(customContent, null, 2)
    );
    
    // Regenerate (simulating adding a new overlay)
    answers.cloudTools = ['aws-cli'];
    await composeDevContainer(answers);
    
    // Verify custom directory still exists
    expect(fs.existsSync(customDir)).toBe(true);
    
    // Verify custom file content is preserved
    const preservedContent = JSON.parse(
      fs.readFileSync(path.join(customDir, 'devcontainer.patch.json'), 'utf-8')
    );
    expect(preservedContent).toEqual(customContent);
  });

  it('should add custom lifecycle scripts to devcontainer', async () => {
    const outputPath = path.join(TEST_OUTPUT_DIR, 'with-scripts');
    
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
    
    // Add custom scripts
    const customDir = path.join(outputPath, 'custom');
    const scriptsDir = path.join(customDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    
    fs.writeFileSync(path.join(scriptsDir, 'post-create.sh'), '#!/bin/bash\necho "Custom setup"');
    fs.writeFileSync(path.join(scriptsDir, 'post-start.sh'), '#!/bin/bash\necho "Custom start"');
    
    // Regenerate
    await composeDevContainer(answers);
    
    // Verify scripts are in devcontainer.json
    const devcontainerPath = path.join(outputPath, 'devcontainer.json');
    const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
    
    // Check postCreateCommand includes custom script
    expect(devcontainer.postCreateCommand).toBeDefined();
    const postCreateCommands = Object.values(devcontainer.postCreateCommand as Record<string, string>);
    expect(postCreateCommands.some((cmd: string) => cmd.includes('custom/scripts/post-create.sh'))).toBe(true);
    
    // Check postStartCommand includes custom script
    expect(devcontainer.postStartCommand).toBeDefined();
    const postStartCommands = Object.values(devcontainer.postStartCommand as Record<string, string>);
    expect(postStartCommands.some((cmd: string) => cmd.includes('custom/scripts/post-start.sh'))).toBe(true);
  });
});
