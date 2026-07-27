import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export type BddAssertionRequest =
    | {
          kind: 'document-value-equals';
          fileType: 'json' | 'yaml';
          workspaceRoot: string;
          relativePath: string;
          selector: string;
          expectedValueText: string;
      }
    | {
          kind: 'document-array-contains-item';
          fileType: 'json' | 'yaml';
          workspaceRoot: string;
          relativePath: string;
          selector: string;
          expectedValueText: string;
      }
    | {
          kind: 'command-json-value-equals';
          commandOutputText: string;
          selector: string;
          expectedValueText: string;
      }
    | {
          kind: 'command-json-array-contains-item';
          commandOutputText: string;
          selector: string;
          expectedValueText: string;
      }
    | {
          kind: 'compose-service-exists';
          workspaceRoot: string;
          relativePath: string;
          service: string;
      }
    | {
          kind: 'compose-service-environment-equals';
          workspaceRoot: string;
          relativePath: string;
          service: string;
          variable: string;
          expectedValue: string;
      }
    | {
          kind: 'compose-service-has-port';
          workspaceRoot: string;
          relativePath: string;
          service: string;
          port: string;
      }
    | {
          kind: 'compose-service-on-network';
          workspaceRoot: string;
          relativePath: string;
          service: string;
          network: string;
      }
    | {
          kind: 'compose-network-named';
          workspaceRoot: string;
          relativePath: string;
          network: string;
          expectedName: string;
      }
    | {
          kind: 'script-export-equals' | 'script-assignment-equals';
          workspaceRoot: string;
          relativePath: string;
          variable: string;
          expectedValue: string;
      }
    | {
          kind: 'script-path-includes-segment';
          workspaceRoot: string;
          relativePath: string;
          segment: string;
      }
    | {
          kind: 'script-path-segment-before' | 'script-path-segment-after';
          workspaceRoot: string;
          relativePath: string;
          segment: string;
          otherSegment: string;
      };

export interface BddAssertionResult {
    ok: boolean;
    message?: string;
}

interface ScriptAssignment {
    exported: boolean;
    value: string;
}

