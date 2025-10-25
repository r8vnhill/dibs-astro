/*
 * Small factory that creates a Shiki highlighter instance and exposes a compact API for converting code to HTML or
 * HAST. This module centralizes theme resolution, language loading and a small decorator pipeline used by the
 * markdown/shiki integration.
 *
 * Contract (inputs/outputs):
 * - Input: HighlighterOptions (langs, theme, themes, langAlias)
 * - Output: { codeToHtml, codeToHast } — both async functions that accept (code, lang, options) and return highlighted
 *   output.
 *
 * Notes:
 * - The default theme is `github-dark`. If `theme === 'css-variables'` we build a CSS-variables-based theme once and
 *   reuse it (cached).
 * - We include `plaintext` in the languages list to ensure a fallback.
 * - The returned highlighter uses a small decorator pipeline (see `decorators.ts`) to handle alias resolution, lazy
 *   language loading, trailing newline trimming and default transformer injection.
 */

import { createCssVariablesTheme, createHighlighter } from "shiki";
import {
    composeDecorators,
    withAliasResolution,
    withDefaultTransformers,
    withLanguageLoading,
    withTrailingNewlineTrim,
} from "./decorators";
import type { HighlighterOptions, HighlightExecutor } from "./types";
import type { HighlighterInstance } from "./types";

// Cache the generated CSS variables theme so we don't rebuild it on every call.
let cachedCssTheme: ReturnType<typeof createCssVariablesTheme> | undefined;

const cssVariablesTheme = () =>
    cachedCssTheme
        ?? (cachedCssTheme = createCssVariablesTheme({
            // Prefix CSS custom properties so they don't collide with other variables.
            variablePrefix: "--astro-code-",
        }));

export async function createShikiHighlighter({
    langs = [],
    theme = "github-dark",
    themes = {},
    langAlias = {},
}: HighlighterOptions = {}) {
    // Resolve theme: if caller asks for CSS variables theme, use the cached
    // generator above; otherwise keep the theme string/name as provided.
    const resolvedTheme = theme === "css-variables" ? cssVariablesTheme() : theme;

    // Create the underlying Shiki highlighter. We always include `plaintext`
    // so there's a safe fallback language available.
    const highlighter = await createHighlighter({
        langs: ["plaintext", ...langs],
        langAlias,
        themes: Object.values(themes).length
            ? Object.values(themes)
            : [resolvedTheme],
        warnings: false,
    } as any) as HighlighterInstance;

    // Base executor that simply forwards to Shiki's `codeToHtml` or
    // `codeToHast` depending on the requested format.
    const baseHighlight: HighlightExecutor = async ({
        code,
        format,
        lang,
        options,
        themeOptions,
        transformers,
        highlighter: activeHighlighter,
    }) => {
        // Shiki highlighter offers codeToHtml and codeToHast; pick the
        // correct method and pass through relevant options.
        return activeHighlighter[format === "html" ? "codeToHtml" : "codeToHast"](code, {
            ...themeOptions,
            defaultColor: options?.defaultColor,
            lang,
            // Preserve raw meta (if present) so transformer layers can read it.
            meta: options?.meta ? { __raw: options.meta } : undefined,
            transformers,
        } as any);
    };

    // Compose a small decorator pipeline. Decorators wrap the base executor
    // and add convenient behaviour: alias resolution, on-demand language
    // loading, trimming trailing newlines and injecting default
    // transformers.
    const decoratorPipeline = composeDecorators(baseHighlight, [
        withAliasResolution(),
        withLanguageLoading(),
        withTrailingNewlineTrim(),
        withDefaultTransformers(),
    ]);

    // Internal highlight helper used by the public API. It builds the state
    // object expected by the decorator pipeline then invokes it.
    async function highlight(
        code: string,
        lang = "plaintext",
        options: Record<string, any> | undefined,
        format: "html" | "hast",
    ) {
        const inline = options?.inline ?? false;
        const hasCustomThemes = Object.values(themes).length > 0;

        const state = {
            code,
            format,
            highlighter,
            inline,
            lang,
            langAlias,
            options,
            // resolvedLang is the current language after alias resolution
            // (decorators may update this field).
            resolvedLang: lang,
            // If caller provided a `themes` map, expose it via themeOptions,
            // otherwise pass the single `theme` string/name.
            themeOptions: hasCustomThemes ? { themes } : { theme },
            // Copy transformers array so decorators can mutate it safely.
            transformers: options?.transformers ? [...options.transformers] : [],
        } as any;

        return decoratorPipeline(state);
    }

    // Public API: small helpers for the two supported output formats.
    return {
        codeToHast(code: string, lang: string, options: Record<string, any> = {}) {
            return highlight(code, lang, options, "hast");
        },
        codeToHtml(code: string, lang: string, options: Record<string, any> = {}) {
            return highlight(code, lang, options, "html");
        },
    };
}
