/**
 * @file Read-only production facade for the app Shiki highlighter cache.
 *
 * This module exposes production-safe access to the shared app highlighter. Cache ownership remains inside
 * {@link appShikiService}; this file only delegates to that service and does not expose cache mutation operations.
 *
 * Test-only cache controls live in `cache.testing.ts` and are intentionally not exported from this module. Production 
 * code should never import the testing adapter.
 *
 * ## Design
 *
 * - **Read-only facade:** Exposes highlighter access without set/reset helpers.
 * - **Lazy:** The underlying service creates the highlighter only when needed.
 * - **Memoized:** Repeated calls reuse the service-managed highlighter promise.
 * - **Shared:** App code uses the same configured {@link appShikiService}.
 * - **Testable:** Tests can override or reset the cache through `cache.testing`.
 */

import type { Highlighter } from "shiki";
import { appShikiService } from "./service";

/**
 * Promise for the app's shared Shiki highlighter.
 *
 * The underlying service memoizes this promise so concurrent and repeated callers share the same highlighter 
 * initialization path instead of creating duplicate Shiki instances.
 *
 * @example
 * ```ts
 * const firstPromise = getHighlighter();
 * const secondPromise = getHighlighter();
 *
 * console.log(firstPromise === secondPromise); // true while cached
 *
 * const highlighter = await firstPromise;
 * ```
 */
export type HighlighterPromise = Promise<Highlighter>;

/**
 * Returns the shared app Shiki highlighter.
 *
 * Use this only when code needs direct access to the Shiki highlighter API. Most consumers should prefer 
 * `highlightToHtml()` from `~/lib/code-highlighting`, which keeps rendering behavior behind the configured app service 
 * boundary.
 *
 * The highlighter is created lazily by {@link appShikiService} and reused through the service-managed cache.
 *
 * @returns The service-managed promise for the shared highlighter.
 *
 * @example
 * ```ts
 * import { getHighlighter } from "~/lib/code-highlighting";
 *
 * const highlighter = await getHighlighter();
 * const tokens = highlighter.codeToTokens(code, {
 *     lang: "ts",
 *     theme: "catppuccin-mocha",
 * });
 * ```
 */
export const getHighlighter = (): HighlighterPromise => appShikiService.getHighlighter();