export function runBddAssertion(request: BddAssertionRequest): BddAssertionResult {
    try {
        switch (request.kind) {
            case 'document-value-equals': {
                const actualValue = getValueAtSelector(
                    loadDocument(request.fileType, request.workspaceRoot, request.relativePath),
                    request.selector
                );
                const expectedValue = parseStructuredValue(request.expectedValueText);
                assertDeepEqual({
                    expectationLabel: `${request.fileType.toUpperCase()} file ${request.relativePath} path ${request.selector}`,
                    assertionType: 'equal',
                    expectedValue,
                    actualValue,
                });
                return { ok: true };
            }
            case 'document-array-contains-item': {
                const actualValue = getValueAtSelector(
                    loadDocument(request.fileType, request.workspaceRoot, request.relativePath),
                    request.selector
                );
                if (!Array.isArray(actualValue)) {
                    throw new Error(
                        `${request.fileType.toUpperCase()} file ${request.relativePath} path ${request.selector} was not an array; actual was ${formatValue(actualValue)}`
                    );
                }
                const expectedValue = parseStructuredValue(request.expectedValueText);
                const containsItem = actualValue.some((item) => deepEqual(item, expectedValue));
                if (!containsItem) {
                    throw new Error(
                        `Expected ${request.fileType.toUpperCase()} file ${request.relativePath} path ${request.selector} to contain item ${formatValue(expectedValue)}; actual array was ${formatValue(actualValue)}`
                    );
                }
                return { ok: true };
            }
            case 'command-json-value-equals': {
                const actualValue = getValueAtSelector(
                    JSON.parse(request.commandOutputText),
                    request.selector
                );
                const expectedValue = parseStructuredValue(request.expectedValueText);
                assertDeepEqual({
                    expectationLabel: `command JSON path ${request.selector}`,
                    assertionType: 'equal',
                    expectedValue,
                    actualValue,
                });
                return { ok: true };
            }
            case 'command-json-array-contains-item': {
                const actualValue = getValueAtSelector(
                    JSON.parse(request.commandOutputText),
                    request.selector
                );
                if (!Array.isArray(actualValue)) {
                    throw new Error(
                        `Command JSON path ${request.selector} was not an array; actual was ${formatValue(actualValue)}`
                    );
                }
                const expectedValue = parseStructuredValue(request.expectedValueText);
                const containsItem = actualValue.some((item) => deepEqual(item, expectedValue));
                if (!containsItem) {
                    throw new Error(
                        `Expected command JSON path ${request.selector} to contain item ${formatValue(expectedValue)}; actual array was ${formatValue(actualValue)}`
                    );
                }
                return { ok: true };
            }
            case 'compose-service-exists': {
                const compose = loadDocument(
                    'yaml',
                    request.workspaceRoot,
                    request.relativePath
                ) as {
                    services?: Record<string, unknown>;
                };
                if (!compose?.services || !(request.service in compose.services)) {
                    throw new Error(
                        `Expected Compose file ${request.relativePath} to define service ${request.service}; actual services were ${formatValue(Object.keys(compose?.services ?? {}))}`
                    );
                }
                return { ok: true };
            }
            case 'compose-service-environment-equals': {
                const environment = getComposeServiceEnvironment(
                    request.workspaceRoot,
                    request.relativePath,
                    request.service
                );
                if (!(request.variable in environment)) {
                    throw new Error(
                        `Expected Compose file ${request.relativePath} service ${request.service} environment ${request.variable} to exist; actual environment was ${formatValue(environment)}`
                    );
                }
                const actualValue = environment[request.variable];
                if (actualValue !== request.expectedValue) {
                    throw new Error(
                        `Expected Compose file ${request.relativePath} service ${request.service} environment ${request.variable} to equal ${formatValue(request.expectedValue)}; actual was ${formatValue(actualValue)}`
                    );
                }
                return { ok: true };
            }
            case 'compose-service-has-port': {
                const ports = getComposeServiceField(
                    request.workspaceRoot,
                    request.relativePath,
                    request.service,
                    'ports'
                );
                if (!Array.isArray(ports)) {
                    throw new Error(
                        `Expected Compose file ${request.relativePath} service ${request.service} ports to be an array; actual was ${formatValue(ports)}`
                    );
                }
                const actualPorts = ports.map((entry) => String(entry));
                if (!actualPorts.includes(request.port)) {
                    throw new Error(
                        `Expected Compose file ${request.relativePath} service ${request.service} to have port ${formatValue(request.port)}; actual ports were ${formatValue(actualPorts)}`
                    );
                }
                return { ok: true };
            }
            case 'compose-service-on-network': {
                const networks = getComposeServiceField(
                    request.workspaceRoot,
                    request.relativePath,
                    request.service,
                    'networks'
                );
                const actualNetworks = normalizeComposeNetworks(networks);
                if (!actualNetworks.includes(request.network)) {
                    throw new Error(
                        `Expected Compose file ${request.relativePath} service ${request.service} to be on network ${request.network}; actual networks were ${formatValue(actualNetworks)}`
                    );
                }
                return { ok: true };
            }
            case 'compose-network-named': {
                const actualValue = getValueAtSelector(
                    loadDocument('yaml', request.workspaceRoot, request.relativePath),
                    `networks.${request.network}.name`
                );
                if (String(actualValue) !== request.expectedName) {
                    throw new Error(
                        `Expected Compose file ${request.relativePath} network ${request.network} to be named ${formatValue(request.expectedName)}; actual was ${formatValue(actualValue)}`
                    );
                }
                return { ok: true };
            }
            case 'script-export-equals':
            case 'script-assignment-equals': {
                const assignments = loadScriptAssignments(
                    request.workspaceRoot,
                    request.relativePath
                );
                const assignment = assignments[request.variable];
                const expectedExported = request.kind === 'script-export-equals';
                const assertionType = expectedExported ? 'export equal' : 'assignment equal';
                if (!assignment) {
                    throw new Error(
                        `Expected script ${request.relativePath} variable ${request.variable} ${assertionType} ${formatValue(request.expectedValue)}; actual was missing`
                    );
                }
                if (expectedExported && !assignment.exported) {
                    throw new Error(
                        `Expected script ${request.relativePath} variable ${request.variable} to be exported; actual assignment was ${formatValue(assignment.value)}`
                    );
                }
                if (assignment.value !== request.expectedValue) {
                    throw new Error(
                        `Expected script ${request.relativePath} variable ${request.variable} ${assertionType} ${formatValue(request.expectedValue)}; actual was ${formatValue(assignment.value)}`
                    );
                }
                return { ok: true };
            }
            case 'script-path-includes-segment': {
                const pathSegments = getScriptPathSegments(
                    request.workspaceRoot,
                    request.relativePath
                );
                if (!pathSegments.includes(request.segment)) {
                    throw new Error(
                        `Expected script ${request.relativePath} PATH to include segment ${formatValue(request.segment)}; actual order was ${formatValue(pathSegments)}`
                    );
                }
                return { ok: true };
            }
            case 'script-path-segment-before':
            case 'script-path-segment-after': {
                const pathSegments = getScriptPathSegments(
                    request.workspaceRoot,
                    request.relativePath
                );
                const leftIndex = pathSegments.indexOf(request.segment);
                const rightIndex = pathSegments.indexOf(request.otherSegment);
                const relation = request.kind === 'script-path-segment-before' ? 'before' : 'after';

                if (leftIndex === -1 || rightIndex === -1) {
                    throw new Error(
                        `Expected script ${request.relativePath} PATH to place segment ${formatValue(request.segment)} ${relation} ${formatValue(request.otherSegment)}; actual order was ${formatValue(pathSegments)}`
                    );
                }

                const passes =
                    request.kind === 'script-path-segment-before'
                        ? leftIndex < rightIndex
                        : leftIndex > rightIndex;

                if (!passes) {
                    throw new Error(
                        `Expected script ${request.relativePath} PATH to place segment ${formatValue(request.segment)} ${relation} ${formatValue(request.otherSegment)}; actual order was ${formatValue(pathSegments)}`
                    );
                }
                return { ok: true };
            }
        }
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
        };
    }
}

