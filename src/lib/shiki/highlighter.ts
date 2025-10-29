/*
 * Public wrapper for the project's Shiki-based syntax highlighting.
 *
 * Responsibilities:
 * - Resolve requested language names to bundled Shiki languages (via `language-aliases`).
 * - Obtain a cached highlighter instance (via `cache`).
 * - Attempt to load language definitions on-demand and render highlighted HTML using Shiki. If a language can't be 
 *   resolved or loaded, fall back to safe, plain HTML (via `html`).
 *
 * Test helpers live in `cache.ts` so they remain clearly internal and aren't part of the main highlighting API.
 */
import type { BundledTheme } from "shiki";
import type { ShikiTransformer } from "shiki";
import { getHighlighter } from "./cache";
import { resolveLanguage, } from "./language-aliases";
import { buildPlainHtml } from "./html";

export const supportedThemes = ["catppuccin-latte", "catppuccin-mocha"] as const;
type SupportedTheme = (typeof supportedThemes)[number];

type HighlightTheme = SupportedTheme | BundledTheme | string;

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
    fallbackPreClasses = [],
    fallbackCodeClasses = [],
}: HighlightOptions) {
    // Get (or create) the shared highlighter instance. We pass the supported themes list so the underlying creator 
    // knows which themes to preload.
    const highlighter = await getHighlighter(supportedThemes as unknown as string[]);

    // Resolve language aliases (for example `py` -> `python`, `nu` -> `nushell`).
    // `resolvedLang` is a BundledLanguage when we know how to highlight it, otherwise null.
    const { resolvedLang, shouldWarn } = resolveLanguage(lang);

    if (resolvedLang) {
        try {
            if (!highlighter.getLoadedLanguages().includes(resolvedLang)) {
                await highlighter.loadLanguage(resolvedLang);
            }

            return highlighter.codeToHtml(code, {
                lang: resolvedLang,
                theme,
                transformers,
            });
        } catch (error) {
            // If language loading fails (for example, a missing dependency or network error during dynamic load), warn 
            // once and fall back to rendering un-highlighted, escaped HTML. We track failures so we don't flood the 
            // console.
            if (!failedLanguageWarnings.has(resolvedLang)) {
                failedLanguageWarnings.add(resolvedLang);
                console.warn(
                    `[shiki] language "${lang}" could not be loaded. Rendering as plain text.`,
                    error,
                );
            }
        }
    }

    // If the language wasn't recognized at all (not in our alias map or in the Shiki bundle), issue a single warning 
    // for that language and return a plain, escaped code block so content remains safe.
    if (shouldWarn && !missingLanguageWarnings.has(lang)) {
        missingLanguageWarnings.add(lang);
        console.warn(`[shiki] language "${lang}" not recognized. Rendering as plain text.`);
    }

    return buildPlainHtml(code, fallbackPreClasses, fallbackCodeClasses);
}

const missingLanguageWarnings = new Set<string>();
const failedLanguageWarnings = new Set<string>();

// Re-exports for compatibility with existing components and tests
export { availableLanguages } from "./language-aliases";
export {
    __resetHighlighterCacheForTests,
    __setHighlighterInstanceForTests,
} from "./cache";
