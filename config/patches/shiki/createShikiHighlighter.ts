/**
 * Creates, caches, and disposes the patched Shiki facade used by Astro's markdown layer.
 *
 * This module is the lifecycle boundary for syntax highlighting within the patched markdown
 * integration. It translates user-facing highlighter options into a canonical internal
 * configuration, creates the underlying Shiki highlighter, wraps it with the local decorator
 * pipeline, and reuses the resulting facade across equivalent calls.
 *
 * ## Responsibilities
 *
 * This module is responsible for:
 *
 * - normalizing caller configuration into a stable, cacheable shape;
 * - registering themes and languages in the form expected by Shiki;
 * - composing the decorator pipeline around raw `codeToHtml` and `codeToHast`;
 * - caching one patched wrapper per effective configuration; and
 * - exposing explicit disposal so cached entries can be invalidated safely.
 *
 * ## Non-obvious contract
 *
 * - `text` is the canonical plain-text fallback used internally;
 * - incoming `plaintext` values are normalized to `text` for compatibility;
 * - cache entries are keyed by normalized configuration, not by object identity;
 * - failed initialization clears the active cache entry so later calls can retry.
 *
 * ## Cache model
 *
 * The cache stores promises rather than resolved instances. This ensures that concurrent callers
 * requesting the same effective configuration share a single initialization flow instead of racing
 * to build duplicate Shiki instances.
 */

import { createCssVariablesTheme, createHighlighter } from "shiki";
import { runWithDevTransportRetry } from "../../../src/utils/dev-transport-retry";
import {
    composeDecorators,
    withAliasResolution,
    withDefaultTransformers,
    withLanguageLoading,
    withTrailingNewlineTrim,
} from "./decorators";
import type {
    HighlightCallOptions,
    HighlighterInstance,
    HighlighterOptions,
    HighlighterTheme,
    HighlighterThemeMap,
    HighlightExecutor,
    HighlightFormat,
    HighlightHastResult,
    HighlightHtmlResult,
    HighlightResult,
    HighlightState,
    NormalizedHighlighterConfig,
    PatchedHighlighter,
} from "./types";

/**
 * Cached CSS-variables theme instance.
 *
 * The generated theme is pure and reusable, so it is created lazily once and then shared across
 * all highlighter instances that request it.
 */
let cachedCssTheme: ReturnType<typeof createCssVariablesTheme> | undefined;

/**
 * Cache of patched highlighter facades keyed by normalized configuration.
 *
 * Values are stored as promises so equivalent concurrent calls can await the same in-flight
 * creation instead of creating multiple highlighters.
 */
const highlighterCache = new Map<string, Promise<PatchedHighlighter>>();

/**
 * Returns the shared CSS-variables theme used by the patch layer.
 *
 * The theme is created lazily on first use and then cached for reuse.
 *
 * @returns Shared CSS-variables Shiki theme instance.
 */
const cssVariablesTheme = () =>
    cachedCssTheme
        ?? (cachedCssTheme = createCssVariablesTheme({
            variablePrefix: "--astro-code-",
        }));

/**
 * Canonical plain-text language name used internally by this module.
 *
 * The patch layer normalizes historical or caller-facing variants such as `plaintext` to Shiki's
 * documented `text` language.
 */
const canonicalPlainTextLang = "text";

/**
 * Normalizes a language identifier into the internal canonical form.
 *
 * This currently rewrites `plaintext` to `text` and leaves all other names as-is.
 *
 * @param lang Caller-provided language identifier.
 * @returns Canonical language identifier used by the patch layer.
 */
const normalizeLanguageName = (lang: string) =>
    lang.toLowerCase() === "plaintext" ? canonicalPlainTextLang : lang;

/**
 * Serializes a JSON-like value using stable key ordering.
 *
 * This is used to generate deterministic cache keys for normalized configuration objects. Two
 * semantically equivalent objects with different property insertion order produce the same
 * serialized output.
 *
 * Arrays preserve element order. Objects are serialized with keys sorted lexicographically.
 *
 * @param value Value to serialize.
 * @returns Stable serialized representation suitable for cache keys.
 */
function stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
    }

    if (value && typeof value === "object") {
        const entries = Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, innerValue]) => `${JSON.stringify(key)}:${stableSerialize(innerValue)}`);
        return `{${entries.join(",")}}`;
    }

    return JSON.stringify(value);
}

/**
 * Normalizes and deduplicates the configured language list.
 *
 * Language names are canonicalized first, then deduplicated while preserving the first occurrence
 * of each normalized name.
 *
 * @param langs Language names requested by the caller.
 * @returns Deduplicated list of canonical language names.
 */
const dedupeLanguages = (langs: string[]) =>
    Array.from(new Set(langs.map((lang) => normalizeLanguageName(lang))));

/**
 * Normalizes the language alias map into a canonical, stably ordered form.
 *
 * The normalization step ensures the decorator pipeline only sees canonical target language names.
 * A built-in compatibility alias for `plaintext -> text` is always included.
 *
 * @param langAlias Caller-provided alias map.
 * @returns Canonical alias map sorted by alias key.
 */
function normalizeLangAlias(langAlias: Record<string, string>) {
    const normalizedEntries = Object.entries({
        plaintext: canonicalPlainTextLang,
        ...langAlias,
    }).map(([alias, target]) => [alias, normalizeLanguageName(target)]);

    return Object.fromEntries(
        normalizedEntries.sort(([left], [right]) => left.localeCompare(right)),
    );
}

/**
 * Normalizes theme-related configuration into the forms needed for:
 *
 * - Shiki registration at highlighter creation time;
 * - render-time theme selection; and
 * - cache-key generation.
 *
 * When a `themes` map is provided, it takes precedence over the single `theme` option. When the
 * special `css-variables` theme is requested, the lazily cached generated theme is registered
 * while render-time selection still uses the `"css-variables"` identifier.
 *
 * @param theme Single-theme option.
 * @param themes Multi-theme map option.
 * @returns Normalized theme registration and render configuration.
 */
function normalizeThemeConfig(
    theme: HighlighterOptions["theme"],
    themes: HighlighterThemeMap,
) {
    const themeEntries = Object.entries(themes).sort(([left], [right]) =>
        left.localeCompare(right)
    );

    if (themeEntries.length > 0) {
        const normalizedThemes = Object.fromEntries(themeEntries) as HighlighterThemeMap;
        return {
            registrationThemes: themeEntries.map(([, entryTheme]) => entryTheme),
            renderThemeOptions: { themes: normalizedThemes } as const,
            cacheThemeKey: normalizedThemes,
        };
    }

    if (theme === "css-variables") {
        return {
            registrationThemes: [cssVariablesTheme()],
            renderThemeOptions: { theme: "css-variables" } as const,
            cacheThemeKey: "css-variables",
        };
    }

    const normalizedTheme = (theme ?? "github-dark") as HighlighterTheme;

    return {
        registrationThemes: [normalizedTheme],
        renderThemeOptions: { theme: String(normalizedTheme) } as const,
        cacheThemeKey: normalizedTheme,
    };
}

/**
 * Converts caller-facing options into the canonical configuration used by this module.
 *
 * The returned configuration is the single source of truth for:
 *
 * - cache lookup;
 * - Shiki initialization;
 * - alias handling; and
 * - render-time theme selection.
 *
 * This function is intentionally pure so equivalent inputs always produce an equivalent normalized
 * configuration and, therefore, the same cache key.
 *
 * @param options Caller-provided highlighter options.
 * @returns Canonical normalized highlighter configuration.
 */
