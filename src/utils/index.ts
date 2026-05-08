/**
 * Stable public barrel for shared utility helpers, constants, and types.
 *
 * This module defines the approved cross-cutting utility surface exposed by `~/utils`. Layouts,
 * components, infrastructure code, and tests import from this barrel to access helpers that are
 * intentionally shared across the project.
 *
 * Re-exporting a symbol here signals that it is part of the project-wide utility API. Modules
 * that are feature-local, transitional, or primarily implementation details should remain private
 * instead of being surfaced through this barrel.
 *
 * ## Export policy
 *
 * Re-export a helper here only when it is:
 *
 * - broadly reusable across multiple features or layers;
 * - stable enough for the shared utility surface;
 * - safe to import from rendering code, infrastructure code, and tests.
 *
 * Do not re-export modules whose purpose is mainly:
 *
 * - supporting a single feature;
 * - preserving an internal implementation detail;
 * - exposing a transitional compatibility layer not suitable for long-term use.
 *
 * Development-oriented helpers may belong here when they support shared runtime behavior or
 * project-wide local development workflows.
 *
 * ## Export groups
 *
 * **Heading and semantic typing:** Types and helpers for working with HTML heading levels and
 * semantic document structure (used by callouts, layout components, and UI fragments).
 *
 * **Page metadata:** Utilities for building and normalizing normalized HTML `<head>` metadata,
 * including Page objects for SEO, Open Graph, and optional JSON-LD generation.
 *
 * **Cross-cutting runtime utilities:** Helpers for retry logic, random selection, repository URLs,
 * and site-wide constants (used by infrastructure, development workflows, and rendering logic).
 *
 * **Theme detection and application:** Helpers for reading and applying user theme preferences
 * (dark mode, auto-detect) in both client-side scripts and server-side rendering contexts.
 *
 * ## Import pattern
 *
 * Always import from the barrel root:
 *
 * ```ts
 * import { site, theme } from "~/utils";
 * import type { PageMeta } from "~/utils";
 * ```
 *
 * Subpath imports (e.g. `~/utils/theme.ts`) are not stable and should not be used.
 */

// Heading and semantic typing
export type { HeadingLevel } from "./heading-level";

// Page metadata
export { buildHeadPageMeta, type PageMeta } from "./page-meta";

// Cross-cutting runtime utilities
export {
    type DevTransportRetryOptions,
    isRetryableDevTransportError,
    runWithDevTransportRetry,
} from "./dev-transport-retry";

export { pickRandom } from "./random";
export { site } from "./site";
export type { default as StyledComponent } from "./styled-component";

// Theme detection and application
export {
    applyTheme,
    getColorSchemeMediaQuery,
    isDarkModePreferred,
    type Theme,
    theme,
} from "./theme";
