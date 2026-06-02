/**
 * Centralized mapping of common language short-hands and aliases to the names that Shiki bundles.
 *
 * This keeps the rest of the codebase free from ad-hoc string checks and provides a single place
 * to add new mappings (for example: `nu` -> `nushell`).
 */

import type { BundledLanguage } from "shiki";

/**
 * Map of user-friendly language aliases to canonical Shiki bundled language names.
 *
 * Entries that map to `null` are explicitly treated as plaintext (e.g., `plaintext`).
 */
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
    ts: "typescript",
    plaintext: null,
};

/**
 * Checks if a given string is a recognized language alias.
 *
 * @param lang the language identifier to check
 * @returns true if the identifier is a known alias, false otherwise
 */
export function isKnownShikiAlias(lang: string): boolean {
    const lower = lang.toLowerCase();
    return Object.prototype.hasOwnProperty.call(languageAliases, lower);
}
