/**
 * Deployment target configuration and compatibility checks
 *
 * This module provides environment-specific optimizations and validates
 * overlay compatibility with different deployment targets (local, Codespaces, Gitpod, etc.)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import type { DeploymentTarget, PortAttributes } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Environment-specific configuration and constraints
 */
export interface TargetConfig {
    id: DeploymentTarget;
    name: string;
    description: string;

    /**
     * Overlays that don't work in this environment
     */
    incompatibleOverlays: string[];

    /**
     * Recommended alternatives for incompatible overlays
     */
    recommendations: Record<string, string[]>;

    /**
     * Port forwarding behavior
     */
    portForwarding: {
        /**
         * Default onAutoForward behavior for this environment
         */
        defaultBehavior: PortAttributes['onAutoForward'];

        /**
         * Whether ports are automatically forwarded
         */
        autoForward: boolean;
    };

    /**
     * Resource constraints
     */
    constraints?: {
        /**
         * Whether host Docker daemon is available
         */
        hasHostDocker: boolean;

        /**
         * Whether environment supports privileged containers
         */
        supportsPrivileged: boolean;
    };
}

/**
 * Load deployment targets from YAML configuration
 */
function loadDeploymentTargets(): Record<DeploymentTarget, TargetConfig> {
    const candidates = [
        path.join(__dirname, '..', '..', 'overlays', '.registry', 'deployment-targets.yml'), // From tool/schema/
        path.join(__dirname, '..', '..', '..', 'overlays', '.registry', 'deployment-targets.yml'), // From dist/tool/schema/
    ];

    const yamlPath = candidates.find(fs.existsSync);
    if (!yamlPath) {
        throw new Error(
            `Could not find deployment-targets.yml. Searched:\n${candidates.join('\n')}`
        );
    }

    const content = fs.readFileSync(yamlPath, 'utf-8');
    const data = yaml.load(content) as { deployment_targets: TargetConfig[] };

    const targets: Record<string, TargetConfig> = {};
    for (const target of data.deployment_targets) {
        targets[target.id] = target;
    }

    return targets as Record<DeploymentTarget, TargetConfig>;
}

/**
 * Deployment target configurations (loaded from YAML)
 */
export const DEPLOYMENT_TARGETS: Record<DeploymentTarget, TargetConfig> = loadDeploymentTargets();

/**
 * Check if an overlay is compatible with a deployment target
 */
export function isOverlayCompatible(overlayId: string, target?: DeploymentTarget): boolean {
    if (!target || target === 'local') {
        return true; // Local supports everything
    }

    const targetConfig = DEPLOYMENT_TARGETS[target];
    return !targetConfig.incompatibleOverlays.includes(overlayId);
}

/**
 * Get recommended alternatives for an incompatible overlay
 */
export function getRecommendedAlternatives(overlayId: string, target: DeploymentTarget): string[] {
    const targetConfig = DEPLOYMENT_TARGETS[target];
    return targetConfig.recommendations[overlayId] || [];
}

/**
 * Get all incompatible overlays for a target
 */
export function getIncompatibleOverlays(
    selectedOverlays: string[],
    target?: DeploymentTarget
): Array<{ overlay: string; alternatives: string[] }> {
    if (!target || target === 'local') {
        return [];
    }

    const targetConfig = DEPLOYMENT_TARGETS[target];
    const incompatible: Array<{ overlay: string; alternatives: string[] }> = [];

    for (const overlayId of selectedOverlays) {
        if (!isOverlayCompatible(overlayId, target)) {
            incompatible.push({
                overlay: overlayId,
                alternatives: getRecommendedAlternatives(overlayId, target),
            });
        }
    }

    return incompatible;
}

/**
 * Get default port forwarding behavior for a target
 */
export function getDefaultPortBehavior(target?: DeploymentTarget): PortAttributes['onAutoForward'] {
    if (!target || target === 'local') {
        return 'notify';
    }

    return DEPLOYMENT_TARGETS[target].portForwarding.defaultBehavior;
}

/**
 * Check if target auto-forwards ports
 */
export function supportsAutoForward(target?: DeploymentTarget): boolean {
    if (!target || target === 'local') {
        return false;
    }

    return DEPLOYMENT_TARGETS[target].portForwarding.autoForward;
}
