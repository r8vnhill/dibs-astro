/*
 * Encapsulates the creation and caching of the Shiki highlighter instance.
 * We keep this logic here so callers (like `highlighter.ts`) don't need to worry about singletons or global state.
 *
 * The module also exposes small test helpers that allow unit tests to inject a fake highlighter or reset the cached 
 * instance. These helpers are intentionally low-level and should only be used by tests.
 */
import { createHighlighter } from "shiki";
import type { BundledTheme } from "shiki";
import { availableLanguages, } from "./language-aliases";
import type { ShikiTransformer } from "shiki";

type HighlighterInstance = ReturnType<typeof createHighlighter>;

// Store the highlighter on the global object so separate ESM contexts (such as Vitest workers) can share or reset it 
// predictably in tests.
const globalCache = globalThis as typeof globalThis & {
    __dibsShikiHighlighter?: HighlighterInstance;
};

let highlighterPromise: HighlighterInstance | null = globalCache.__dibsShikiHighlighter ?? null;

/**
 * Return the shared Shiki highlighter instance, creating it on first use.
 *
 * `supportedThemes` is passed through to the underlying `createHighlighter` call; callers should pass the small set of 
 * themes they intend to support.
 */
export async function getHighlighter(supportedThemes: readonly string[] = ["catppuccin-latte", "catppuccin-mocha"]) {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            themes: [...supportedThemes] as unknown as BundledTheme[],
            langs: availableLanguages,
        });
        globalCache.__dibsShikiHighlighter = highlighterPromise;
    }
    return highlighterPromise;
}

/**
 * Test helper: clear the cached highlighter so tests can start from a deterministic state.
 */
export function __resetHighlighterCacheForTests() {
    highlighterPromise = null;
    delete globalCache.__dibsShikiHighlighter;
}

/**
 * Test helper: replace the cached highlighter with a custom instance. This is useful to inject a mock that records 
 * calls to `loadLanguage` / `codeToHtml`.
 */
export function __setHighlighterInstanceForTests(instance: HighlighterInstance | null) {
    highlighterPromise = instance;
    if (instance) {
        globalCache.__dibsShikiHighlighter = instance;
    } else {
        delete globalCache.__dibsShikiHighlighter;
    }
}

// Re-export the Shiki transformer type so callers (or tests) can reference it without importing `shiki` directly.
export type { ShikiTransformer };
