/**
 * Public entry point for the app's configured code highlighting service.
 *
 * This module bridges the @ravenhill/shiki-core package with app-specific concerns:
 * - Dev-transport retry for handling timeouts during development
 * - Cache management and reset behavior for tests
 *
 * Components and Markdown patching should import this module to access configured highlighting.
 * The package itself (@ravenhill/shiki-core) provides host-agnostic language resolution and
 * transformers; this boundary ensures app-specific behavior is centralized and testable.
 */

export { appShikiService, createAppHighlighterService, highlightToHtml } from "./service";
export { getHighlighter } from "./cache";
export type { HighlighterPromise } from "./cache";
export { __resetHighlighterCacheForTests, __setHighlighterForTests } from "./cache";
