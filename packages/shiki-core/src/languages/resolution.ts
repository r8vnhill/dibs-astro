/**
 * Language resolution and normalization utilities for Shiki.
 */

import { bundledLanguages } from "shiki";
import type { BundledLanguage } from "shiki";
import { languageAliases } from "./aliases";

// Re-export for public API
export { languageAliases, isKnownShikiAlias } from "./aliases";

/**
 * Compact array of bundled Shiki languages actually used by this package.
 *
 * Only includes non-null aliases from {@link languageAliases}, excluding plaintext mappings.
 */
export const availableLanguages = Array.from(
    new Set(
        Object.values(languageAliases).filter((lang): lang is BundledLanguage => lang !== null),
    ),
);

/**
 * Resolve a user-provided language identifier to a Shiki bundled language.
 *
 * The resolution process:
 * 1. Check if the lowercased input matches a known alias
 * 2. If the alias maps to a language, return it with `shouldWarn: false`
 * 3. If the alias maps to `null` (plaintext), return `null` with `shouldWarn: false`
 * 4. Check if the lowercased input is directly a bundled language
 * 5. Otherwise return `null` with `shouldWarn: true` (unrecognized)
 *
 * @param lang the user-provided language identifier
 * @returns an object with `resolvedLang` (the bundled language name or null) and `shouldWarn` (whether to emit a warning for unknown languages)
 */
export function resolveShikiLanguage(
    lang: string,
): { resolvedLang: BundledLanguage | null; shouldWarn: boolean } {
    const lower = lang.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(languageAliases, lower)) {
        const alias = languageAliases[lower];
        if (alias) {
            return { resolvedLang: alias, shouldWarn: false };
        }
        return { resolvedLang: null, shouldWarn: false };
    }
    if (lower in bundledLanguages) {
        return { resolvedLang: lower as BundledLanguage, shouldWarn: false };
    }
    return { resolvedLang: null, shouldWarn: true };
}

/**
 * Normalizes a language identifier to a canonical form.
 *
 * This is an alias for {@link resolveShikiLanguage} that emphasizes the normalization aspect.
 *
 * @param lang the language identifier to normalize
 * @returns the same result as {@link resolveShikiLanguage}
 */
export function normalizeShikiLanguage(
    lang: string,
): { resolvedLang: BundledLanguage | null; shouldWarn: boolean } {
    return resolveShikiLanguage(lang);
}

/**
 * Backwards compatibility alias for the canonical {@link resolveShikiLanguage}.
 *
 * @deprecated Use {@link resolveShikiLanguage} instead.
 */
export function resolveLanguage(
    lang: string,
): { resolvedLang: BundledLanguage | null; shouldWarn: boolean } {
    return resolveShikiLanguage(lang);
}
