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
    if (isPlainTextLanguage(language)) {
        return { kind: "plain-text" };
    }

    // Resolve the language to a bundled name
    const { resolvedLang } = resolveShikiLanguage(language);

    if (!resolvedLang) {
        return { kind: "unknown-language", language };
    }

    // Check if already loaded
    if (highlighter.getLoadedLanguages().includes(resolvedLang)) {
        return { kind: "loaded" };
    }

    // Attempt to load
    try {
        await loadLanguage(resolvedLang);
        return { kind: "loaded" };
    } catch (error) {
        return { kind: "load-failed", language, error };
    }
}
