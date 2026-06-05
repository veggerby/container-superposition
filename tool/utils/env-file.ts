/**
 * Shared utility for parsing simple KEY=VALUE env files.
 * Used by both the composer and doctor commands.
 */

/**
 * Parse a simple KEY=VALUE env file.
 * Blank lines and lines starting with '#' are ignored.
 * Returns a map of key → raw value (no quoting or interpolation applied).
 */
export function parseSimpleEnvFile(content: string): Record<string, string> {
    const env: Record<string, string> = {};

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (!match) {
            continue;
        }

        env[match[1].trim()] = match[2].trim();
    }

    return env;
}
