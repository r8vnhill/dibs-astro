/**
 * Shiki highlighter service orchestration.
 *
 * Coordinates highlighter creation, language loading, caching, and fallback rendering.
 */

import { createHighlighter } from "shiki";
import type { BundledLanguage, Highlighter } from "shiki";
import { renderFallbackCodeHtml } from "../fallback/html";
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, defaultLanguages } from "./defaults";
import { readFromGlobalCache, syncToGlobal } from "./global-singleton";
import { resolveLoadableLanguage } from "./language-loader";
import { createStore } from "./store";
import type {
    HighlightToHtmlOptions,
    LanguageLoadResult,
    ShikiHighlighterService,
    ShikiHighlighterServiceOptions,
    ShikiRetry,
} from "./types";
import { resetWarnings, shouldWarn } from "./warnings";

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
    const inFlightLanguageLoads = new Map<BundledLanguage, Promise<LanguageLoadResult>>();

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

    async function loadResolvedLanguage(
        highlighter: Highlighter,
        language: BundledLanguage,
    ): Promise<LanguageLoadResult> {
        try {
            await retry(async () => highlighter.loadLanguage(language), {
                operation: "load-language",
                language,
            });

            return { kind: "loaded", language };
        } catch (error) {
            return { kind: "load-failed", language, error };
        }
    }

    async function ensureServiceLanguageLoaded(
        highlighter: Highlighter,
        language: string,
    ): Promise<LanguageLoadResult> {
        const request = resolveLoadableLanguage(language);

        if (request.kind !== "loadable") {
            return request;
        }

        if (highlighter.getLoadedLanguages().includes(request.language)) {
            return { kind: "loaded", language: request.language };
        }

        const currentLoad = inFlightLanguageLoads.get(request.language);

        if (currentLoad) {
            return currentLoad;
        }

        const nextLoad = loadResolvedLanguage(highlighter, request.language);
        inFlightLanguageLoads.set(request.language, nextLoad);

        try {
            return await nextLoad;
        } finally {
            if (inFlightLanguageLoads.get(request.language) === nextLoad) {
                inFlightLanguageLoads.delete(request.language);
            }
        }
    }

    return {
        getHighlighter: () => highlighterStore.get(),

        async highlightToHtml(options: HighlightToHtmlOptions): Promise<string> {
            const { code, language, theme = defaultTheme, meta, transformers = [] } = options;

            // Get or create the highlighter
            const highlighter = await highlighterStore.get();

            // Ensure the language is loaded
            const loadResult = await ensureServiceLanguageLoaded(highlighter, language);

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
                warnMessage(
                    `[shiki] language "${language}" could not be loaded (${errorMsg}). Rendering as plain text.`,
                );
            }

            return renderFallbackCodeHtml(code, [], []);
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
