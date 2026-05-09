/**
 * Language alias and resolution utilities.
 *
 * This is a thin compatibility wrapper for the canonical implementations in `@ravenhill/shiki-core`.
 * It preserves the existing app import path during the Phase 2 migration.
 */

// Canonical Phase 2 exports
export { isKnownShikiAlias, normalizeShikiLanguage, resolveShikiLanguage, availableLanguages, languageAliases } from "@ravenhill/shiki-core";

/**
 * Backwards compatibility alias for {@link resolveShikiLanguage}.
 *
 * @deprecated Use {@link resolveShikiLanguage} instead.
 */
export { resolveLanguage } from "@ravenhill/shiki-core";
