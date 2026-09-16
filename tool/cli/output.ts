let silent = false;
let originalLog: typeof console.log | undefined;
let originalWarn: typeof console.warn | undefined;

/** Suppress routine CLI output for one command invocation. */
export function enableSilentOutput(): void {
    if (silent) return;

    silent = true;
    originalLog = console.log;
    originalWarn = console.warn;
    console.log = () => undefined;
    console.warn = () => undefined;
}

export function isSilentOutput(): boolean {
    return silent;
}

/** Restore console output; primarily useful to callers sharing a process in tests. */
export function restoreOutput(): void {
    if (!silent) return;

    console.log = originalLog!;
    console.warn = originalWarn!;
    originalLog = undefined;
    originalWarn = undefined;
    silent = false;
}
