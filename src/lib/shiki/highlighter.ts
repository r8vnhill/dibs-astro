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
import type { ShikiTransformer } from "shiki";
import { runWithDevTransportRetry } from "~/utils";
import { getHighlighter } from "./cache";
import { SHIKI_DEFAULT_THEMES } from "./config";
import { buildPlainHtml } from "./html";
import { resolveLanguage } from "./language-aliases";

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

const warnOnDevRetryEvent = (event: { type: string; label: string; error: unknown }) => {
    if (event.type !== "retry-scheduled") {
        return;
    }

    const message = event.error instanceof Error ? event.error.message : String(event.error ?? "");
    console.warn(`[dev-retry] ${event.label} retry scheduled after: ${message}`);
};

export async function highlightToHtml({
    code,
    lang,
    theme,
    transformers = [],
    fallbackPreClasses = [],
    fallbackCodeClasses = [],
}: HighlightOptions) {
    // Get (or create) the shared highlighter instance preloaded with the project's default themes.
    const highlighter = await getHighlighter();

    // `text` is a special Shiki language that does not require grammar loading, but still supports transformers.
    if (lang.toLowerCase() === "text") {
        return highlighter.codeToHtml(code, {
            lang: "text",
            theme,
            transformers,
        });
    }

    // Resolve language aliases (for example `py` -> `python`, `nu` -> `nushell`).
    // `resolvedLang` is a BundledLanguage when we know how to highlight it, otherwise null.
    const { resolvedLang, shouldWarn } = resolveLanguage(lang);

    if (resolvedLang) {
        try {
            if (!highlighter.getLoadedLanguages().includes(resolvedLang)) {
                await runWithDevTransportRetry(
                    async ({ signal: _signal }) => await highlighter.loadLanguage(resolvedLang),
                    {
                        label: `shiki language load (${resolvedLang})`,
                        onRetryEvent: warnOnDevRetryEvent,
                    },
                );
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
export { __resetHighlighterCacheForTests, __setHighlighterForTests } from "./cache";
export { availableLanguages } from "./language-aliases";
