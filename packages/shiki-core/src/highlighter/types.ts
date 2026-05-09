/**
 * Internal type definitions for highlighter orchestration.
 */

import type { Highlighter, ShikiTransformer } from "shiki";

/**
 * Result from language loading operations.
 */
export type LanguageLoadResult =
    | { readonly kind: "loaded" }
    | { readonly kind: "plain-text" }
    | { readonly kind: "unknown-language"; readonly language: string }
    | { readonly kind: "load-failed"; readonly language: string; readonly error: unknown };

/**
 * Retry context passed to retry operations.
 */
export interface ShikiRetryContext {
    readonly operation: "create-highlighter" | "load-language";
    readonly language?: string;
}

/**
 * Retry function type for wrapping async operations.
 */
export type ShikiRetry = <T>(
    operation: () => Promise<T>,
    context: ShikiRetryContext,
) => Promise<T>;

/**
 * Options for creating a Shiki highlighter service.
 */
export interface ShikiHighlighterServiceOptions {
    readonly retry?: ShikiRetry;
    readonly warn?: (message: string) => void;
    readonly defaultTheme?: string;
    readonly initialLanguages?: readonly string[];
}

/**
 * Options for highlighting code.
 */
export interface HighlightToHtmlOptions {
    readonly code: string;
    readonly language: string;
    readonly theme?: string;
    readonly meta?: string;
    readonly transformers?: readonly ShikiTransformer[];
}

/**
 * Public service interface for highlighting operations.
 */
export interface ShikiHighlighterService {
    readonly getHighlighter: () => Promise<Highlighter>;
    readonly highlightToHtml: (options: HighlightToHtmlOptions) => Promise<string>;
}

/**
 * Internal promise-backed store for sharing a value across the process.
 */
export interface Store<T> {
    /**
     * Retrieves the stored value, creating it lazily if needed.
     */
    get(): Promise<T>;

    /**
     * Clears the cached promise, allowing a fresh creation on the next get.
     */
    reset(): void;

    /**
     * Overrides the cached value for tests.
     */
    setForTests(value: Promise<T> | T | null): void;
}
