/*
 * Lightweight, local type definitions used by the Shiki highlight pipeline modules in `config/patches/shiki/`.
 *
 * These types are intentionally compact and only describe the surface area required by the decorator pipeline and
 * factory. They are not intended to be a full mapping of the Shiki runtime API.
 */

// The concrete highlighter type returned by shiki.createHighlighter(). We capture it as a single alias so the rest of
// the codebase can reference Shiki's instance without importing `shiki` directly in many places.
export type HighlighterInstance = Awaited<ReturnType<typeof import("shiki").createHighlighter>>;

// Options supported by the highlighter factory. Keep the shape minimal so callers can pass either a theme name or a
// custom themes map.
export interface HighlighterOptions {
    // additional languages to pre-load
    langs?: string[];
    // a single theme (string or theme object). The factory accepts either a theme name (e.g. 'github-dark') or a
    // CSS-variables theme object.
    theme?: unknown;
    // optional map of named themes; when provided the factory exposes them via `themeOptions` so callers can pick among
    // multiple themes.
    themes?: Record<string, unknown>;
    // map of language aliases, e.g. { ts: 'typescript' }
    langAlias?: Record<string, string>;
}

// Supported output formats from the highlighting pipeline. "hast" means a Hypertext Abstract Syntax Tree (used by
// remark/rehype stacks).
export type HighlightFormat = "html" | "hast";

// State object passed through the decorator pipeline. Decorators and transformers may read and mutate parts of this
// object (for example `resolvedLang` or `transformers`). Keep fields permissive where the pipeline requires
// flexibility.
export interface HighlightState {
    code: string; // source code to highlight
    format: HighlightFormat; // desired output format
    lang: string; // requested language (may be an alias)
    resolvedLang: string; // language after alias resolution
    inline: boolean; // whether the code block should be treated as inline
    options?: Record<string, any>; // optional caller-provided options/meta
    // either { theme } or { themes } depending on what the factory was invoked with; transformers and the executor read
    // from this field.
    themeOptions: { theme?: unknown; themes?: Record<string, unknown> };
    // transformer functions applied after Shiki produces HTML/HAST. The pipeline prepends a default transformer and
    // then appends user-supplied ones.
    transformers: any[];
    // the Shiki highlighter instance used to perform language-specific highlighting
    highlighter: HighlighterInstance;
    // language alias map (copied from factory options)
    langAlias: Record<string, string>;
}

// An executor receives the mutable state and must return the highlighted output (format depends on `state.format`). A
// decorator wraps an executor to provide additional behaviour.
export type HighlightExecutor = (state: HighlightState) => Promise<any>;
export type HighlightDecorator = (next: HighlightExecutor) => HighlightExecutor;
