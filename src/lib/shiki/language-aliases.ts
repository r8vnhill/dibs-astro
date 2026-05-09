/**
 * @deprecated Import directly from `@ravenhill/shiki-core` instead.
 *
 * This module is part of the Phase 4 compatibility bridge. It will be removed in Phase 6.
 *
 * Preferred imports:
 * - `import { resolveShikiLanguage, availableLanguages } from "@ravenhill/shiki-core"`
 */

export { isKnownShikiAlias, normalizeShikiLanguage, resolveShikiLanguage, availableLanguages, languageAliases } from "@ravenhill/shiki-core";

/**
 * @deprecated Use {@link resolveShikiLanguage} instead.
 */
export { resolveLanguage } from "@ravenhill/shiki-core";
