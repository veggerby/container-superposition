#!/usr/bin/env node

/**
 * Example: Using the tool programmatically
 *
 * This shows how you could use the composer directly from code,
 * bypassing the CLI questionnaire.
 */

import { composeDevContainer } from '../tool/questionnaire/composer.js';

// Example 1: Basic .NET setup with PostgreSQL
async function example1() {
    await composeDevContainer({
        stack: 'compose',
        baseImage: 'bookworm',
        language: ['dotnet'],
        needsDocker: false,
        database: 'postgres',
        playwright: false,
        cloudTools: [],
        observability: [],
        outputPath: './examples/dotnet-postgres/.devcontainer',
    });
    console.log('✅ Created: examples/dotnet-postgres/.devcontainer/');
}

// Example 2: Full-stack with all the things
async function example2() {
    await composeDevContainer({
        stack: 'compose',
        baseImage: 'bookworm',
        language: ['nodejs'],
        needsDocker: false,
        database: 'postgres+redis',
        playwright: true,
        cloudTools: ['azure-cli', 'kubectl-helm'],
        observability: ['otel-collector', 'jaeger', 'prometheus', 'grafana'],
        outputPath: './examples/fullstack-kitchen-sink/.devcontainer',
    });
    console.log('✅ Created: examples/fullstack-kitchen-sink/.devcontainer/');
}

// Example 3: Minimal Node.js
async function example3() {
    await composeDevContainer({
        stack: 'plain',
        baseImage: 'bookworm',
        language: ['nodejs'],
        needsDocker: false,
        database: 'none',
        playwright: false,
        cloudTools: [],
        observability: [],
        outputPath: './examples/minimal-node/.devcontainer',
    });
    console.log('✅ Created: examples/minimal-node/.devcontainer/');
}

// Run examples
async function main() {
    const example = process.argv[2] || '1';

    console.log('🔧 Programmatic composition example\n');

    switch (example) {
        case '1':
            await example1();
            break;
        case '2':
            await example2();
            break;
        case '3':
            await example3();
            break;
        case 'all':
            await example1();
            await example2();
            await example3();
            break;
        default:
            console.log('Usage: node scripts/example.js [1|2|3|all]');
            console.log('  1: .NET + PostgreSQL');
            console.log('  2: Fullstack kitchen sink');
            console.log('  3: Minimal Node.js');
            console.log('  all: Generate all examples');
    }
}

main().catch(console.error);
