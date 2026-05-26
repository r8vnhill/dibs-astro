import type { Highlighter } from "shiki";
import { describe, expect, it, vi } from "vitest";
import { ensureLanguageLoaded } from "../src/highlighter/language-loader";

function createHighlighter(loadedLanguages: string[] = []): Pick<Highlighter, "getLoadedLanguages"> {
    return {
        getLoadedLanguages: vi.fn(() => loadedLanguages),
    };
}

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
});
