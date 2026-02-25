import * as fs from 'fs';

/**
 * Appends a named section of gitignore patterns to a .gitignore file.
 *
 * - Creates the file if it doesn't exist.
 * - Skips any pattern already present anywhere in the file (line-level dedup).
 * - Writes a labelled comment block: `# <sectionName>\n<patterns>\n`
 * - Safe to call multiple times — idempotent due to deduplication.
 *
 * @param gitignorePath Absolute path to the .gitignore file.
 * @param sectionName   Label used as the comment header, e.g. `"python (container-superposition)"`.
 * @param patterns      Array of gitignore patterns to add (comment lines and blanks are ignored).
 * @returns `true` if any new lines were written, `false` if all patterns already existed.
 */
export function appendGitignoreSection(
    gitignorePath: string,
    sectionName: string,
    patterns: string[]
): boolean {
    const existingContent = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, 'utf-8')
        : '';

    const existingPatterns = new Set(
        existingContent
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && !l.startsWith('#'))
    );

    // Only take non-comment, non-blank patterns that aren't already present
    const newLines = patterns
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#') && !existingPatterns.has(l));

    if (newLines.length === 0) return false;

    const block = `# ${sectionName}\n${newLines.join('\n')}\n`;

    if (existingContent.length > 0) {
        const ensuredTrailingNewline = existingContent.endsWith('\n')
            ? existingContent
            : existingContent + '\n';
        fs.writeFileSync(gitignorePath, ensuredTrailingNewline + '\n' + block);
    } else {
        fs.writeFileSync(gitignorePath, block);
    }

    return true;
}
