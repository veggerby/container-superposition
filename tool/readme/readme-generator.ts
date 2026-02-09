/**
 * README generation for consolidated devcontainer documentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { QuestionnaireAnswers, OverlayMetadata } from '../schema/types.js';
import {
    parseMarkdown,
    findSection,
    getFirstParagraph,
    type MarkdownSection,
} from './markdown-parser.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve REPO_ROOT that works in both source and compiled output
const REPO_ROOT_CANDIDATES = [
    path.join(__dirname, '..', '..'), // From source: tool/readme -> root
    path.join(__dirname, '..', '..', '..'), // From dist: dist/tool/readme -> root
];
const REPO_ROOT =
    REPO_ROOT_CANDIDATES.find(
        (candidate) =>
            fs.existsSync(path.join(candidate, 'templates')) &&
            fs.existsSync(path.join(candidate, 'overlays'))
    ) ?? REPO_ROOT_CANDIDATES[0];

const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');

interface OverlayDocs {
    id: string;
    name: string;
    description: string;
    sections: Map<string, string>;
}

/**
 * Sections to extract from overlay READMEs
 * These are matched against H2 (##) level headings
 */
const SECTIONS_TO_EXTRACT = [
    /^connection\s+information$/i,
    /^common\s+commands$/i,
    /^configuration$/i,
    /^troubleshooting$/i,
    /^use\s+cases$/i,
];

/**
 * Extract key information from a section in a concise, readable format
 * Focus on the most important details users need to get started
 */
