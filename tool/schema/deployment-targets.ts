/**
 * Deployment target configuration and compatibility checks
 * 
 * This module provides environment-specific optimizations and validates
 * overlay compatibility with different deployment targets (local, Codespaces, Gitpod, etc.)
 */

import type { DeploymentTarget, DevTool, PortAttributes } from './types.js';

/**
 * Environment-specific configuration and constraints
 */
interface TargetConfig {
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
 * Deployment target configurations
 */
export const DEPLOYMENT_TARGETS: Record<DeploymentTarget, TargetConfig> = {
    local: {
        id: 'local',
        name: 'Local Development',
        description: 'Running on local machine with Docker Desktop or Docker daemon',
        incompatibleOverlays: [],
        recommendations: {},
        portForwarding: {
            defaultBehavior: 'notify',
            autoForward: false,
        },
        constraints: {
            hasHostDocker: true,
            supportsPrivileged: true,
        },
    },
    
    codespaces: {
        id: 'codespaces',
        name: 'GitHub Codespaces',
        description: 'Cloud-based development environment on GitHub',
        incompatibleOverlays: ['docker-sock'],
        recommendations: {
            'docker-sock': ['docker-in-docker'],
        },
        portForwarding: {
            defaultBehavior: 'notify', // Codespaces shows port forwarding UI
            autoForward: true,
        },
        constraints: {
            hasHostDocker: false, // No host Docker in Codespaces
            supportsPrivileged: true, // Supports DinD
        },
    },
    
    gitpod: {
        id: 'gitpod',
        name: 'Gitpod',
        description: 'Cloud development environment on Gitpod',
        incompatibleOverlays: ['docker-sock'],
        recommendations: {
            'docker-sock': ['docker-in-docker'],
        },
        portForwarding: {
            defaultBehavior: 'openBrowser', // Gitpod auto-opens forwarded ports
            autoForward: true,
        },
        constraints: {
            hasHostDocker: false,
            supportsPrivileged: true,
        },
    },
    
    devpod: {
        id: 'devpod',
        name: 'DevPod',
        description: 'Client-only development environments',
        incompatibleOverlays: [],
        recommendations: {},
        portForwarding: {
            defaultBehavior: 'notify',
            autoForward: false,
        },
        constraints: {
            hasHostDocker: true, // DevPod can use host Docker
            supportsPrivileged: true,
        },
    },
};

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
export function getRecommendedAlternatives(
    overlayId: string,
    target: DeploymentTarget
): string[] {
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
