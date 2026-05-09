/**
 * @file service.ts
 *
 * App-configured Shiki highlighter service.
 *
 * This module wraps @ravenhill/shiki-core with app-specific configuration, particularly
 * the runWithDevTransportRetry for handling development timeouts. It serves as the canonical
 * location for Shiki highlighting within the app.
 *
 * All components and Markdown patching should depend on this service, not directly on the
 * package API. This centralizes app-specific concerns (theme registration, retry behavior,
 * cache management) in one place.
 */

import type { ShikiHighlighterService, ShikiHighlighterServiceOptions } from "@ravenhill/shiki-core";
import { createShikiHighlighterService } from "@ravenhill/shiki-core";
import type { ShikiTransformer } from "shiki";
import { runWithDevTransportRetry } from "~/utils";

/**
 * Creates an app-configured Shiki highlighting service with dev-transport retry support.
 *
 * This is the canonical way to create a Shiki service in this app. The returned service
 * automatically handles transient timeout failures during development through
 * {@link runWithDevTransportRetry}.
 *
 * @param options - Optional service configuration (theme, language defaults, etc.)
 * @returns Configured Shiki highlighter service
 */
export function createAppHighlighterService(options?: Omit<ShikiHighlighterServiceOptions, "retry">): ShikiHighlighterService {
    return createShikiHighlighterService({
        ...options,
        retry: (operation, context) =>
            runWithDevTransportRetry(async ({ signal: _signal }) => operation(), {
                label: `shiki ${context.operation}${context.language ? ` (${context.language})` : ""}`,
            }),
    });
}

/**
 * Shared app Shiki service instance.
 *
 * This is the canonical highlighter service for the app. It's a singleton that's reused
 * across components and Markdown highlighting to ensure cache efficiency.
 */
export const appShikiService = createAppHighlighterService();

/**
 * Highlights code to HTML using the app's configured Shiki service.
 *
 * This is the canonical way to highlight code in this app. It automatically applies:
 * - Dev-transport retry for handling timeouts during development
 * - App-configured themes and language defaults
 * - Deterministic class deduplication and output normalization
 *
 * @param code - Raw code string to highlight
 * @param lang - Language alias (must match a bundled language or fallback to 'text')
 * @param theme - Theme name ('catppuccin-latte', 'catppuccin-mocha', or other installed theme)
 * @param transformers - Optional Shiki transformers to apply to the HAST tree
 * @returns Promise resolving to the highlighted HTML string
 */
export async function highlightToHtml({
    code,
    lang,
    theme,
    transformers = [],
    fallbackPreClasses: _fallbackPreClasses = [],
    fallbackCodeClasses: _fallbackCodeClasses = [],
}: {
    code: string;
    lang: string;
    theme: string;
    transformers?: ShikiTransformer[];
    fallbackPreClasses?: string[];
    fallbackCodeClasses?: string[];
}) {
    return appShikiService.highlightToHtml({
        code,
        language: lang,
        theme,
        transformers,
    });
}