function extractSectionSummary(section: MarkdownSection): string {
    const parts: string[] = [];

    // Combine content from section and subsections
    const allContent = [section.content, ...section.subsections.map(s => s.content)].join('\n');

    // For connection information, extract just the essentials
    if (section.title.toLowerCase().includes('connection')) {
        const connectionDetails: string[] = [];
        const lines = allContent.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            // Match connection details (handle both plain text and comments)
            if (trimmed.match(/^(#\s*)?(Hostname|Host|Port|Database|DB|User|Username|Password|URL|Connection):/i)) {
                const cleaned = trimmed.replace(/^#\s*/, '').replace('Connection string', 'Connection URL');
                connectionDetails.push(`- ${cleaned}`);
            }
            // Also match connection URLs
            else if (trimmed.match(/^(#\s*)?[a-z]+:\/\//)) {
                const cleaned = trimmed.replace(/^#\s*/, '');
                if (cleaned.length < 100) {  // Only include short URLs
                    connectionDetails.push(`- Connection URL: \`${cleaned}\``);
                }
            }
        }
        
        if (connectionDetails.length > 0) {
            // Take first 6 most important details
            parts.push(...connectionDetails.slice(0, 6));
        } else {
            parts.push('See full documentation for connection details');
        }
    }
    // For commands, list just the main categories
    else if (section.title.toLowerCase().includes('command')) {
        if (section.subsections.length > 0) {
            parts.push('Key command categories:');
            parts.push('');
            const categories = section.subsections.slice(0, 4).map(s => `- ${s.title}`);
            parts.push(...categories);
            
            if (section.subsections.length > 4) {
                parts.push(`- ...and ${section.subsections.length - 4} more`);
            }
        } else {
            parts.push('See full documentation for available commands');
        }
    }
    // For configuration, just mention it exists
    else if (section.title.toLowerCase().includes('config')) {
        parts.push('Configurable via environment variables and configuration files.');
        if (section.subsections.length > 0) {
            parts.push('');
            parts.push('Available settings:');
            section.subsections.slice(0, 3).forEach(s => {
                parts.push(`- ${s.title}`);
            });
        }
    }
    // For use cases, list them
    else if (section.title.toLowerCase().includes('use case')) {
        const useCases: string[] = [];
        for (const subsection of section.subsections.slice(0, 4)) {
            if (subsection.title) {
                useCases.push(`- **${subsection.title}**`);
                // Add brief description from subsection content if available
                if (subsection.content) {
                    const firstLine = subsection.content.split('\n').find(l => l.trim() && !l.trim().startsWith('-'));
                    if (firstLine && firstLine.length < 80) {
                        useCases.push(`  ${firstLine.trim()}`);
                    }
                }
            }
        }
        if (useCases.length > 0) {
            parts.push(...useCases);
        }
    }
    // For troubleshooting, list common issues
    else if (section.title.toLowerCase().includes('troubleshoot')) {
        const issues: string[] = [];
        for (const subsection of section.subsections.slice(0, 3)) {
            if (subsection.title) {
                issues.push(`- **${subsection.title}**`);
            }
        }
        if (issues.length > 0) {
            parts.push('Common issues:');
            parts.push(...issues);
            if (section.subsections.length > 3) {
                parts.push(`- ...and ${section.subsections.length - 3} more (see full docs)`);
            }
        }
    }
    // Default: just show first paragraph
    else {
        if (section.content && section.content.trim()) {
            const firstPara = getFirstParagraph(section.content);
            if (firstPara) {
                parts.push(firstPara);
            }
        }
    }

    return parts.join('\n');
}

/**
 * Load and parse overlay README file
 */
function loadOverlayDocs(overlayId: string, metadata: OverlayMetadata): OverlayDocs | null {
    const readmePath = path.join(OVERLAYS_DIR, overlayId, 'README.md');

    if (!fs.existsSync(readmePath)) {
        return null;
    }

    const content = fs.readFileSync(readmePath, 'utf-8');
    const sections = parseMarkdown(content);

    // Extract relevant sections with summaries
    const extractedSections = new Map<string, string>();
    for (const pattern of SECTIONS_TO_EXTRACT) {
        const section = findSection(sections, pattern);
        if (section) {
            // Use summary extraction to keep README concise
            extractedSections.set(section.title, extractSectionSummary(section));
        }
    }

    // Get description from metadata or first paragraph
    let description = metadata.description || '';
    if (!description && sections.length > 0) {
        description = getFirstParagraph(sections[0].content);
    }

    return {
        id: overlayId,
        name: metadata.name || overlayId,
        description,
        sections: extractedSections,
    };
}

/**
 * Generate header section of README
 */
function generateHeader(answers: QuestionnaireAnswers): string {
    const parts: string[] = [];

    const title = answers.containerName || 'Development Environment';
    parts.push(`# ${title}`);
    parts.push('');
    parts.push(`> Generated by Container Superposition on ${new Date().toISOString().split('T')[0]}`);

    let metadata = `> Template: ${answers.stack}`;
    if (answers.baseImage && answers.baseImage !== 'bookworm') {
        // When a custom base image is selected, surface the actual image value instead of "custom"
        if (answers.baseImage === 'custom' && answers.customImage) {
            metadata += ` | Base Image: ${answers.customImage}`;
        } else {
            metadata += ` | Base Image: ${answers.baseImage}`;
        }
    }
    if (answers.preset) {
        metadata += ` | Preset: ${answers.preset}`;
    }
    parts.push(metadata);
    parts.push('');

    return parts.join('\n');
}

/**
 * Generate quick start section
 */
function generateQuickStart(answers: QuestionnaireAnswers): string {
    const parts: string[] = [];

    parts.push('## Quick Start');
    parts.push('');

    if (answers.stack === 'compose') {
        parts.push('This development environment uses Docker Compose to orchestrate multiple services.');
        parts.push('');
        parts.push('**Starting the environment:**');
        parts.push('');
        parts.push('1. Open this folder in VS Code');
        parts.push('2. When prompted, click "Reopen in Container"');
        parts.push('3. Wait for the container to build and services to start');
        parts.push('4. Your development environment is ready!');
    } else {
        parts.push('This development environment uses a single container image.');
        parts.push('');
        parts.push('**Starting the environment:**');
        parts.push('');
        parts.push('1. Open this folder in VS Code');
        parts.push('2. When prompted, click "Reopen in Container"');
        parts.push('3. Wait for the container to build');
        parts.push('4. Your development environment is ready!');
    }

    parts.push('');
    return parts.join('\n');
}

/**
 * Compute relative path from output directory to repo root for documentation links.
 * If output is outside the repo, falls back to assuming standard .devcontainer location.
 */
function getRelativePathToRepo(outputPath: string): string {
    const normalizedOutput = path.normalize(outputPath);
    const normalizedRepo = path.normalize(REPO_ROOT);
    
    // Check if output path is inside the repository
    if (normalizedOutput.startsWith(normalizedRepo)) {
        // Compute proper relative path
        return path.posix.relative(
            path.posix.normalize(outputPath.replace(/\\/g, '/')),
            path.posix.normalize(REPO_ROOT.replace(/\\/g, '/'))
        );
    } else {
        // Output is outside repo - assume standard .devcontainer location for links
        // This is a reasonable fallback since overlays won't be accessible anyway
        return '..';
    }
}

/**
 * Generate services section with extracted overlay documentation
 */
function generateServices(
    overlayDocs: OverlayDocs[],
    overlayMetadata: Map<string, OverlayMetadata>,
    outputPath: string
): string {
    if (overlayDocs.length === 0) {
        return '';
    }

    // Compute relative path from output directory to repo root
    const relativeToRepo = getRelativePathToRepo(outputPath);

    const parts: string[] = [];
    parts.push('## Services and Tools');
    parts.push('');

    // Group overlays by category
    const categories: Record<string, OverlayDocs[]> = {};
    for (const docs of overlayDocs) {
        const metadata = overlayMetadata.get(docs.id);
        const category = metadata?.category || 'other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(docs);
    }

    // Define category order
    const categoryOrder = ['language', 'database', 'observability', 'cloud', 'dev', 'other'];
    const categoryTitles: Record<string, string> = {
        language: 'Languages and Frameworks',
        database: 'Databases and Storage',
        observability: 'Observability and Monitoring',
        cloud: 'Cloud and Infrastructure Tools',
        dev: 'Development Tools',
        other: 'Other Services',
    };

    for (const category of categoryOrder) {
        const categoryDocs = categories[category];
        if (!categoryDocs || categoryDocs.length === 0) {
            continue;
        }

        // Only show category header if there are multiple categories
        if (Object.keys(categories).length > 1) {
            parts.push(`### ${categoryTitles[category] || category}`);
            parts.push('');
        }

        for (const docs of categoryDocs) {
            // Service name and description
            parts.push(`#### ${docs.name}`);
            parts.push('');
            if (docs.description) {
                parts.push(docs.description);
                parts.push('');
            }

            // Extract and include relevant sections (excluding Troubleshooting to avoid duplication)
            for (const [sectionTitle, sectionContent] of docs.sections) {
                // Skip Troubleshooting section here since it's aggregated later
                if (sectionTitle.toLowerCase().includes('troubleshoot')) {
                    continue;
                }
                
                parts.push(`**${sectionTitle}**`);
                parts.push('');
                parts.push(sectionContent);
                parts.push('');
            }

            // Add link to full README using computed relative path
            const overlayReadmePath = path.posix.join(relativeToRepo, 'overlays', docs.id, 'README.md');
            parts.push(
                `*For complete documentation, see [${docs.name} overlay](${overlayReadmePath})*`
            );
            parts.push('');
        }
    }

    return parts.join('\n');
}

/**
 * Generate environment variables section (if .env.example exists)
 */
function generateEnvironmentVariables(outputPath: string): string {
    const envExamplePath = path.join(outputPath, '.env.example');

    if (!fs.existsSync(envExamplePath)) {
        return '';
    }

    const parts: string[] = [];
    parts.push('## Environment Variables');
    parts.push('');
    parts.push('This project uses environment variables for configuration. A template is provided:');
    parts.push('');
    parts.push('```bash');
    parts.push('cp .env.example .env');
    parts.push('```');
    parts.push('');
    parts.push('Then edit `.env` to customize for your environment.');
    parts.push('');
    parts.push('**Important:** The `.env` file is git-ignored and should not be committed.');
    parts.push('');

    return parts.join('\n');
}

/**
 * Generate troubleshooting section (aggregated from overlays)
 */
function generateTroubleshooting(overlayDocs: OverlayDocs[]): string {
    const troubleshootingDocs = overlayDocs
        .filter((docs) => docs.sections.has('Troubleshooting'))
        .map((docs) => ({ name: docs.name, content: docs.sections.get('Troubleshooting')! }));

    if (troubleshootingDocs.length === 0) {
        return '';
    }

    const parts: string[] = [];
    parts.push('## Troubleshooting');
    parts.push('');

    for (const { name, content } of troubleshootingDocs) {
        parts.push(`### ${name}`);
        parts.push('');
        parts.push(content);
        parts.push('');
    }

    return parts.join('\n');
}

/**
 * Generate references section
 */
function generateReferences(overlayIds: string[], outputPath: string): string {
    // Compute relative path from output directory to repo root
    const relativeToRepo = getRelativePathToRepo(outputPath);

    const parts: string[] = [];
    parts.push('## References');
    parts.push('');
    parts.push('**Overlay Documentation:**');
    parts.push('');

    for (const overlayId of overlayIds) {
        const overlayReadmePath = path.posix.join(relativeToRepo, 'overlays', overlayId, 'README.md');
        parts.push(`- [${overlayId}](${overlayReadmePath})`);
    }

    parts.push('');
    parts.push('**Project Documentation:**');
    parts.push('');
    const mainReadmePath = path.posix.join(relativeToRepo, 'README.md');
    const docsReadmePath = path.posix.join(relativeToRepo, 'docs', 'README.md');
    parts.push(`- [Container Superposition](${mainReadmePath})`);
    parts.push(`- [Documentation](${docsReadmePath})`);
    parts.push('');

    return parts.join('\n');
}

/**
 * Generate consolidated README.md from selected overlays
 */
export function generateReadme(
    answers: QuestionnaireAnswers,
    overlays: string[],
    overlayMetadata: Map<string, OverlayMetadata>,
    outputPath: string
): void {
    const parts: string[] = [];

    // 1. Header
    parts.push(generateHeader(answers));

    // 2. Quick Start
    parts.push(generateQuickStart(answers));

    // 3. Load overlay documentation
    const overlayDocs: OverlayDocs[] = [];
    for (const overlayId of overlays) {
        const metadata = overlayMetadata.get(overlayId);
        if (!metadata) {
            continue;
        }

        const docs = loadOverlayDocs(overlayId, metadata);
        if (docs && docs.sections.size > 0) {
            overlayDocs.push(docs);
        }
    }

    // 4. Services and Tools section
    if (overlayDocs.length > 0) {
        parts.push(generateServices(overlayDocs, overlayMetadata, outputPath));
    }

    // 5. Environment Variables section
    const envSection = generateEnvironmentVariables(outputPath);
    if (envSection) {
        parts.push(envSection);
    }

    // 6. Troubleshooting section (aggregated)
    const troubleshooting = generateTroubleshooting(overlayDocs);
    if (troubleshooting) {
        parts.push(troubleshooting);
    }

    // 7. References
    parts.push(generateReferences(overlays, outputPath));

    // Write README.md
    const readmePath = path.join(outputPath, 'README.md');
    const content = parts.join('\n').trim() + '\n';
    fs.writeFileSync(readmePath, content, 'utf-8');
}
