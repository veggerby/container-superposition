/**
 * Merge utilities for container-superposition
 *
 * This module implements the formal merge strategy specification for combining
 * devcontainer configurations, docker-compose files, and environment variables.
 *
 * See docs/merge-strategy.md for the complete specification.
 */

/**
 * Deep merge two objects with special handling for arrays and specific fields.
 *
 * Merge strategy:
 * - Objects: Recursively merged
 * - Arrays: Concatenated and deduplicated (union strategy)
 * - Primitives: Source overwrites target (last writer wins)
 * - Special cases: remoteEnv (PATH handling), features, etc.
 *
 * @param target - Base object to merge into
 * @param source - Object to merge from (takes precedence)
 * @returns Merged object
 *
 * @example
 * const base = { features: { "node:1": { version: "lts" } } };
 * const overlay = { features: { "node:1": { nodeGypDependencies: true } } };
 * const result = deepMerge(base, overlay);
 * // Result: { features: { "node:1": { version: "lts", nodeGypDependencies: true } } }
 */
export function deepMerge(target: any, source: any): any {
    const output = { ...target };

    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            if (Array.isArray(source[key])) {
                // For arrays, concatenate and deduplicate
                // Empty source arrays do not clear target arrays
                if (source[key].length === 0) {
                    output[key] = target[key];
                } else {
                    output[key] = Array.isArray(target[key])
                        ? [...new Set([...target[key], ...source[key]])]
                        : source[key];
                }
            } else if (key === 'remoteEnv') {
                // Special handling for remoteEnv to merge PATH variables intelligently
                output[key] = mergeRemoteEnv(target[key], source[key]);
            } else {
                // Recursively merge objects
                output[key] = deepMerge(target[key], source[key]);
            }
        } else {
            // Source value overwrites target (last writer wins)
            output[key] = source[key];
        }
    }

    return output;
}

/**
 * Split PATH string on colons, preserving ${...} variable references.
 *
 * Handles environment variable references like ${containerEnv:HOME} without
 * splitting them on the colon inside the braces.
 *
 * @param pathString - PATH value with colon-separated components
 * @returns Array of path components
 *
 * @example
 * splitPath("${containerEnv:HOME}/bin:${containerEnv:PATH}")
 * // Returns: ["${containerEnv:HOME}/bin", "${containerEnv:PATH}"]
 */
