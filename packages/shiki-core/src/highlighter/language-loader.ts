/**
 * Language lifecycle management for Shiki.
 *
 * Handles language alias normalization, loaded-language tracking,
 * and fallback rendering when languages can't be loaded.
 */

import type { BundledLanguage, Highlighter } from "shiki";
import { resolveShikiLanguage } from "../languages/resolution";
import type { LanguageLoadResult } from "./types";

const plainTextLanguages = new Set(["text", "txt", "plain", "plaintext"]);

const isPlainTextLanguage = (language: string): boolean => plainTextLanguages.has(language.trim().toLowerCase());

export type ResolvedLanguageLoadRequest =
    | { readonly kind: "plain-text" }
    | { readonly kind: "unknown-language"; readonly language: string }
    | { readonly kind: "loadable"; readonly language: BundledLanguage };

export function resolveLoadableLanguage(language: string): ResolvedLanguageLoadRequest {
    const normalizedLanguage = language.trim();

    if (isPlainTextLanguage(normalizedLanguage)) {
        return { kind: "plain-text" };
    }

    const { resolvedLang } = resolveShikiLanguage(normalizedLanguage);

    if (!resolvedLang) {
        return { kind: "unknown-language", language };
    }

    return { kind: "loadable", language: resolvedLang };
}

/**
 * Ensures a language is loaded in the highlighter.
 *
 * Handles special cases (like "text"), normalizes aliases,
 * checks if already loaded, and returns a result indicating success or failure.
 */
export async function ensureLanguageLoaded(
    highlighter: Highlighter,
    language: string,
    loadLanguage: (lang: BundledLanguage) => Promise<void>,
): Promise<LanguageLoadResult> {
    const request = resolveLoadableLanguage(language);

    if (request.kind !== "loadable") {
        return request;
    }

    // Check if already loaded
    if (highlighter.getLoadedLanguages().includes(request.language)) {
        return { kind: "loaded" };
    }

    // Attempt to load
    try {
        await loadLanguage(request.language);
        return { kind: "loaded" };
    } catch (error) {
        return { kind: "load-failed", language, error };
    }
}
