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

let cachedCssTheme: ReturnType<typeof createCssVariablesTheme> | undefined;

const cssVariablesTheme = () =>
    cachedCssTheme
        ?? (cachedCssTheme = createCssVariablesTheme({
            variablePrefix: "--astro-code-",
        }));

export async function createShikiHighlighter({
    langs = [],
    theme = "github-dark",
    themes = {},
    langAlias = {},
}: HighlighterOptions = {}) {
    const resolvedTheme = theme === "css-variables" ? cssVariablesTheme() : theme;

    const highlighter = await createHighlighter({
        langs: ["plaintext", ...langs],
        langAlias,
        themes: Object.values(themes).length
            ? Object.values(themes)
            : [resolvedTheme],
        warnings: false,
    } as any) as HighlighterInstance;

    const baseHighlight: HighlightExecutor = async ({
        code,
        format,
        lang,
        options,
        themeOptions,
        transformers,
        highlighter: activeHighlighter,
    }) => {
        return activeHighlighter[format === "html" ? "codeToHtml" : "codeToHast"](code, {
            ...themeOptions,
            defaultColor: options?.defaultColor,
            lang,
            meta: options?.meta ? { __raw: options.meta } : undefined,
            transformers,
        } as any);
    };

    const decoratorPipeline = composeDecorators(baseHighlight, [
        withAliasResolution(),
        withLanguageLoading(),
        withTrailingNewlineTrim(),
        withDefaultTransformers(),
    ]);

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
            resolvedLang: lang,
            themeOptions: hasCustomThemes ? { themes } : { theme },
            transformers: options?.transformers ? [...options.transformers] : [],
        } as any;

        return decoratorPipeline(state);
    }

    return {
        codeToHast(code: string, lang: string, options: Record<string, any> = {}) {
            return highlight(code, lang, options, "hast");
        },
        codeToHtml(code: string, lang: string, options: Record<string, any> = {}) {
            return highlight(code, lang, options, "html");
        },
    };
}
