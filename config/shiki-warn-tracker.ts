/*
 * Runtime helper used to reduce noisy Shiki console output.
 *
 * The patched markdown Shiki factory now owns its own lifecycle and cache, so
 * this module is intentionally limited to warning filtering.
 */

const originalWarn = console.warn.bind(console);

console.warn = (...args: unknown[]) => {
    const [first, ...rest] = args;
    if (typeof first === "string" && first.startsWith("[Shiki]")) {
        return;
    }

    originalWarn(first as unknown, ...rest);
};
