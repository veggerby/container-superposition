import * as fs from 'fs';

export function getExactGitignoreBlock(sectionName: string, patterns: string[]): string {
    const lines = patterns
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
    return `# BEGIN ${sectionName}\n${lines.join('\n')}\n# END ${sectionName}\n`;
}

export function upsertExactGitignoreBlock(
    gitignorePath: string,
    sectionName: string,
    patterns: string[]
): boolean {
    const block = getExactGitignoreBlock(sectionName, patterns);
    const existingContent = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, 'utf-8')
        : '';
    const blockPattern = new RegExp(
        `(?:^|\\n)# BEGIN ${escapeRegExp(sectionName)}\\n[\\s\\S]*?\\n# END ${escapeRegExp(sectionName)}\\n?`,
        'm'
    );
    if (blockPattern.test(existingContent)) {
        const replaced = existingContent.replace(blockPattern, (match) =>
            match.startsWith('\n') ? `\n${block}` : block
        );
        if (replaced !== existingContent) {
            fs.writeFileSync(gitignorePath, replaced.endsWith('\n') ? replaced : `${replaced}\n`);
            return true;
        }
        return false;
    }
    const prefix =
        existingContent.length === 0 ? '' : existingContent.endsWith('\n') ? '\n' : '\n\n';
    fs.writeFileSync(gitignorePath, `${existingContent}${prefix}${block}`);
    return true;
}

export function removeExactGitignoreBlock(gitignorePath: string, block: string): boolean {
    if (!fs.existsSync(gitignorePath)) return false;
    const existingContent = fs.readFileSync(gitignorePath, 'utf-8');
    const variants = [block, `\n${block}`];
    const variant = variants.find((entry) => existingContent.includes(entry));
    if (!variant) return false;
    fs.writeFileSync(
        gitignorePath,
        existingContent.replace(variant, '').replace(/\n{3,}/g, '\n\n')
    );
    return true;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
