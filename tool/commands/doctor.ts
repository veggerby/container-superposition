import { select } from '@inquirer/prompts';
import type { OverlaysConfig } from '../schema/types.js';
import {
    checkDependencies,
    checkEnvironment,
    checkEnvExampleDrift,
    checkGitTrackingSafety,
    checkManifest,
    checkMergeStrategy,
    checkOverlays,
    checkParameters,
    checkPortCrossValidation,
    checkPorts,
    checkProjectFileDrift,
    checkReproducibility,
    generateReport,
} from './doctor/checks.js';
import {
    buildDoctorActionBuckets,
    buildDoctorCounts,
    reportToFindings,
} from './doctor/findings.js';
import { buildRemediationPlan, executeFixRun } from './doctor/fixes.js';
import {
    buildDoctorJsonModel,
    formatFixRunText,
    renderDoctorReportModel,
} from './doctor/presentation.js';
import {
    describeDoctorScope,
    resolveDoctorContext,
    resolveDoctorOverlayIds,
} from './doctor/scope.js';
import type { DoctorOptions } from './doctor/types.js';

export { renderDoctorReportModel } from './doctor/presentation.js';

export async function doctorCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: DoctorOptions
): Promise<void> {
    const { workingDir, outputPath, explicitManifestPath, doctorMode } = resolveDoctorContext(
        overlaysConfig,
        options
    );

    const environmentChecks = checkEnvironment(outputPath, explicitManifestPath);
    const selectedOverlayIds = resolveDoctorOverlayIds(
        overlaysConfig,
        workingDir,
        outputPath,
        explicitManifestPath,
        Boolean(options.fromProject)
    );
    const overlayChecks = options.allOverlays
        ? checkOverlays(overlaysDir)
        : checkOverlays(overlaysDir, selectedOverlayIds);
    const doctorScope = describeDoctorScope({
        allOverlays: options.allOverlays,
        fromManifest: options.fromManifest,
        selectedOverlayIds,
    });
    const manifestChecks = checkManifest(outputPath, explicitManifestPath);
    const mergeChecks = checkMergeStrategy(outputPath);
    const manifestPath = explicitManifestPath ?? `${outputPath}/superposition.json`;
    const portChecks = checkPorts(overlaysConfig, manifestPath);
    const driftChecks = checkProjectFileDrift(overlaysConfig, workingDir, manifestPath);
    const parametersChecks = checkParameters(overlaysConfig, outputPath, workingDir);
    const dependenciesChecks = checkDependencies(overlaysConfig, workingDir);
    const portCrossValidationChecks = checkPortCrossValidation(outputPath);
    const envExampleDriftChecks = checkEnvExampleDrift(overlaysConfig, outputPath, workingDir);
    const reproducibilityChecks = await checkReproducibility(
        overlaysConfig,
        outputPath,
        overlaysDir,
        workingDir
    );
    const gitSafetyChecks = checkGitTrackingSafety(
        overlaysConfig,
        outputPath,
        workingDir,
        options.allOverlays ?? false
    );

    const report = generateReport(
        environmentChecks,
        overlayChecks,
        manifestChecks,
        mergeChecks,
        portChecks,
        driftChecks,
        parametersChecks,
        dependenciesChecks,
        portCrossValidationChecks,
        envExampleDriftChecks,
        reproducibilityChecks,
        gitSafetyChecks
    );
    const findings = reportToFindings(report);
    const plannedActions = buildRemediationPlan(findings);
    const actionBuckets = buildDoctorActionBuckets(findings);

    if (options.fix) {
        if (options.dryRun) {
            if (options.json) {
                console.log(
                    JSON.stringify(
                        {
                            ...buildDoctorJsonModel({
                                base: report,
                                findings,
                                mode: doctorMode,
                                scope: doctorScope,
                                fixPlan: plannedActions,
                                note: 'Project fix preview — No files changed',
                                previewOnly: true,
                                dryRun: true,
                                includeActionBuckets: true,
                            }),
                            plannedActions,
                        },
                        null,
                        2
                    )
                );
            } else {
                console.log(
                    renderDoctorReportModel({
                        mode: doctorMode,
                        outputPath,
                        findings,
                        fixPlan: plannedActions,
                        scope: doctorScope,
                    })
                );
                console.log('Project fix preview — No files changed');
            }

            process.exit(
                actionBuckets.safeAutoFixesAvailable.length > 0 ||
                    actionBuckets.manualFollowUp.length > 0
                    ? 1
                    : 0
            );
        }

        if (!options.json) {
            console.log(
                renderDoctorReportModel({
                    mode: doctorMode,
                    outputPath,
                    findings,
                    fixPlan: plannedActions,
                    scope: doctorScope,
                })
            );
        }

        if (plannedActions.length === 0) {
            if (options.json) {
                console.log(
                    JSON.stringify(
                        buildDoctorJsonModel({
                            base: report,
                            findings,
                            mode: doctorMode,
                            scope: doctorScope,
                            fixPlan: plannedActions,
                            note: 'Nothing safe to apply',
                            includeActionBuckets: true,
                        }),
                        null,
                        2
                    )
                );
            } else {
                console.log('Nothing safe to apply');
            }

            process.exit(actionBuckets.manualFollowUp.length > 0 ? 1 : 0);
        }

        if (!options.json && process.stdin.isTTY && process.stdout.isTTY) {
            const confirmation = (await select({
                message: 'Project fix preview — choose next action',
                choices: [
                    { name: 'Apply fixes', value: 'Apply fixes' },
                    { name: 'Cancel', value: 'Cancel' },
                ],
                default: 'Cancel',
            })) as string;
            if (confirmation !== 'Apply fixes') {
                console.log('Cancel');
                process.exit(0);
            }
        }

        const fixRun = await executeFixRun(
            report,
            outputPath,
            overlaysConfig,
            overlaysDir,
            options.json ?? false,
            explicitManifestPath,
            workingDir,
            options.allOverlays ?? false
        );

        if (options.json) {
            console.log(
                JSON.stringify(
                    buildDoctorJsonModel({
                        base: fixRun,
                        findings: fixRun.finalFindings,
                        mode: doctorMode,
                        scope: doctorScope,
                        fixPlan: plannedActions,
                    }),
                    null,
                    2
                )
            );
        } else {
            console.log(formatFixRunText(fixRun, doctorScope));
            console.log('');
        }

        process.exit(fixRun.exitDisposition === 'unresolved-failures' ? 1 : 0);
    }

    if (options.json) {
        console.log(
            JSON.stringify(
                buildDoctorJsonModel({
                    base: report,
                    findings,
                    mode: doctorMode,
                    scope: doctorScope,
                    includeActionBuckets: true,
                }),
                null,
                2
            )
        );
    } else {
        console.log(
            renderDoctorReportModel({
                mode: doctorMode,
                outputPath,
                findings,
                scope: doctorScope,
            })
        );
        console.log('');
    }

    process.exit(buildDoctorCounts(findings).blockingIssues > 0 ? 1 : 0);
}
