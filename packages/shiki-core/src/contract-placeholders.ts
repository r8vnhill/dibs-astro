/**
 * @deprecated - This file is deprecated. Use the new service API instead.
 *
 * The contract-placeholders were replaced with real implementations in Phase 3.
 * See highlighter/service.ts for the real implementations.
 *
 * @internal
 */

export { createShikiHighlighterService as createShikiHighlighter } from "./highlighter/service";
export { getShikiHighlighter } from "./highlighter/service";

export type { ShikiHighlighterService as any } from "./highlighter/types";
export type { HighlightToHtmlOptions as HighlightCodeOptions } from "./highlighter/types";
export type { ShikiRetry as RetryHighlightOperation } from "./highlighter/types";
export type { ShikiRetryContext as HighlightRetryContext } from "./highlighter/types";

// Legacy type aliases for backward compatibility
export type HighlightLanguage = string;
export interface HighlightThemePair {
    readonly light: string;
    readonly dark: string;
}

export const DEFAULT_DARK_THEME = "catppuccin-mocha";
export const DEFAULT_LIGHT_THEME = "catppuccin-latte";
