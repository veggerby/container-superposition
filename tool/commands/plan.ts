import chalk from 'chalk';
import type { OverlaysConfig } from '../schema/types.js';
import { getFilesToCreate, getPortMappings } from './plan/artifacts.js';
import { generatePlanDiff } from './plan/diff.js';
import { resolvePlanInput } from './plan/input.js';
import { buildPlanPresentation, formatDiffAsText, formatPlanAsText } from './plan/presentation.js';
import {
    detectConflicts,
    filterCompatibleOverlays,
    resolveDependencies,
} from './plan/resolution.js';
import type { PlanOptions, PlanResult } from './plan/types.js';

export type { PlanDiffResult } from './plan/types.js';
export { generatePlanDiff } from './plan/diff.js';

export async function planCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: PlanOptions
) {
    try {
        const { stack, selectedOverlays, inputMode, selectionOrigin, portOffset, outputPath } =
            resolvePlanInput(options);

        const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
        for (const id of selectedOverlays) {
            if (!overlayMap.has(id)) {
                console.error(chalk.red(`✗ Unknown overlay: ${id}`));
                if (options.verbose && inputMode === 'overlay-list') {
                    console.log(
                        chalk.dim(
                            `  Dependency resolution did not start because "${id}" is not a known overlay.`
                        )
                    );
                }
                if (inputMode === 'manifest') {
                    console.error(
                        chalk.dim(
                            `  Manifest-driven planning cannot continue because "${id}" is not a known overlay.`
                        )
                    );
                }
                console.log(
                    chalk.dim('\n💡 Use "container-superposition list" to see available overlays\n')
                );
                process.exit(1);
            }
        }

        const { resolved, autoAdded, explanations } = resolveDependencies(
            selectedOverlays,
            overlaysConfig,
            selectionOrigin
        );
        const { compatible: compatibleResolved, incompatible } = filterCompatibleOverlays(
            resolved,
            overlaysConfig,
            stack
        );

        const issues: NonNullable<PlanResult['verbose']>['issues'] = [];
        for (const id of incompatible) {
            console.warn(
                chalk.yellow(
                    `⚠ Overlay "${id}" does not support stack "${stack}" and will be skipped.`
                )
            );
            const explanation = explanations.get(id);
            issues.push({
                kind: 'skipped',
                overlayId: id,
                message: `Overlay "${id}" was skipped because it does not support stack "${stack}".`,
                path: explanation?.reasons[0]?.path,
            });
        }

        const conflicts = detectConflicts(compatibleResolved, overlaysConfig);
        for (const conflict of conflicts) {
            const explanation = explanations.get(conflict.overlay);
            issues.push({
                kind: 'conflict',
                overlayId: conflict.overlay,
                relatedOverlayIds: conflict.conflictsWith,
                message: `Overlay "${conflict.overlay}" conflicts with ${conflict.conflictsWith.join(', ')}.`,
                path: explanation?.reasons[0]?.path,
            });
        }

        const portMappings = getPortMappings(compatibleResolved, overlaysConfig, portOffset);
        const files = getFilesToCreate(compatibleResolved, overlaysDir, outputPath);
        const includedOverlays = compatibleResolved.map((id) => {
            const explanation = explanations.get(id);
            return (
                explanation ?? {
                    id,
                    selectionKind: selectedOverlays.includes(id)
                        ? ('direct' as const)
                        : ('dependency' as const),
                    selectionSource: selectedOverlays.includes(id)
                        ? selectionOrigin
                        : ('dependency' as const),
                    reasons: [],
                }
            );
        });
        const compatibleAutoAdded = autoAdded.filter((id) => compatibleResolved.includes(id));

        const plan: PlanResult = {
            stack,
            selectedOverlays,
            autoAddedOverlays: compatibleAutoAdded,
            conflicts,
            portMappings,
            files,
            portOffset,
            inputMode,
            verbose: options.verbose
                ? {
                      inputMode,
                      includedOverlays,
                      summary: {
                          directSelections: selectedOverlays.length,
                          autoAdded: compatibleAutoAdded.length,
                          includedOverlays: compatibleResolved.length,
                          skippedOverlays: incompatible.length,
                          conflicts: conflicts.length,
                      },
                      issues,
                  }
                : undefined,
        };

        const diffResult = generatePlanDiff(
            plan,
            overlaysConfig,
            overlaysDir,
            outputPath,
            options.diffContext ?? 3
        );
        const presentation = buildPlanPresentation(plan, diffResult);

        if (options.diff) {
            if (options.diffFormat === 'json' || options.json) {
                console.log(JSON.stringify(presentation.normalizedPlan, null, 2));
                return;
            }

            const summary = formatPlanAsText({
                plan,
                headline: presentation.changeClass,
                nextStep: presentation.nextStep,
                currentSetup: presentation.currentSetup,
                plannedChanges: presentation.plannedChanges,
                watchOuts: presentation.watchOuts,
            });
            console.log(formatDiffAsText(diffResult, presentation.changeClass, summary));
            if (conflicts.length > 0) {
                process.exit(1);
            }
            return;
        }

        if (options.json) {
            console.log(JSON.stringify(presentation.normalizedPlan, null, 2));
            return;
        }

        console.log(
            '\n' +
                formatPlanAsText({
                    plan,
                    headline: presentation.changeClass,
                    nextStep: presentation.nextStep,
                    currentSetup: presentation.currentSetup,
                    plannedChanges: presentation.plannedChanges,
                    watchOuts: presentation.watchOuts,
                }) +
                '\n'
        );

        if (conflicts.length > 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error(chalk.red('✗ Error creating plan:'), error);
        process.exit(1);
    }
}