export function normalizeHighlighterConfig({
    langs = [],
    theme = "github-dark",
    themes = {},
    langAlias = {},
}: HighlighterOptions = {}): NormalizedHighlighterConfig {
    const normalizedLangs = dedupeLanguages([canonicalPlainTextLang, ...langs]);
    const normalizedLangAlias = normalizeLangAlias(langAlias);
    const normalizedThemeConfig = normalizeThemeConfig(theme, themes);

    const cacheKey = stableSerialize({
        langs: normalizedLangs,
        langAlias: normalizedLangAlias,
        theme: normalizedThemeConfig.cacheThemeKey,
    });

    return {
        cacheKey,
        langs: normalizedLangs,
        langAlias: normalizedLangAlias,
        registrationThemes: normalizedThemeConfig.registrationThemes,
        renderThemeOptions: normalizedThemeConfig.renderThemeOptions,
    };
}

/**
 * Builds the low-level highlight executor that directly delegates to Shiki.
 *
 * The returned executor is the innermost step of the highlighting pipeline. Decorators wrap this
 * function to add alias resolution, lazy language loading, trailing-newline trimming, and default
 * transformer injection.
 *
 * @returns Base highlight executor that forwards normalized state into Shiki.
 */
const buildBaseHighlightExecutor =
    (): HighlightExecutor => async (state): Promise<HighlightResult> => {
        const baseOptions = {
            defaultColor: state.options?.defaultColor,
            lang: state.resolvedLang,
            meta: state.options?.meta ? { __raw: state.options.meta } : undefined,
            transformers: state.transformers,
        };

        // Shiki exposes overloads for `theme` and `themes`, so the final option object is
        // assembled dynamically from the normalized theme state.
        const sharedOptions = {
            ...baseOptions,
            ...state.themeOptions,
        } as any;

        if (state.format === "html") {
            return state.highlighter.codeToHtml(state.code, sharedOptions);
        }

        return state.highlighter.codeToHast(state.code, sharedOptions);
    };

/**
 * Composes the decorator pipeline around the base highlight executor.
 *
 * The decorators are applied in a fixed order so each stage can rely on the invariants established
 * by earlier ones.
 *
 * Current pipeline stages:
 *
 * - alias resolution;
 * - language loading;
 * - trailing-newline trimming;
 * - default transformer injection.
 *
 * @returns Fully composed highlight executor.
 */
const buildDecoratorPipeline = () =>
    composeDecorators(buildBaseHighlightExecutor(), [
        withAliasResolution(),
        withLanguageLoading(),
        withTrailingNewlineTrim(),
        withDefaultTransformers(),
    ]);

/**
 * Creates the mutable state object consumed by the decorator pipeline.
 *
 * This function centralizes the construction of per-call highlight state and ensures caller-owned
 * arrays such as `transformers` are copied before any decorator mutates them.
 *
 * @param code Source code to highlight.
 * @param lang Requested language name.
 * @param options Per-call highlighting options.
 * @param format Requested output format.
 * @param highlighter Underlying Shiki highlighter instance.
 * @param config Normalized facade configuration.
 * @returns Mutable highlight state for the decorator pipeline.
 */
function createHighlightState(
    code: string,
    lang: string,
    options: HighlightCallOptions | undefined,
    format: HighlightFormat,
    highlighter: HighlighterInstance,
    config: NormalizedHighlighterConfig,
): HighlightState {
    const requestedLang = normalizeLanguageName(lang);

    return {
        code,
        format,
        highlighter,
        inline: options?.inline ?? false,
        lang: requestedLang,
        resolvedLang: requestedLang,
        langAlias: config.langAlias,
        options,
        themeOptions: config.renderThemeOptions,
        transformers: options?.transformers ? [...options.transformers] : [],
    };
}

/**
 * Creates a patched highlighter facade for an already normalized configuration.
 *
 * This function:
 *
 * - creates the underlying Shiki highlighter;
 * - builds the decorator pipeline;
 * - exposes the public `codeToHtml` and `codeToHast` methods; and
 * - provides explicit disposal with cache coordination.
 *
 * The `isCurrentCacheEntry` callback protects against stale disposal removing a newer cache entry
 * for the same logical key.
 *
 * @param config Canonical highlighter configuration.
 * @param isCurrentCacheEntry Predicate that reports whether this instance still owns its cache
 *   slot.
 * @returns Fully initialized patched highlighter facade.
 */
