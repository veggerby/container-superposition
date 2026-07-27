#!/usr/bin/env node

import { runBddAssertion, type BddAssertionRequest } from '../tool/testing/bdd-assertions.js';

async function main(): Promise<void> {
    const input = await readStdin();
    const request = JSON.parse(input) as BddAssertionRequest;
    const result = runBddAssertion(request);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exit(result.ok ? 0 : 1);
}

function readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            data += chunk;
        });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
    });
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify({ ok: false, message })}\n`);
    process.exit(1);
});
