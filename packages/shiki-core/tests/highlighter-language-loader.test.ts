import type { Highlighter } from "shiki";
import { describe, expect, it, vi } from "vitest";
import { ensureLanguageLoaded, resolveLoadableLanguage } from "../src/highlighter/language-loader";

function createHighlighter(loadedLanguages: string[] = []): Pick<Highlighter, "getLoadedLanguages"> {
    return {
        getLoadedLanguages: vi.fn(() => loadedLanguages),
    };
}

describe("resolveLoadableLanguage", () => {
    it.each([
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

    it.each([
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

    it.each([
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
    it.each([
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

        const result = await ensureLanguageLoaded(
            highlighter as Highlighter,
            language,
            loadLanguage,
        );

        expect(result).toEqual({ kind: "plain-text" });
        expect(loadLanguage).not.toHaveBeenCalled();
    });

    it("returns unknown-language for unresolved non-plain-text input", async () => {
        const highlighter = createHighlighter();
        const loadLanguage = vi.fn();

        const result = await ensureLanguageLoaded(
            highlighter as Highlighter,
            "khonshu-script",
            loadLanguage,
        );

        expect(result).toEqual({
            kind: "unknown-language",
            language: "khonshu-script",
        });
        expect(loadLanguage).not.toHaveBeenCalled();
    });

    it("loads aliases through their canonical bundled language", async () => {
        const highlighter = createHighlighter();
        const loadLanguage = vi.fn().mockResolvedValue(undefined);

        const result = await ensureLanguageLoaded(
            highlighter as Highlighter,
            "ts",
            loadLanguage,
        );

        expect(result).toEqual({ kind: "loaded", language: "typescript" });
        expect(loadLanguage).toHaveBeenCalledExactlyOnceWith("typescript");
    });

    it("returns canonical language when an alias is already loaded", async () => {
        const highlighter = createHighlighter(["typescript"]);
        const loadLanguage = vi.fn();

        const result = await ensureLanguageLoaded(
            highlighter as Highlighter,
            "ts",
            loadLanguage,
        );

        expect(result).toEqual({ kind: "loaded", language: "typescript" });
        expect(loadLanguage).not.toHaveBeenCalled();
    });

    it("returns canonical language even on failed load", async () => {
        const highlighter = createHighlighter();
        const error = new Error("Shadow Cabinet load failed");

        const result = await ensureLanguageLoaded(
            highlighter as Highlighter,
            "ts",
            async () => {
                throw error;
            },
        );

        expect(result).toEqual({
            kind: "load-failed",
            language: "typescript",
            error,
        });
    });
});
