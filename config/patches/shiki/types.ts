import type { createHighlighter } from "shiki";

export type HighlighterInstance = Awaited<ReturnType<typeof import("shiki").createHighlighter>>;

export interface HighlighterOptions {
    langs?: string[];
    theme?: unknown;
    themes?: Record<string, unknown>;
    langAlias?: Record<string, string>;
}

export type HighlightFormat = "html" | "hast";

export interface HighlightState {
    code: string;
    format: HighlightFormat;
    lang: string;
    resolvedLang: string;
    inline: boolean;
    options?: Record<string, any>;
    themeOptions: { theme?: unknown; themes?: Record<string, unknown> };
    transformers: any[];
    highlighter: HighlighterInstance;
    langAlias: Record<string, string>;
}

export type HighlightExecutor = (state: HighlightState) => Promise<any>;
export type HighlightDecorator = (next: HighlightExecutor) => HighlightExecutor;
