import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetHighlighterCacheForTests, __setHighlighterInstanceForTests } from "./cache";
import { highlightToHtml } from "./highlighter";

const theme = "catppuccin-latte";

describe("highlightToHtml", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders highlighted html for bundled language aliases", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const html = await highlightToHtml({
            code: "print('hi')",
            lang: "py",
            theme,
        });

        expect(html).toContain("<pre class=\"shiki");
        expect(stripHtml(html)).toContain("print('hi')");
        expect(warn).not.toHaveBeenCalled();
    });

    it("falls back to plain html and warns once for unknown languages", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const options = {
            code: "echo hello",
            lang: "unknown-lang",
            theme,
        } as const;

        const first = await highlightToHtml(options);
        const second = await highlightToHtml(options);

        expect(first).toContain("<pre class=\"shiki");
        expect(first).toContain("echo hello");
        expect(second).toBe(first);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it("loads languages on-demand and falls back when loading fails", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const loadError = new Error("boom");

        __resetHighlighterCacheForTests();

        const mockHighlighter = {
            getLoadedLanguages: () => [] as string[],
            loadLanguage: vi.fn(async () => {
                throw loadError;
            }),
            codeToHtml: vi.fn(),
        };

        __setHighlighterInstanceForTests(mockHighlighter as never);

        const html = await highlightToHtml({
            code: "echo hi",
            lang: "bash",
            theme,
        });

        expect(mockHighlighter.codeToHtml).not.toHaveBeenCalled();
        expect(stripHtml(html)).toContain("echo hi");
        expect(html).toContain("<pre class=\"shiki");
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("language \"bash\" could not be loaded"),
            loadError,
        );

        __resetHighlighterCacheForTests();
    });
});

function stripHtml(value: string) {
    return value.replace(/<[^>]*>/g, "");
}