async function createPatchedHighlighter(
    config: NormalizedHighlighterConfig,
    isCurrentCacheEntry: () => boolean,
): Promise<PatchedHighlighter> {
    const highlighterOptions = {
        langs: config.langs,
        langAlias: config.langAlias,
        themes: config.registrationThemes,
        warnings: false,
    } satisfies Parameters<typeof createHighlighter>[0];

    const highlighter = await runWithDevTransportRetry(
        async (_signal) => await createHighlighter(highlighterOptions),
        {
            label: "patched markdown shiki highlighter creation",
        },
    );

    const decoratorPipeline = buildDecoratorPipeline();
    let disposed = false;

    /**
     * Shared implementation used by both public output methods.
     *
     * @param code Source code to highlight.
     * @param lang Requested language.
     * @param options Per-call highlighting options.
     * @param format Output format.
     * @returns Highlighted output in the requested format.
     */
    async function highlight(
        code: string,
        lang = canonicalPlainTextLang,
        options: HighlightCallOptions | undefined,
        format: HighlightFormat,
    ) {
        const state = createHighlightState(code, lang, options, format, highlighter, config);
        return decoratorPipeline(state);
    }

    return {
        /**
         * Highlights source code to HTML using the patched pipeline.
         *
         * @param code Source code to highlight.
         * @param lang Requested language, defaulting to canonical plain text.
         * @param options Per-call highlighting options.
         * @returns Syntax-highlighted HTML output.
         */
        async codeToHtml(
            code: string,
            lang = canonicalPlainTextLang,
            options: HighlightCallOptions = {},
        ): Promise<HighlightHtmlResult> {
            return highlight(code, lang, options, "html") as Promise<HighlightHtmlResult>;
        },

        /**
         * Highlights source code to HAST using the patched pipeline.
         *
         * @param code Source code to highlight.
         * @param lang Requested language, defaulting to canonical plain text.
         * @param options Per-call highlighting options.
         * @returns Syntax-highlighted HAST output.
         */
        async codeToHast(
            code: string,
            lang = canonicalPlainTextLang,
            options: HighlightCallOptions = {},
        ): Promise<HighlightHastResult> {
            return highlight(code, lang, options, "hast") as Promise<HighlightHastResult>;
        },

        /**
         * Disposes the underlying highlighter and invalidates the cache entry if needed.
         *
         * Disposal is idempotent. The cache is only cleared when this facade still owns the
         * current slot for its cache key, preventing stale instances from deleting newer entries
         * created after a rebuild or retry.
         *
         * @returns Promise that resolves once disposal has completed.
         */
        async dispose() {
            if (disposed) return;
            disposed = true;

            if (isCurrentCacheEntry()) {
                highlighterCache.delete(config.cacheKey);
            }

            highlighter.dispose();
        },
    };
}

/**
 * Returns the cached patched highlighter facade for the given effective configuration.
 *
 * Repeated calls with equivalent normalized options return the same cached promise and therefore
 * the same eventual facade instance, unless that instance has been disposed or initialization
 * failed.
 *
 * Failed initialization clears the matching cache entry so subsequent calls can attempt creation
 * again.
 *
 * @param options Caller-provided highlighter options.
 * @returns Cached or newly created patched highlighter facade.
 */
export async function createShikiHighlighter(
    options: HighlighterOptions = {},
): Promise<PatchedHighlighter> {
    const config = normalizeHighlighterConfig(options);
    const cached = highlighterCache.get(config.cacheKey);

    if (cached) {
        return cached;
    }

    let cacheEntry!: Promise<PatchedHighlighter>;

    cacheEntry = createPatchedHighlighter(
        config,
        () => highlighterCache.get(config.cacheKey) === cacheEntry,
    ).catch((error) => {
        if (highlighterCache.get(config.cacheKey) === cacheEntry) {
            highlighterCache.delete(config.cacheKey);
        }

        throw error;
    });

    highlighterCache.set(config.cacheKey, cacheEntry);
    return cacheEntry;
}
