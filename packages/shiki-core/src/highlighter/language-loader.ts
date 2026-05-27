/**
 * @file Language loading boundary for Shiki highlighters.
 *
 * This module separates language handling into two small steps:
 *
 * - **Classification via {@link resolveLoadableLanguage}.** The classifier handles plain-text aliases, resolves Shiki
 *   aliases to their canonical bundled language, and preserves unknown caller input for diagnostics.
 * - **Loading via {@link ensureLanguageLoaded}.** The loader checks whether the canonical language is already
 *   available in the highlighter and delegates asynchronous loading to the caller-provided loading function.
 *
 * The module does not own service-level in-flight deduplication. That coordination belongs to the highlighter service
 * because it owns the long-lived highlighter instance and concurrent render calls.
 */

import type { BundledLanguage, Highlighter } from "shiki";
import { resolveShikiLanguage } from "../languages/resolution";
import type { LanguageLoadResult } from "./types";

/**
 * Minimal highlighter capability needed by {@link ensureLanguageLoaded}.
 *
 * Keeping this boundary narrower than Shiki's full {@link Highlighter} makes the loader easier to test with small
 * fakes while remaining compatible with real Shiki highlighter instances.
 */
type LoadedLanguageReader = Pick<Highlighter, "getLoadedLanguages">;

/**
 * Plain-text identifiers accepted before Shiki alias resolution.
 *
 * `text`, `txt`, and `plain` mirror Shiki's plain-text behavior. `plaintext` is kept as a project compatibility alias
 * so existing callers continue to bypass syntax highlighting.
 */
const plainTextLanguages = new Set(["text", "txt", "plain", "plaintext"]);

/**
 * Returns whether a caller-provided language should bypass syntax loading.
 *
 * Matching is case-insensitive and tolerates surrounding whitespace because language identifiers often come from
 * Markdown fences or user-authored metadata.
 *
 * @param language Caller-provided language identifier.
 * @returns `true` when the identifier should be rendered as plain text.
 */
const isPlainTextLanguage = (language: string): boolean =>
    plainTextLanguages.has(
        language
            .trim()
            .toLowerCase(),
    );

/**
 * Result of classifying a caller-provided language identifier.
 *
 * The classifier distinguishes languages that need no loading, languages that can be loaded after alias normalization,
 * and languages that cannot be mapped to a known Shiki bundled language.
 */
export type ResolvedLanguageLoadRequest =
    | {
        /**
         * The input is a plain-text alias and should bypass syntax loading.
         */
        readonly kind: "plain-text";
    }
    | {
        /**
         * The input could not be resolved.
         */
        readonly kind: "unknown-language";
        /**
         * The original caller input is preserved so fallback diagnostics can report what was requested, including
         * surrounding whitespace when present.
         */
        readonly language: string;
    }
    | {
        /**
         * The input resolved to a canonical Shiki bundled language.
         */
        readonly kind: "loadable";
        /**
         * Callers should use this canonical value for loading, rendering, and service-level deduplication.
         */
        readonly language: BundledLanguage;
    };

/**
 * Classifies a language identifier for Shiki loading.
 *
 * This pure helper performs the decision that should happen before any highlighter state is inspected:
 *
 * - plain-text aliases return `plain-text`;
 * - known aliases return a canonical {@link BundledLanguage};
 * - unknown identifiers preserve the original caller input.
 *
 * The trimmed input is used for plain-text detection and Shiki alias resolution. Unknown results intentionally keep 
 * the original input for clearer diagnostics.
 *
 * @param language Caller-provided language identifier.
 * @returns A classified language-loading request.
 */
export function resolveLoadableLanguage(
    language: string,
): ResolvedLanguageLoadRequest {
    const normalizedLanguage = language.trim();

    if (isPlainTextLanguage(normalizedLanguage)) {
        return { kind: "plain-text" };
    }

    const { resolvedLang } = resolveShikiLanguage(normalizedLanguage);

    if (!resolvedLang) {
        return { kind: "unknown-language", language };
    }

    return { kind: "loadable", language: resolvedLang };
}

/**
 * Ensures that a resolved Shiki language is available in a highlighter.
 *
 * This function never throws. It returns a {@link LanguageLoadResult} that tells the caller whether the language:
 *
 * - requires no loading because it is plain text;
 * - is unknown and should use fallback rendering;
 * - is already loaded or was loaded successfully;
 * - failed to load and should use fallback rendering.
 *
 * Successful and failed load branches both carry the canonical {@link BundledLanguage}. Unknown-language branches 
 * preserve the original caller input because no canonical language exists.
 *
 * @param highlighter Highlighter capability used to inspect loaded languages.
 * @param language Caller-provided language identifier.
 * @param loadLanguage Function that loads a canonical Shiki bundled language.
 * @returns The structured language-loading outcome.
 */
export async function ensureLanguageLoaded(
    highlighter: LoadedLanguageReader,
    language: string,
    loadLanguage: (lang: BundledLanguage) => Promise<void>,
): Promise<LanguageLoadResult> {
    const request = resolveLoadableLanguage(language);

    if (request.kind !== "loadable") {
        return request;
    }

    if (highlighter.getLoadedLanguages().includes(request.language)) {
        return { kind: "loaded", language: request.language };
    }

    try {
        await loadLanguage(request.language);

        return { kind: "loaded", language: request.language };
    } catch (error) {
        return { kind: "load-failed", language: request.language, error };
    }
}