export function parseSelector(selector: string): Array<string | number> {
    if (!selector.trim()) {
        throw new Error('Selector must not be empty');
    }

    const tokens: Array<string | number> = [];

    for (const segment of selector.split('.')) {
        if (!segment) {
            throw new Error(`Invalid selector ${selector}`);
        }

        const segmentPattern = /([^\[\]]+)|(\[(\d+)\])/g;
        const parts = [...segment.matchAll(segmentPattern)];

        if (parts.length === 0 || parts.map((part) => part[0]).join('') !== segment) {
            throw new Error(`Invalid selector ${selector}`);
        }

        for (const part of parts) {
            if (part[1] !== undefined) {
                tokens.push(part[1]);
                continue;
            }
            tokens.push(Number(part[3]));
        }
    }

    return tokens;
}

export function getValueAtSelector(document: unknown, selector: string): unknown {
    let current = document;

    for (const token of parseSelector(selector)) {
        if (typeof token === 'number') {
            if (!Array.isArray(current) || token >= current.length) {
                throw new Error(
                    `Missing selector ${selector}; actual parent value was ${formatValue(current)}`
                );
            }
            current = current[token];
            continue;
        }

        if (!isRecord(current) || !(token in current)) {
            throw new Error(
                `Missing selector ${selector}; actual parent value was ${formatValue(current)}`
            );
        }

        current = current[token];
    }

    return current;
}

export function parseStructuredValue(text: string): unknown {
    return yaml.load(text);
}

