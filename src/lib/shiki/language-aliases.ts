/*
 * Centralized mapping of common language short-hands and aliases to the names that Shiki bundles. This keeps the rest
 * of the codebase free from ad-hoc string checks and provides a single place to add new mappings
 * (for example: `nu` -> `nushell`).
 *
 * Exports:
 * - `languageAliases`: raw alias map
 * - `availableLanguages`: compact array of actual bundled languages used
 * - `resolveLanguage(lang)`: helper that returns { resolvedLang, shouldWarn }
 */
import { bundledLanguages } from "shiki";
import type { BundledLanguage } from "shiki";

export const languageAliases: Record<string, BundledLanguage | null> = {
    bash: "bash",
    c: "c",
    javascript: "javascript",
    json: "json",
    kotlin: "kotlin",
    markdown: "markdown",
    md: "markdown",
    powershell: "powershell",
    nushell: "nushell",
    nu: "nushell",
    python: "python",
    py: "python",
    rust: "rust",
    scala: "scala",
    shell: "shell",
    sh: "bash",
    plaintext: null,
};

export const availableLanguages = Array.from(
    new Set(
        Object.values(languageAliases).filter((lang): lang is BundledLanguage => lang !== null),
    ),
);

/**
 * Resolve a user-provided language identifier to a Shiki bundled language.
 *
 * Returns:
 * - resolvedLang: the BundledLanguage name if known, otherwise null.
 * - shouldWarn: whether callers should emit a warning when the language is unknown. We don't warn when the input
 *   matches a known alias that maps to `null` (explicitly treated as plaintext), but we do warn for totally
 *   unrecognized names.
 */
export function resolveLanguage(
    lang: string,
): { resolvedLang: BundledLanguage | null; shouldWarn: boolean } {
    const lower = lang.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(languageAliases, lower)) {
        const alias = languageAliases[lower];
        if (alias) {
            return { resolvedLang: alias, shouldWarn: false };
        }
        return { resolvedLang: null, shouldWarn: false };
    }
    if (lower in bundledLanguages) {
        return { resolvedLang: lower as BundledLanguage, shouldWarn: false };
    }
    return { resolvedLang: null, shouldWarn: true };
}
