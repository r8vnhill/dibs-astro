/**
 * Public API exports for @ravenhill/shiki-core.
 *
 * This is the **only** public entry point for the package. Root-only imports enforce encapsulation
 * and allow the internal implementation to evolve without breaking consumers.
 *
 * ## Phase 1 Contract
 *
 * **Type contracts** (stable now, usable in TypeScript):
 * - `HighlightLanguage`, `HighlightThemePair`, `HighlightCodeOptions`
 * - `HighlightRetryContext`, `RetryHighlightOperation`
 * - Constants: `DEFAULT_DARK_THEME`, `DEFAULT_LIGHT_THEME`
 *
 * **Runtime scaffolds** (not implemented yet):
 * - Functions like `getShikiHighlighter()`, `normalizeShikiLanguage()`, etc.
 * - These intentionally throw errors to prevent accidental reliance on fake behavior
 * - Implementations will be extracted from `src/lib/shiki` in Phase 2
 *
 * ## Usage
 *
 * ```ts
 * import {
 *     getShikiHighlighter,
 *     normalizeShikiLanguage,
 *     type HighlightCodeOptions,
 *     DEFAULT_DARK_THEME,
 * } from '@ravenhill/shiki-core';
 * ```
 *
 * Subpath imports are **not supported**:
 * ```ts
 * // ❌ This will fail (inside and outside the workspace)
 * import { getShikiHighlighter } from '@ravenhill/shiki-core/src/index';
 * ```
 *
 * This constraint is enforced by the `exports` field in `package.json`.
 */

export {
    createLineTextColorTransformer,
    createShikiHighlighter,
    createTailwindClassTransformer,
    escapeCodeHtml,
    getShikiHighlighter,
    isKnownShikiAlias,
    normalizeShikiLanguage,
    renderFallbackCodeHtml,
    resolveShikiLanguage,
} from "./contract-placeholders";

export {
    DEFAULT_DARK_THEME,
    DEFAULT_LIGHT_THEME,
} from "./contract-placeholders";

export type {
    HighlightCodeOptions,
    HighlightLanguage,
    HighlightRetryContext,
    HighlightThemePair,
    RetryHighlightOperation,
} from "./contract-placeholders";
