/**
 * Markdown parsing utilities for extracting sections from overlay README files
 */

export interface MarkdownSection {
    title: string;
    level: number;
    content: string;
    subsections: MarkdownSection[];
}

/**
 * Parse markdown content into a tree of sections
 */
export function parseMarkdown(content: string): MarkdownSection[] {
    const lines = content.split('\n');
    const sections: MarkdownSection[] = [];
    const stack: MarkdownSection[] = [];

    let currentSection: MarkdownSection | null = null;
    let currentContent: string[] = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track code block state
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            currentContent.push(line);
            continue;
        }

        // Skip heading detection inside code blocks
        if (inCodeBlock) {
            currentContent.push(line);
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headingMatch) {
            // Save previous section's content
            if (currentSection) {
                currentSection.content = currentContent.join('\n').trim();
                currentContent = [];
            }

            const level = headingMatch[1].length;
            const title = headingMatch[2].trim();

            const newSection: MarkdownSection = {
                title,
                level,
                content: '',
                subsections: [],
            };

            // Find parent section
            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            if (stack.length === 0) {
                // Top-level section
                sections.push(newSection);
            } else {
                // Add as subsection to parent
                stack[stack.length - 1].subsections.push(newSection);
            }

            stack.push(newSection);
            currentSection = newSection;
        } else {
            // Accumulate content for current section
            currentContent.push(line);
        }
    }

    // Save the last section's content
    if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
    }

    return sections;
}

/**
 * Find a section by title (case-insensitive, partial match)
 */
export function findSection(
    sections: MarkdownSection[],
    titlePattern: string | RegExp
): MarkdownSection | null {
    const pattern = typeof titlePattern === 'string' ? new RegExp(titlePattern, 'i') : titlePattern;

    for (const section of sections) {
        if (pattern.test(section.title)) {
            return section;
        }

        // Recursively search subsections
        const found = findSection(section.subsections, titlePattern);
        if (found) {
            return found;
        }
    }

    return null;
}

/**
 * Extract section content including subsections as markdown
 */
export function extractSectionAsMarkdown(section: MarkdownSection, includeTitle = true): string {
    const parts: string[] = [];

    if (includeTitle) {
        parts.push(`${'#'.repeat(section.level)} ${section.title}`);
        parts.push('');
    }

    if (section.content) {
        parts.push(section.content);
    }

    // Add subsections
    for (const subsection of section.subsections) {
        if (parts.length > 0 && parts[parts.length - 1] !== '') {
            parts.push('');
        }
        parts.push(extractSectionAsMarkdown(subsection, true));
    }

    return parts.join('\n').trim();
}

/**
 * Extract multiple sections by title patterns
 */
export function extractSections(
    sections: MarkdownSection[],
    patterns: Array<string | RegExp>
): Map<string, string> {
    const extracted = new Map<string, string>();

    for (const pattern of patterns) {
        const section = findSection(sections, pattern);
        if (section) {
            const key = typeof pattern === 'string' ? pattern : section.title;
            extracted.set(key, extractSectionAsMarkdown(section, false));
        }
    }

    return extracted;
}

/**
 * Get first paragraph from markdown content (useful for summaries)
 */
export function getFirstParagraph(content: string): string {
    const lines = content.split('\n');
    const paragraph: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip headings, code blocks, empty lines at start
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```')) {
            if (paragraph.length > 0) {
                break; // End of first paragraph
            }
            continue;
        }

        paragraph.push(trimmed);
    }

    return paragraph.join(' ').trim();
}
