/**
 * Overlay parameter resolution and {{cs.PARAM_NAME}} substitution engine.
 *
 * Syntax: {{cs.PARAM_NAME}} — chosen because it:
 *  - does NOT collide with Docker Compose ${VAR} / ${VAR:-default}
 *  - does NOT collide with shell $VAR / ${VAR} / ${VAR:-x}
 *  - does NOT collide with VS Code ${localWorkspaceFolder} / ${env:VAR}
 *  - does NOT collide with GitHub Actions ${{ github.* }}
 *  - is consistent with the existing preset {{parameters.<key>.id}} convention
 *
 * This module deliberately has NO parser, NO AST, NO conditionals.
 * If string.replace() can't do it, it doesn't belong here.
 */

import type { OverlayMetadata, OverlayParameterDefinition } from '../schema/types.js';

/** Regex matching ALL {{cs.KEY}} tokens (used for substitution and validation). */
const CS_PARAM_REGEX = /\{\{cs\.([A-Z0-9_]+)\}\}/g;

/**
 * A parameter declaration enriched with the overlay that declared it.
 */
export interface DeclaredParameter extends OverlayParameterDefinition {
    overlayId: string;
}

/**
 * Result of parameter resolution.
 */
export interface ResolvedParameters {
    /** Key → resolved value map ready for substitution. */
    values: Record<string, string>;
    /** Parameters that are required but have no value — generation must fail. */
    missingRequired: string[];
    /** User-supplied parameter keys not declared by any selected overlay (warnings only). */
    unknownSupplied: string[];
}

/**
 * Collect all parameter declarations from the selected overlay set.
 * Returns a map of parameter name → declaration enriched with the declaring overlay.
 *
 * When two overlays declare the same parameter name, the first declaration wins
 * (overlays are processed in composition order).
 */
export function collectOverlayParameters(
    overlayIds: string[],
    allOverlayDefs: OverlayMetadata[]
): Record<string, DeclaredParameter> {
    const declared: Record<string, DeclaredParameter> = {};
    const overlayById = new Map(allOverlayDefs.map((o) => [o.id, o]));

    for (const id of overlayIds) {
        const overlay = overlayById.get(id);
        if (!overlay?.parameters) continue;

        for (const [key, def] of Object.entries(overlay.parameters)) {
            if (!(key in declared)) {
                declared[key] = { ...def, overlayId: id };
            }
        }
    }

    return declared;
}

/**
 * Resolve parameter values by applying the resolution order:
 *   1. Supplied values (from project file or CLI — highest priority)
 *   2. Overlay defaults (lowest priority)
 *
 * Returns resolved values, any missing-required errors, and unknown-supplied warnings.
 */
export function resolveParameters(
    declared: Record<string, DeclaredParameter>,
    supplied: Record<string, string>
): ResolvedParameters {
    const values: Record<string, string> = {};
    const missingRequired: string[] = [];

    // Resolve each declared parameter
    for (const [key, def] of Object.entries(declared)) {
        if (key in supplied) {
            values[key] = supplied[key];
        } else if (def.default !== undefined) {
            values[key] = def.default;
        } else {
            missingRequired.push(key);
        }
    }

    // Identify unknown supplied parameters (not declared by any overlay)
    const unknownSupplied = Object.keys(supplied).filter((key) => !(key in declared));

    return { values, missingRequired, unknownSupplied };
}

/**
 * Replace all {{cs.KEY}} tokens in `content` with the corresponding resolved value.
 * Tokens for keys not present in `resolved` are left intact (to be caught by validation).
 *
 * Docker Compose ${VAR}, shell $VAR, VS Code ${env:VAR}, and GitHub Actions ${{ }}
 * expressions are NEVER touched — only the {{cs.KEY}} pattern is matched.
 */
export function substituteParameters(content: string, resolved: Record<string, string>): string {
    return content.replace(CS_PARAM_REGEX, (match, key: string) => {
        return key in resolved ? resolved[key] : match;
    });
}

/**
 * Validate that no unresolved {{cs.*}} tokens remain in `content`.
 * Returns a list of unresolved token strings (empty = valid).
 */
export function findUnresolvedTokens(content: string): string[] {
    const found: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(CS_PARAM_REGEX.source, 'g');
    while ((match = regex.exec(content)) !== null) {
        found.push(match[0]);
    }
    return found;
}

/**
 * Redact sensitive parameter values for display (e.g. in plan output).
 * Non-sensitive values are returned as-is.
 */
export function redactSensitiveValues(
    values: Record<string, string>,
    declared: Record<string, DeclaredParameter>
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
        result[key] = declared[key]?.sensitive ? '***' : value;
    }
    return result;
}
