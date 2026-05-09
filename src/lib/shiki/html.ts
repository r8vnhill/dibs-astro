/**
 * Fallback HTML rendering for code blocks.
 *
 * This is a thin compatibility wrapper for the canonical implementations in `@ravenhill/shiki-core`.
 * It preserves the existing app import path during the Phase 2 migration.
 */

export { escapeCodeHtml, renderFallbackCodeHtml, buildPlainHtml } from "@ravenhill/shiki-core";
