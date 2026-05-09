/**
 * Public API exports for @ravenhill/shiki-core.
 *
 * This is the **only** public entry point for the package. Root-only imports enforce encapsulation
 * and allow the internal implementation to evolve without breaking consumers.
 *
 * ## Phase 2 Implementation
 *
 * **Extracted implementations:**
 * - Language resolution: `resolveShikiLanguage`, `normalizeShikiLanguage`, `isKnownShikiAlias`
 * - Theme defaults: `DEFAULT_DARK_THEME`, `DEFAULT_LIGHT_THEME`, `SHIKI_DEFAULT_THEMES`
 * - Fallback HTML: `escapeCodeHtml`, `renderFallbackCodeHtml`, `buildPlainHtml`
 * - Class token utilities: `splitClassTokens`, `toClassTokens`, `appendUniqueClasses`, `assignMergedClassName`
 * - Transformers: `createTailwindClassTransformer`, `createLineTextColorTransformer`
 *
 * **Phase 3 placeholders:**
 * - `createShikiHighlighter`, `getShikiHighlighter`
 *
 * ## Usage
 *
 * ```ts
 * import {
 *     resolveShikiLanguage,
 *     createTailwindClassTransformer,
 *     type HighlightCodeOptions,
 *     DEFAULT_DARK_THEME,
 * } from '@ravenhill/shiki-core';
 * ```
 *
 * Subpath imports are **not supported**:
 * ```ts
 * // ❌ This will fail (inside and outside the workspace)
 * import { resolveShikiLanguage } from '@ravenhill/shiki-core/src/languages/resolution';
 * ```
 *
 * This constraint is enforced by the `exports` field in `package.json`.
 */

// Phase 2: Extracted pure helpers
export {
    DEFAULT_DARK_THEME,
    DEFAULT_LIGHT_THEME,
    SHIKI_DEFAULT_THEMES,
} from "./themes/defaults";

export { escapeCodeHtml, renderFallbackCodeHtml, buildPlainHtml } from "./fallback/html";

export {
    isKnownShikiAlias,
    normalizeShikiLanguage,
    resolveShikiLanguage,
    resolveLanguage,
    availableLanguages,
    languageAliases,
} from "./languages/resolution";

export {
    type ClassValue,
    type ClassableNode,
    splitClassTokens,
    toClassTokens,
    appendUniqueClasses,
    assignMergedClassName,
} from "./transformers/class-tokens";

export { createTailwindClassTransformer, applyTailwindClasses, type TailwindClassTransformerOptions } from "./transformers/tailwind-classes";

export {
    createLineTextColorTransformer,
    transformerNotationLineTextColor,
    type ParsedLineColorDirective,
    getMetaKey,
    sanitizeCssColor,
    parseInlineLineColorDirective,
    appendInlineStyle,
} from "./transformers/line-text-color";

// Phase 3: Placeholder exports for highlighter management
export {
    createShikiHighlighter,
    getShikiHighlighter,
} from "./contract-placeholders";

export type {
    HighlightCodeOptions,
    HighlightLanguage,
    HighlightRetryContext,
    HighlightThemePair,
    RetryHighlightOperation,
} from "./contract-placeholders";
