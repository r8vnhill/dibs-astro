/**
 * Phase 1 contract placeholders for @ravenhill/shiki-core.
 *
 * These exports define the public API shape for the package. Runtime implementations
 * are scheduled for extraction in Phase 2 and Phase 3 and are intentionally marked
 * as unimplemented to prevent accidental reliance on placeholder behavior.
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
 * Internal helper for marking functions as intentionally unimplemented during Phase 1.
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
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const createShikiHighlighter = (): never => notImplemented("createShikiHighlighter");

/**
 * Returns the cached Shiki highlighter promise.
 *
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const getShikiHighlighter = (): never => notImplemented("getShikiHighlighter");

/**
 * Checks if a given string is a recognized language alias.
 *
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const isKnownShikiAlias = (): never => notImplemented("isKnownShikiAlias");

/**
 * Normalizes a language identifier to a canonical form.
 *
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const normalizeShikiLanguage = (): never => notImplemented("normalizeShikiLanguage");

/**
 * Resolves a language identifier to a bundled Shiki language.
 *
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const resolveShikiLanguage = (): never => notImplemented("resolveShikiLanguage");

/**
 * Escapes special HTML characters in code.
 *
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const escapeCodeHtml = (): never => notImplemented("escapeCodeHtml");

/**
 * Renders a code block as plain HTML when syntax highlighting is not available.
 *
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const renderFallbackCodeHtml = (): never => notImplemented("renderFallbackCodeHtml");

/**
 * Creates a Shiki transformer for applying Tailwind CSS class utilities.
 *
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const createTailwindClassTransformer = (): never =>
    notImplemented("createTailwindClassTransformer");

/**
 * Creates a Shiki transformer for applying per-line text colors.
 *
 * Phase 1 scaffold: implementation is scheduled for extraction in Phase 2.
 *
 * @throws Error - Always throws in Phase 1.
 */
export const createLineTextColorTransformer = (): never =>
    notImplemented("createLineTextColorTransformer");
