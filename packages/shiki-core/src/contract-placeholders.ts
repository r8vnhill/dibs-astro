/**
 * Phase 3 contract placeholders for @ravenhill/shiki-core.
 *
 * These exports define the remaining placeholder contracts for highlighter management.
 * Runtime implementations are scheduled for extraction in Phase 3 and are intentionally
 * marked as unimplemented to prevent accidental reliance on placeholder behavior.
 *
 * Phase 2 implementations (fallback HTML, language resolution, theme defaults, transformers)
 * are now available as real implementations elsewhere in the package.
 */

export const DEFAULT_DARK_THEME = "catppuccin-mocha";
export const DEFAULT_LIGHT_THEME = "catppuccin-latte";

/**
 * Supported Shiki languages and aliases.
 */
export type HighlightLanguage = string;

/**
 * Pair of light and dark theme names for dual-mode rendering.
 */
export interface HighlightThemePair {
    readonly light: string;
    readonly dark: string;
}

/**
 * Context passed to retry operations for highlighting tasks.
 */
export interface HighlightRetryContext {
    readonly operation: string;
    readonly language?: string;
}

/**
 * Optional retry wrapper for highlighting operations that may need recovery
 * from transient failures (e.g., network timeouts in development).
 */
export type RetryHighlightOperation = <T>(
    operation: () => Promise<T>,
    context: HighlightRetryContext,
) => Promise<T>;

/**
 * Options for highlighting a code block.
 */
export interface HighlightCodeOptions {
    readonly code: string;
    readonly language?: HighlightLanguage;
    readonly themes?: HighlightThemePair;
    readonly retry?: RetryHighlightOperation;
}

/**
 * Internal helper for marking functions as intentionally unimplemented during Phase 3.
 */
const notImplemented = (name: string): never => {
    throw new Error(
        `${name} is part of the @ravenhill/shiki-core public contract, `
            + "but its implementation is scheduled for a later extraction phase.",
    );
};

/**
 * Creates and returns the shared Shiki highlighter instance.
 *
 * Phase 3 scaffold: implementation is scheduled for extraction in Phase 3.
 *
 * @throws Error - Always throws in Phase 2.
 */
export const createShikiHighlighter = (): never => notImplemented("createShikiHighlighter");

/**
 * Returns the cached Shiki highlighter promise.
 *
 * Phase 3 scaffold: implementation is scheduled for extraction in Phase 3.
 *
 * @throws Error - Always throws in Phase 2.
 */
export const getShikiHighlighter = (): never => notImplemented("getShikiHighlighter");
