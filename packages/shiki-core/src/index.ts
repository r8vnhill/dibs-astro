/**
 * Public entry point for `@ravenhill/shiki-core`.
 *
 * This module is the package's only supported import surface. Consumers should import from the package root so
 * internal modules can be reorganized without breaking downstream code.
 *
 * ## Highlighter orchestration
 *
 * Use {@link createShikiHighlighterService} to create a configured highlighting service. The service owns highlighter
 * creation, cache reuse, language loading, fallback rendering, and warning de-duplication.
 *
 * The package default is host-agnostic: operations run directly unless a retry function is provided. Applications that
 * need environment-specific behavior, such as development transport retries, should inject that behavior through the
 * service options.
 *
 * ## Usage
 *
 * ```ts
 * import { createShikiHighlighterService } from '@ravenhill/shiki-core';
 *
 * const service = createShikiHighlighterService({
 *   retry: async (operation, context) => {
 *     try {
 *       return await operation();
 *     } catch (error) {
 *       console.warn(`Shiki operation failed: ${context.operation}`);
 *       throw error;
 *     }
 *   },
 * });
 *
 * const html = await service.highlightToHtml({
 *   code: 'console.log("hello")',
 *   language: 'javascript',
 *   theme: 'catppuccin-mocha',
 * });
 * ```
 *
 * ## Language resolution
 *
 * The language helpers normalize user-facing language names before they reach Shiki:
 *
 * - {@link normalizeShikiLanguage} normalizes raw language input.
 * - {@link resolveShikiLanguage} resolves aliases to bundled Shiki language IDs.
 * - {@link isKnownShikiAlias} checks whether an input is recognized.
 * - {@link availableLanguages} exposes the supported bundled language IDs.
 * - {@link languageAliases} exposes the alias table used by resolution.
 *
 * ## Themes and fallback HTML
 *
 * The theme exports define the package defaults used by the highlighter service. The fallback HTML helpers render
 * escaped code blocks when syntax highlighting is unavailable, for example when a language is unknown or language
 * loading fails.
 *
 * ## Transformers
 *
 * Transformer exports support package consumers that need to customize Shiki's generated HTML:
 *
 * - {@link createTailwindClassTransformer} injects Tailwind utility classes into Shiki nodes.
 * - {@link createLineTextColorTransformer} applies inline line-color directives.
 * - {@link transformerNotationLineTextColor} preserves the legacy transformer factory
 *   name.
 *
 * ## Import constraints
 *
 * Subpath imports are unsupported inside and outside the workspace.
 *
 * ```ts
 * // ❌ Unsupported: internal modules are not public API.
 * import { resolveShikiLanguage } from '@ravenhill/shiki-core/src/languages/resolution';
 *
 * // ✅ Supported: import from the package root.
 * import { resolveShikiLanguage } from '@ravenhill/shiki-core';
 * ```
 *
 * This constraint is enforced through the package `exports` field.
 */

import { createShikiHighlighterService as createShikiHighlighterServiceImpl } from "./highlighter/service";

// Highlighter service and orchestration.
export { createShikiHighlighterService, getShikiHighlighter } from "./highlighter/service";

// Legacy highlighter factory alias.
/**
 * @deprecated Use {@link createShikiHighlighterService} instead.
 */
export const createShikiHighlighter = createShikiHighlighterServiceImpl;

// Language resolution and normalization.
export {
    availableLanguages,
    isKnownShikiAlias,
    languageAliases,
    normalizeShikiLanguage,
    resolveLanguage,
    resolveShikiLanguage,
} from "./languages/resolution";

// Theme defaults.
export { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, SHIKI_DEFAULT_THEMES } from "./themes/defaults";

// Fallback HTML rendering for unavailable syntax highlighting.
export { buildPlainHtml, escapeCodeHtml, renderFallbackCodeHtml } from "./fallback/html";

// HTML class-token utilities for transformer development.
export {
    appendUniqueClasses,
    assignMergedClassName,
    type ClassableNode,
    type ClassValue,
    splitClassTokens,
    toClassTokens,
} from "./transformers/class-tokens";

// Tailwind CSS transformer.
export {
    applyTailwindClasses,
    createTailwindClassTransformer,
    type TailwindClassTransformerOptions,
} from "./transformers/tailwind-classes";

// Inline line text-color transformer.
export {
    appendInlineStyle,
    createLineTextColorTransformer,
    getMetaKey,
    type ParsedLineColorDirective,
    parseInlineLineColorDirective,
    sanitizeCssColor,
    transformerNotationLineTextColor,
} from "./transformers/line-text-color";

// Service and orchestration types.
export type {
    HighlightToHtmlOptions,
    ShikiHighlighterService,
    ShikiHighlighterServiceOptions,
    ShikiRetry,
    ShikiRetryContext,
} from "./highlighter/types";

// Legacy compatibility types.
export type HighlightLanguage = string;

export interface HighlightThemePair {
    readonly light: string;
    readonly dark: string;
}

/**
 * @deprecated Use {@link HighlightToHtmlOptions} instead.
 */
export type { HighlightToHtmlOptions as HighlightCodeOptions } from "./highlighter/types";
