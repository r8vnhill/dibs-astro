/*
 * Public wrapper for the project's Shiki-based syntax highlighting.
 *
 * This module delegates to @ravenhill/shiki-core for the real implementation.
 * It maintains backward-compatible exports for existing components.
 */
import type { ShikiTransformer } from "shiki";
import { SHIKI_DEFAULT_THEMES } from "./config";
import { appShikiService } from "./service";

export const supportedThemes = SHIKI_DEFAULT_THEMES;
type HighlightTheme = (typeof SHIKI_DEFAULT_THEMES)[number] | string;

interface HighlightOptions {
    code: string;
    lang: string;
    theme: HighlightTheme;
    transformers?: ShikiTransformer[];
    fallbackPreClasses?: string[];
    fallbackCodeClasses?: string[];
}

export async function highlightToHtml({
    code,
    lang,
    theme,
    transformers = [],
    fallbackPreClasses: _fallbackPreClasses = [],
    fallbackCodeClasses: _fallbackCodeClasses = [],
}: HighlightOptions) {
    return appShikiService.highlightToHtml({
        code,
        language: lang,
        theme,
        transformers,
    });
}

// Re-exports for compatibility with existing components and tests
export { __resetHighlighterCacheForTests, __setHighlighterForTests } from "./cache";
export { availableLanguages } from "./language-aliases";