export function loadScriptAssignments(
    workspaceRoot: string,
    relativePath: string
): Record<string, ScriptAssignment> {
    const filePath = path.join(workspaceRoot, relativePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const assignments: Record<string, ScriptAssignment> = {};

    for (const line of source.split(/\r?\n/)) {
        const match = line.match(/^\s*(export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
            continue;
        }

        assignments[match[2]] = {
            exported: Boolean(match[1]),
            value: stripInlineComment(unquoteShellValue(match[3].trim())),
        };
    }

    return assignments;
}

function getScriptPathSegments(workspaceRoot: string, relativePath: string): string[] {
    const pathAssignment = loadScriptAssignments(workspaceRoot, relativePath).PATH;
    if (!pathAssignment) {
        throw new Error(`Expected script ${relativePath} to assign PATH; actual was missing`);
    }

    return pathAssignment.value.split(':');
}

function loadDocument(
    fileType: 'json' | 'yaml',
    workspaceRoot: string,
    relativePath: string
): unknown {
    const filePath = path.join(workspaceRoot, relativePath);
    const source = fs.readFileSync(filePath, 'utf8');
    return fileType === 'json' ? JSON.parse(source) : yaml.load(source);
}

function getComposeServiceEnvironment(
    workspaceRoot: string,
    relativePath: string,
    service: string
): Record<string, string> {
    const environment = getComposeServiceField(workspaceRoot, relativePath, service, 'environment');

    if (Array.isArray(environment)) {
        return Object.fromEntries(
            environment.map((entry) => {
                const text = String(entry);
                const separatorIndex = text.indexOf('=');
                return separatorIndex === -1
                    ? [text, '']
                    : [text.slice(0, separatorIndex), text.slice(separatorIndex + 1)];
            })
        );
    }

    if (isRecord(environment)) {
        return Object.fromEntries(
            Object.entries(environment).map(([key, value]) => [key, String(value)])
        );
    }

    throw new Error(
        `Expected Compose service ${service} environment in ${relativePath} to be a map or array; actual was ${formatValue(environment)}`
    );
}

function getComposeServiceField(
    workspaceRoot: string,
    relativePath: string,
    service: string,
    field: string
): unknown {
    const compose = loadDocument('yaml', workspaceRoot, relativePath) as {
        services?: Record<string, Record<string, unknown>>;
    };
    const serviceConfig = compose?.services?.[service];

    if (!serviceConfig) {
        throw new Error(
            `Expected Compose file ${relativePath} to define service ${service}; actual services were ${formatValue(Object.keys(compose?.services ?? {}))}`
        );
    }

    if (!(field in serviceConfig)) {
        throw new Error(
            `Expected Compose file ${relativePath} service ${service} field ${field} to exist; actual service was ${formatValue(serviceConfig)}`
        );
    }

    return serviceConfig[field];
}

function normalizeComposeNetworks(networks: unknown): string[] {
    if (Array.isArray(networks)) {
        return networks.map((network) => String(network));
    }

    if (isRecord(networks)) {
        return Object.keys(networks);
    }

    return [];
}

function assertDeepEqual(input: {
    expectationLabel: string;
    assertionType: string;
    expectedValue: unknown;
    actualValue: unknown;
}): void {
    if (!deepEqual(input.actualValue, input.expectedValue)) {
        throw new Error(
            `Expected ${input.expectationLabel} to ${input.assertionType} ${formatValue(input.expectedValue)}; actual was ${formatValue(input.actualValue)}`
        );
    }
}

function deepEqual(left: unknown, right: unknown): boolean {
    if (left === right) {
        return true;
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
            return false;
        }

        return left.every((item, index) => deepEqual(item, right[index]));
    }

    if (isRecord(left) || isRecord(right)) {
        if (!isRecord(left) || !isRecord(right)) {
            return false;
        }

        const leftKeys = Object.keys(left).sort();
        const rightKeys = Object.keys(right).sort();

        if (leftKeys.length !== rightKeys.length) {
            return false;
        }

        return leftKeys.every(
            (key, index) => key === rightKeys[index] && deepEqual(left[key], right[key])
        );
    }

    return false;
}

function formatValue(value: unknown): string {
    if (typeof value === 'string') {
        return JSON.stringify(value);
    }

    if (value === undefined) {
        return 'undefined';
    }

    return JSON.stringify(value, null, 2) ?? String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unquoteShellValue(value: string): string {
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1);
    }

    return value;
}

function stripInlineComment(value: string): string {
    const commentIndex = value.indexOf(' #');
    return commentIndex === -1 ? value : value.slice(0, commentIndex).trimEnd();
}
