import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetHighlighterCacheForTests, __setHighlighterForTests } from "../cache";
import { highlightToHtml } from "../highlighter";

const theme = "catppuccin-latte";

describe("highlightToHtml", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.DIBS_DEV_RETRY_ENABLED;
        __resetHighlighterCacheForTests();
    });

    // Skip this test in CI: Shiki highlighter initialization times out at 1500ms in
    // dev-transport-retry on resource-constrained runners (e.g., Raspberry Pi with 906 MiB RAM).
    // Runs locally for full coverage during development.
    it.skipIf(process.env.CI)("renders highlighted html for bundled language aliases", async () => {
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
        const rejectedHighlighter = Promise.reject(new Error("highlighter should not be needed"));
        rejectedHighlighter.catch(() => {});
        __setHighlighterForTests(rejectedHighlighter as never);

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

        __setHighlighterForTests(mockHighlighter as never);

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
    });

    it("retries transient timeout failures when loading a language in development", async () => {
        process.env.DIBS_DEV_RETRY_ENABLED = "true";

        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        let loadAttempts = 0;

        const mockHighlighter = {
            getLoadedLanguages: () => [] as string[],
            loadLanguage: vi.fn(async () => {
                loadAttempts += 1;
                if (loadAttempts === 1) {
                    const error = new Error("fetchModule timed out during vite:invoke") as Error & {
                        code?: string;
                    };
                    error.code = "ETIMEDOUT";
                    throw error;
                }
            }),
            codeToHtml: vi.fn(() => "<pre class=\"shiki\"><code>echo hi</code></pre>"),
        };

        __setHighlighterForTests(mockHighlighter as never);

        const html = await highlightToHtml({
            code: "echo hi",
            lang: "bash",
            theme,
        });

        expect(html).toContain("echo hi");
        expect(mockHighlighter.loadLanguage).toHaveBeenCalledTimes(2);
        expect(mockHighlighter.codeToHtml).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0]?.[0] ?? "")).toContain("[dev-retry]");
    });

    it("does not require dev-retry bootstrap for bundled language aliases under Vitest defaults", async () => {
        delete process.env.DIBS_DEV_RETRY_ENABLED;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const html = await highlightToHtml({
            code: "print('hi')",
            lang: "py",
            theme,
        });

        expect(html).toContain("<pre class=\"shiki");
        expect(stripHtml(html)).toContain("print('hi')");
        expect(
            warn.mock.calls.some(([message]) => String(message ?? "").includes("shared shiki highlighter creation")),
        ).toBe(false);
    });

    it("renders text language directly without language loading", async () => {
        const mockHighlighter = {
            getLoadedLanguages: vi.fn(() => [] as string[]),
            loadLanguage: vi.fn(),
            codeToHtml: vi.fn((code) => `<pre><code>${code}</code></pre>`),
        };

        __setHighlighterForTests(mockHighlighter as never);

        const html = await highlightToHtml({
            code: "plain text here",
            lang: "text",
            theme,
        });

        expect(mockHighlighter.loadLanguage).not.toHaveBeenCalled();
        expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
            "plain text here",
            expect.objectContaining({ lang: "text" }),
        );
        expect(html).toContain("plain text here");
    });

    it("does not reload already-loaded languages", async () => {
        const mockHighlighter = {
            getLoadedLanguages: vi.fn(() => ["python"]),
            loadLanguage: vi.fn(),
            codeToHtml: vi.fn(() => "<pre class=\"shiki\"><code>loaded</code></pre>"),
        };

        __setHighlighterForTests(mockHighlighter as never);

        await highlightToHtml({
            code: "print('hi')",
            lang: "py",
            theme,
        });

        expect(mockHighlighter.loadLanguage).not.toHaveBeenCalled();
        expect(mockHighlighter.codeToHtml).toHaveBeenCalled();
    });

    it("passes transformers through to highlighter.codeToHtml", async () => {
        const mockTransformer = { name: "test-transformer" };
        const mockHighlighter = {
            getLoadedLanguages: () => ["python"],
            loadLanguage: vi.fn(),
            codeToHtml: vi.fn(() => "<pre class=\"shiki\"><code>transformed</code></pre>"),
        };

        __setHighlighterForTests(mockHighlighter as never);

        await highlightToHtml({
            code: "code",
            lang: "py",
            theme,
            transformers: [mockTransformer as any],
        });

        expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
            "code",
            expect.objectContaining({
                transformers: [mockTransformer],
            }),
        );
    });
});

function stripHtml(value: string) {
    return value.replace(/<[^>]*>/g, "");
}
