import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tool/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['tool/**/*.ts'],
            exclude: ['tool/__tests__/**', 'dist/**', 'node_modules/**'],
        },
    },
});