function splitPath(pathString: string): string[] {
    const paths: string[] = [];
    let current = '';
    let braceDepth = 0;

    for (let i = 0; i < pathString.length; i++) {
        const char = pathString[i];
        const nextChar = pathString[i + 1];

        if (char === '$' && nextChar === '{') {
            current += char;
            braceDepth++;
        } else if (char === '}' && braceDepth > 0) {
            current += char;
            braceDepth--;
        } else if (char === ':' && braceDepth === 0) {
            // Split here - we're not inside ${...}
            if (current) {
                paths.push(current);
            }
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last component
    if (current) {
        paths.push(current);
    }

    return paths;
}

/**
 * Merge remoteEnv objects with intelligent PATH handling.
 *
 * For PATH variables:
 * 1. Split on colons (preserving ${...} references)
 * 2. Remove ${containerEnv:PATH} placeholders
 * 3. Concatenate and deduplicate
 * 4. Append ${containerEnv:PATH} at end
 *
 * For other variables:
 * - Source overwrites target (last writer wins)
 *
 * @param target - Base environment variables
 * @param source - Overlay environment variables
 * @returns Merged environment variables
 *
 * @example
 * mergeRemoteEnv(
 *   { PATH: "/usr/local/bin:${containerEnv:PATH}", NODE_ENV: "development" },
 *   { PATH: "${containerEnv:HOME}/.local/bin:${containerEnv:PATH}", NODE_ENV: "production" }
 * )
 * // Returns:
 * // {
 * //   PATH: "/usr/local/bin:${containerEnv:HOME}/.local/bin:${containerEnv:PATH}",
 * //   NODE_ENV: "production"
 * // }
 */
export function mergeRemoteEnv(
    target: Record<string, string>,
    source: Record<string, string>
): Record<string, string> {
    const output = { ...target };

    for (const key in source) {
        if (key === 'PATH' && target[key]) {
            // Collect PATH components from both target and source using smart split
            const targetPaths = splitPath(target[key]).filter(
                (p) => p && p !== '${containerEnv:PATH}'
            );
            const sourcePaths = splitPath(source[key]).filter(
                (p) => p && p !== '${containerEnv:PATH}'
            );

            // Combine and deduplicate paths, preserving order
            const allPaths = [...new Set([...targetPaths, ...sourcePaths])];

            // Rebuild PATH with original ${containerEnv:PATH} at the end
            output[key] = [...allPaths, '${containerEnv:PATH}'].join(':');
        } else {
            // For non-PATH variables, source overwrites target
            output[key] = source[key];
        }
    }

    return output;
}

/**
 * Merge space-separated package lists with deduplication.
 *
 * Used for apt, apk, and other package manager lists.
 *
 * @param existing - Current package list (space-separated)
 * @param additional - Additional packages to merge (space-separated)
 * @returns Merged package list (space-separated, deduplicated)
 *
 * @example
 * mergePackages("curl wget", "wget jq")
 * // Returns: "curl wget jq"
 */
export function mergePackages(existing: string, additional: string): string {
    // Filter out empty tokens from split to avoid leading/trailing spaces
    const existingPackages = existing.split(' ').filter((p) => p);
    const newPackages = additional.split(' ').filter((p) => p);

    // Merge and deduplicate
    const merged = [...new Set([...existingPackages, ...newPackages])];

    return merged.join(' ');
}

/**
 * Filter depends_on to only include services that exist in the final composition.
 *
 * Supports both Docker Compose syntaxes:
 * - Array form: depends_on: [serviceA, serviceB]
 * - Object form: depends_on: { serviceA: { condition: ... } }
 *
 * @param dependsOn - Original depends_on configuration
 * @param existingServices - Set of service names that exist
 * @returns Filtered depends_on (undefined if empty after filtering)
 *
 * @example
 * filterDependsOn(
 *   ["postgres", "redis", "rabbitmq"],
 *   new Set(["postgres", "redis"])
 * )
 * // Returns: ["postgres", "redis"]
 */
export function filterDependsOn(dependsOn: unknown, existingServices: Set<string>): unknown {
    if (Array.isArray(dependsOn)) {
        const filtered = dependsOn.filter(
            (dep): dep is string => typeof dep === 'string' && existingServices.has(dep)
        );
        return filtered.length > 0 ? filtered : undefined;
    }

    if (dependsOn && typeof dependsOn === 'object') {
        const filtered = Object.fromEntries(
            Object.entries(dependsOn).filter(([dep]) => existingServices.has(dep))
        );
        return Object.keys(filtered).length > 0 ? filtered : undefined;
    }

    return dependsOn;
}

/**
 * Apply port offset to port string or number.
 *
 * @param port - Port value (string or number)
 * @param offset - Offset to apply
 * @returns Port with offset applied
 *
 * @example
 * applyPortOffset("5432:5432", 100)
 * // Returns: "5532:5432" (only host port offset)
 *
 * applyPortOffset(3000, 100)
 * // Returns: 3100
 */
export function applyPortOffset(port: string | number, offset: number): string | number {
    if (typeof port === 'number') {
        return port + offset;
    }

    // Handle string port mappings like "5432:5432" or "127.0.0.1:5432:5432"
    const parts = port.split(':');

    if (parts.length >= 2) {
        // Format: "host:container" or "ip:host:container"
        // Offset the host port (last or second-to-last number)
        const isThreePart = parts.length === 3;
        const hostPortIndex = isThreePart ? 1 : 0;

        const hostPort = parseInt(parts[hostPortIndex], 10);
        if (!isNaN(hostPort)) {
            parts[hostPortIndex] = String(hostPort + offset);
            return parts.join(':');
        }
    }

    // If we can't parse it, return as-is
    return port;
}

/**
 * Apply port offset to environment variable content.
 *
 * Finds variables matching *PORT*=number pattern and applies offset.
 *
 * @param envContent - Environment file content
 * @param offset - Port offset to apply
 * @returns Modified environment content
 *
 * @example
 * applyPortOffsetToEnv("POSTGRES_PORT=5432\nAPP_NAME=myapp", 100)
 * // Returns: "POSTGRES_PORT=5532\nAPP_NAME=myapp"
 */
export function applyPortOffsetToEnv(envContent: string, offset: number): string {
    const lines = envContent.split('\n');
    const portVarPattern = /^([A-Z_]*PORT[A-Z_]*)=(\d+)$/;

    const modifiedLines = lines.map((line) => {
        const match = line.match(portVarPattern);
        if (match) {
            const [, varName, portValue] = match;
            const newPort = parseInt(portValue, 10) + offset;
            return `${varName}=${newPort}`;
        }
        return line;
    });

    return modifiedLines.join('\n');
}

/**
 * Merge strategy metadata for documentation and testing.
 */
export const MERGE_STRATEGY = {
    version: '1.0.0',
    description: 'Formal merge strategy specification for container-superposition',
    rules: {
        objects: 'deep-merge',
        arrays: 'union-deduplicate',
        primitives: 'last-writer-wins',
        remoteEnv: 'intelligent-PATH-merging',
        packages: 'space-separated-union',
        dependsOn: 'filter-to-existing-services',
    },
} as const;
