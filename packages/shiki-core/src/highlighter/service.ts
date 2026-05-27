/**
 * Shiki highlighter service orchestration.
 *
 * Coordinates highlighter creation, language loading, caching, and fallback rendering.
 */

import { createHighlighter } from "shiki";
import type { BundledLanguage, Highlighter } from "shiki";
import { createStore } from "./store";
import { syncToGlobal, readFromGlobalCache } from "./global-singleton";
import { ensureLanguageLoaded } from "./language-loader";
import { shouldWarn, resetWarnings } from "./warnings";
import { buildPlainHtml } from "../fallback/html";
import type {
    LanguageLoadResult,
    ShikiHighlighterService,
    ShikiHighlighterServiceOptions,
    ShikiRetry,
    HighlightToHtmlOptions,
} from "./types";
import { defaultLanguages, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from "./defaults";

/**
 * Default no-retry function.
 */
const directExecution: ShikiRetry = (operation) => operation();

function getRenderableLanguage(loadResult: LanguageLoadResult): BundledLanguage | "text" | null {
    switch (loadResult.kind) {
        case "loaded":
            return loadResult.language;

        case "plain-text":
            return "text";

        case "unknown-language":
        case "load-failed":
            return null;
    }
}

/**
 * Creates a Shiki highlighter service with optional custom retry behavior.
 *
 * @param options - Configuration including retry handler and custom theme/language defaults
 * @returns A service providing highlighter access and highlighting operations
 */
export function createShikiHighlighterService(
    options?: ShikiHighlighterServiceOptions,
): ShikiHighlighterService {
    const optionsOrDefault = options || {};
    const retry = optionsOrDefault.retry || directExecution;
    const customWarn = optionsOrDefault.warn;
    const defaultTheme = optionsOrDefault.defaultTheme || DEFAULT_DARK_THEME;
    const initialLanguages = optionsOrDefault.initialLanguages || defaultLanguages;

    const warnMessage = ((msg: string): void => {
        if (customWarn) {
            customWarn(msg);
            return;
        }

        console.warn(msg);
    }) as (msg: string) => void;

    // Create the promise-backed store with global cache synchronization
    const highlighterStore = createStore({
        create: async () => {
            return retry(
                async () =>
                    createHighlighter({
                        themes: [DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME],
                        langs: initialLanguages.slice(),
                    }),
                { operation: "create-highlighter" },
            );
        },
        onSet: syncToGlobal,
    });

    // Rehydrate from global cache if available
    const cachedGlobalPromise = readFromGlobalCache();
    if (cachedGlobalPromise) {
        highlighterStore.setForTests(cachedGlobalPromise);
    }

    return {
        getHighlighter: () => highlighterStore.get(),

        async highlightToHtml(options: HighlightToHtmlOptions): Promise<string> {
            const { code, language, theme = defaultTheme, meta, transformers = [] } = options;

            // Get or create the highlighter
            const highlighter = await highlighterStore.get();

            // Ensure the language is loaded
            const loadResult = await ensureLanguageLoaded(
                highlighter,
                language,
                async (lang) =>
                    retry(async () => highlighter.loadLanguage(lang), {
                        operation: "load-language",
                        language: lang,
                    }),
            );

            // Handle load outcomes
            const renderableLanguage = getRenderableLanguage(loadResult);
            if (renderableLanguage) {
                return highlighter.codeToHtml(code, {
                    lang: renderableLanguage,
                    theme,
                    ...(meta && { meta }),
                    ...(transformers && transformers.length > 0 && { transformers: [...transformers] }),
                } as any);
            }

            // Unknown or failed language - warn once and render fallback
            if (loadResult.kind === "unknown-language" && shouldWarn("unknown-language", language)) {
                warnMessage(`[shiki] language "${language}" not recognized. Rendering as plain text.`);
            } else if (loadResult.kind === "load-failed" && shouldWarn("load-failed", language)) {
                const errorMsg = loadResult.error instanceof Error
                    ? loadResult.error.message
                    : String(loadResult.error);
                warnMessage(`[shiki] language "${language}" could not be loaded (${errorMsg}). Rendering as plain text.`);
            }

            return buildPlainHtml(code, [], []);
        },
    };
}

/**
 * Returns the shared Shiki highlighter instance from the global cache.
 *
 * This is useful for direct highlighter access when needed, but most
 * code should use a configured service instead.
 *
 * @throws Error - If the highlighter has not been created yet
 */
export async function getShikiHighlighter(): Promise<Highlighter> {
    const cached = readFromGlobalCache();
    if (!cached) {
        throw new Error(
            "No cached Shiki highlighter found. "
                + "Create a service with createShikiHighlighterService() first.",
        );
    }
    return cached;
}

/**
 * Test control: Reset all warning tracking.
 *
 * @internal - Not part of the public API
 */
export function __resetShikiWarningsForTests(): void {
    resetWarnings();
}
