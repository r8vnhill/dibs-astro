import type { Highlighter } from "shiki";
import { describe, expect, test, vi } from "vitest";
import { ensureLanguageLoaded, resolveLoadableLanguage } from "../src/highlighter/language-loader";

const createHighlighter = (loadedLanguages: string[] = []): Pick<Highlighter, "getLoadedLanguages"> => ({
    getLoadedLanguages: vi.fn(() => loadedLanguages),
});

describe("resolveLoadableLanguage", () => {
    test.each([
        ["ts", "typescript"],
        ["py", "python"],
        [" ts ", "typescript"],
        ["kotlin", "kotlin"],
    ])("resolves %s to canonical %s", (input, expected) => {
        expect(resolveLoadableLanguage(input)).toEqual({
            kind: "loadable",
            language: expected,
        });
    });

    test.each([
        "text",
        "txt",
        "plain",
        "plaintext",
        "Text",
        "TXT",
        "Plain",
        "PlainText",
        " text ",
        "\ttxt\n",
        " plain ",
        "\r\nplaintext\t",
    ])("classifies %s as plain text", (language) => {
        expect(resolveLoadableLanguage(language)).toEqual({ kind: "plain-text" });
    });

    test.each([
        "midnight-mission",
        " hunter-moon-lang ",
    ])("preserves original unknown input %s", (language) => {
        expect(resolveLoadableLanguage(language)).toEqual({
            kind: "unknown-language",
            language,
        });
    });
});

describe("ensureLanguageLoaded plain-text normalization", () => {
    test.each([
        "text",
        "txt",
        "plain",
        "plaintext",
        "Text",
        "TXT",
        "Plain",
        "PlainText",
        " text ",
        "\ttxt\n",
        " plain ",
        "\r\nplaintext\t",
    ])("treats %s as plain text", async (language) => {
        const highlighter = createHighlighter();
        const loadLanguage = vi.fn();

        const result = await ensureLanguageLoaded(highlighter, language, loadLanguage);

        expect(result).toEqual({ kind: "plain-text" });
        expect(loadLanguage).not.toHaveBeenCalled();
    });

    test("returns unknown-language for unresolved non-plain-text input", async () => {
        const highlighter = createHighlighter();
        const loadLanguage = vi.fn();

        const result = await ensureLanguageLoaded(highlighter, "khonshu-script", loadLanguage);

        expect(result).toEqual({
            kind: "unknown-language",
            language: "khonshu-script",
        });
        expect(loadLanguage).not.toHaveBeenCalled();
    });

    test("loads aliases through their canonical bundled language", async () => {
        const highlighter = createHighlighter();
        const loadLanguage = vi.fn().mockResolvedValue(undefined);

        const result = await ensureLanguageLoaded(highlighter, "ts", loadLanguage);

        expect(result).toEqual({ kind: "loaded", language: "typescript" });
        expect(loadLanguage).toHaveBeenCalledExactlyOnceWith("typescript");
    });

    test("returns canonical language when an alias is already loaded", async () => {
        const highlighter = createHighlighter(["typescript"]);
        const loadLanguage = vi.fn();

        const result = await ensureLanguageLoaded(highlighter, "ts", loadLanguage);

        expect(result).toEqual({ kind: "loaded", language: "typescript" });
        expect(loadLanguage).not.toHaveBeenCalled();
    });

    test("returns canonical language even on failed load", async () => {
        const highlighter = createHighlighter();
        const error = new Error("Shadow Cabinet load failed");

        const result = await ensureLanguageLoaded(highlighter, "ts", async () => {
            throw error;
        });

        expect(result).toEqual({
            kind: "load-failed",
            language: "typescript",
            error,
        });
    });
});
