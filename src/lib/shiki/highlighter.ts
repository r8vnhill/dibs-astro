/**
 * @deprecated Import from `~/lib/code-highlighting` and `@ravenhill/shiki-core` instead.
 *
 * This module is part of the Phase 4 compatibility bridge. It will be removed in Phase 6.
 *
 * - For `highlightToHtml()` and `availableLanguages`, use `~/lib/code-highlighting` and `@ravenhill/shiki-core`
 * - For test helpers like `__resetHighlighterCacheForTests`, use `~/lib/code-highlighting`
 */

// Re-export highlighting function from the app-local boundary
export { highlightToHtml } from "~/lib/code-highlighting";

// Re-export cache helpers from the app-local boundary
export { __resetHighlighterCacheForTests, __setHighlighterForTests } from "~/lib/code-highlighting";

// Re-export language aliases and themes from the package
export { availableLanguages } from "@ravenhill/shiki-core";

// Re-export theme constants
export { SHIKI_DEFAULT_THEMES as supportedThemes } from "./config";
