/**
 * @file App-level public API for Shiki code highlighting.
 *
 * This module is the production entry point for the app's configured Shiki highlighting service. It adapts the 
 * host-agnostic `@ravenhill/shiki-core` package to app-specific runtime concerns:
 *
 * - dev-transport retry behavior for transient development failures;
 * - shared highlighter reuse through the app cache;
 * - one configured service boundary for components, content patches, and highlighting utilities.
 *
 * Import from this barrel when production app code needs the configured highlighter service. Do not import directly 
 * from lower-level service or cache modules unless a local implementation detail explicitly requires it.
 *
 * ## Production imports
 *
 * Prefer the smallest API that matches the use case:
 *
 * - {@link highlightToHtml} for standard code-to-HTML rendering.
 * - {@link getHighlighter} for advanced consumers that need direct access to the underlying Shiki highlighter.
 * - {@link appShikiService} when a consumer needs the configured service object rather than a single operation.
 * - {@link createAppHighlighterService} only when constructing an additional app-configured service is intentional.
 *
 * ## Test-only cache controls
 *
 * This barrel intentionally does not export test helpers. Tests that need to mutate the shared cache should import the 
 * testing adapter directly:
 *
 * ```ts
 * import {
 *     resetHighlighterCacheForTests,
 *     setHighlighterForTests,
 * } from "~/lib/code-highlighting/cache.testing";
 * ```
 *
 * Production code must not import `cache.testing`.
 *
 * ## Architecture
 *
 * ```text
 * @ravenhill/shiki-core
 *     Reusable package API:
 *     languages, fallbacks, themes, transformers, host-agnostic services.
 *
 * ~/lib/code-highlighting
 *     App boundary:
 *     configured service, dev retry, shared highlighter cache access.
 *
 * Components, content patches, utilities
 *     Consumers:
 *     rendering, Markdown/Astro integration, app-specific presentation.
 * ```
 */
export { appShikiService, createAppHighlighterService, highlightToHtml } from "./service";
export { getHighlighter } from "./cache";
export type { HighlighterPromise } from "./cache";
