import type { Highlighter, ShikiTransformer } from "shiki";

/*
 * Focused types for the patched markdown Shiki wrapper.
 *
 * These types intentionally model only the subset of the Shiki API used by the
 * local factory and decorator pipeline.
 */

export type HighlighterInstance = Highlighter;
export type HighlighterTheme = Exclude<
    Parameters<typeof import("shiki").createHighlighter>[0]["themes"],
    undefined
>[number];
export type HighlighterThemeMap = Record<string, HighlighterTheme>;
export type HighlighterThemeRenderOptions =
    | { theme: HighlighterTheme | "css-variables" }
    | { themes: HighlighterThemeMap };

export interface HighlightCallOptions {
    inline?: boolean;
    defaultColor?: boolean | string;
    meta?: string;
    transformers?: ShikiTransformer[];
    attributes?: Record<string, unknown>;
    wrap?: boolean;
}

export interface HighlighterOptions {
    langs?: string[];
    theme?: HighlighterTheme | "css-variables";
    themes?: HighlighterThemeMap;
    langAlias?: Record<string, string>;
}

export interface NormalizedHighlighterConfig {
    cacheKey: string;
    langs: string[];
    langAlias: Record<string, string>;
    registrationThemes: HighlighterTheme[];
    renderThemeOptions: HighlighterThemeRenderOptions;
}

export type HighlightFormat = "html" | "hast";
export type HighlightHtmlResult = Awaited<ReturnType<HighlighterInstance["codeToHtml"]>>;
export type HighlightHastResult = Awaited<ReturnType<HighlighterInstance["codeToHast"]>>;
export type HighlightResult = HighlightHtmlResult | HighlightHastResult;

export interface HighlightState {
    code: string;
    format: HighlightFormat;
    highlighter: HighlighterInstance;
    inline: boolean;
    lang: string;
    resolvedLang: string;
    langAlias: Record<string, string>;
    options?: HighlightCallOptions;
    themeOptions: HighlighterThemeRenderOptions;
    transformers: ShikiTransformer[];
}

export type HighlightExecutor = (state: HighlightState) => Promise<HighlightResult>;
export type HighlightDecorator = (next: HighlightExecutor) => HighlightExecutor;

export interface PatchedHighlighter {
    codeToHtml(
        code: string,
        lang?: string,
        options?: HighlightCallOptions,
    ): Promise<HighlightHtmlResult>;
    codeToHast(
        code: string,
        lang?: string,
        options?: HighlightCallOptions,
    ): Promise<HighlightHastResult>;
    dispose(): Promise<void>;
}
