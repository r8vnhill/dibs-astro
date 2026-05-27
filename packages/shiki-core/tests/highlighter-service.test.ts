/**
 * Tests for @ravenhill/shiki-core highlighter service orchestration.
 *
 * Covers service creation, language loading, fallback rendering,
 * and global cache synchronization.
 */

import type { Highlighter } from "shiki";
import { beforeEach, describe, expect, suite, test, vi } from "vitest";
import {
    __resetShikiWarningsForTests,
    createShikiHighlighterService,
    getShikiHighlighter,
} from "../src/highlighter/service";

function createMockHighlighter(): Highlighter {
    return {
        getLoadedLanguages: vi.fn(() => []),
        loadLanguage: vi.fn(async () => {}),
        codeToHtml: vi.fn((code, options) => {
            const lang = (options as { lang?: string }).lang ?? "unknown";
            return `<pre data-lang="${lang}"><code>${code}</code></pre>`;
        }),
    } as any;
}

function cacheHighlighterForService(highlighter: Highlighter): void {
    const globalCache = globalThis as any;
    globalCache.__dibsShikiHighlighterPromise = Promise.resolve(highlighter);
}

suite("given a Shiki highlighter service", () => {
    beforeEach(() => {
        const globalCache = globalThis as any;
        delete globalCache.__dibsShikiHighlighterPromise;
        __resetShikiWarningsForTests();
    });

    test("then it provides getHighlighter and highlightToHtml", () => {
        // Arrange
        const service = createShikiHighlighterService();

        // Act / Assert
        expect(service.getHighlighter).toBeDefined();
        expect(service.highlightToHtml).toBeDefined();
        expect(typeof service.getHighlighter).toBe("function");
        expect(typeof service.highlightToHtml).toBe("function");
    });

    test("then it lazily creates one highlighter on first getHighlighter call", async () => {
        // Arrange
        const service = createShikiHighlighterService();

        // Act
        const highlighter1 = await service.getHighlighter();
        const highlighter2 = await service.getHighlighter();

        // Assert
        expect(highlighter1).toBe(highlighter2);
    });

    describe("when rendering a language alias", () => {
        test("then it renders with the canonical loaded language", async () => {
            // Arrange
            const mockHighlighter = createMockHighlighter();
            cacheHighlighterForService(mockHighlighter);
            const service = createShikiHighlighterService();

            // Act
            const html = await service.highlightToHtml({
                code: "const moon = 'Khonshu';",
                language: "ts",
            });

            // Assert
            expect(mockHighlighter.loadLanguage).toHaveBeenCalledExactlyOnceWith("typescript");
            expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
                "const moon = 'Khonshu';",
                expect.objectContaining({ lang: "typescript" }),
            );
            expect(html).toContain('data-lang="typescript"');
        });
    });

    describe("when rendering plain-text aliases", () => {
        test.each(["text", "txt", "plain", "plaintext"])(
            "then %s renders through Shiki text without loading a language",
            async (language) => {
                // Arrange
                const mockHighlighter = createMockHighlighter();
                cacheHighlighterForService(mockHighlighter);
                const service = createShikiHighlighterService();

                // Act
                const html = await service.highlightToHtml({
                    code: "plain text",
                    language,
                });

                // Assert
                expect(mockHighlighter.loadLanguage).not.toHaveBeenCalled();
                expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
                    "plain text",
                    expect.objectContaining({ lang: "text" }),
                );
                expect(html).toContain('data-lang="text"');
            },
        );
    });

    describe("when loading a configured language", () => {
        test("then it wraps language loading with the configured retry function", async () => {
            // Arrange
            const mockHighlighter = createMockHighlighter();
            const retryFn = vi.fn((op) => op());
            cacheHighlighterForService(mockHighlighter);
            const service = createShikiHighlighterService({ retry: retryFn });

            // Act
            await service.highlightToHtml({
                code: "code",
                language: "javascript",
            });

            // Assert
            expect(retryFn).toHaveBeenCalledWith(expect.any(Function), {
                operation: "load-language",
                language: "javascript",
            });
        });
    });

    describe("when rendering unknown languages", () => {
        test("then it returns fallback HTML without loading a language", async () => {
            // Arrange
            const mockHighlighter = createMockHighlighter();
            const warnFn = vi.fn();
            cacheHighlighterForService(mockHighlighter);
            const service = createShikiHighlighterService({ warn: warnFn });

            // Act
            const html = await service.highlightToHtml({
                code: "some code",
                language: "unknown-lang-xyz",
            });

            // Assert
            expect(html).toContain("some code");
            expect(html).toContain('class="shiki"');
            expect(mockHighlighter.loadLanguage).not.toHaveBeenCalled();
            expect(mockHighlighter.codeToHtml).not.toHaveBeenCalled();
            expect(warnFn).toHaveBeenCalledWith(expect.stringContaining("not recognized"));
        });

        test("then it warns only once per unknown language", async () => {
            // Arrange
            const mockHighlighter = createMockHighlighter();
            const warnFn = vi.fn();
            cacheHighlighterForService(mockHighlighter);
            const service = createShikiHighlighterService({ warn: warnFn });

            // Act
            await service.highlightToHtml({
                code: "code1",
                language: "unknown-xyz",
            });

            await service.highlightToHtml({
                code: "code2",
                language: "unknown-xyz",
            });

            // Assert
            expect(warnFn).toHaveBeenCalledTimes(1);
        });
    });

    describe("when language loading fails", () => {
        test("then it returns fallback HTML and warns", async () => {
            // Arrange
            const mockHighlighter = createMockHighlighter();
            mockHighlighter.loadLanguage = vi.fn(async () => {
                throw new Error("Network failure");
            });
            const warnFn = vi.fn();
            cacheHighlighterForService(mockHighlighter);
            const service = createShikiHighlighterService({ warn: warnFn });

            // Act
            const html = await service.highlightToHtml({
                code: "code",
                language: "py",
            });

            // Assert
            expect(mockHighlighter.loadLanguage).toHaveBeenCalledExactlyOnceWith("python");
            expect(mockHighlighter.codeToHtml).not.toHaveBeenCalled();
            expect(html).toContain("code");
            expect(html).toContain('class="shiki"');
            expect(warnFn).toHaveBeenCalledWith(expect.stringContaining("could not be loaded"));
        });
    });

    describe("when rendering with extra options", () => {
        test("then it passes transformers through to the highlighter", async () => {
            // Arrange
            const mockHighlighter = createMockHighlighter();
            mockHighlighter.getLoadedLanguages = vi.fn(() => ["python"]);
            cacheHighlighterForService(mockHighlighter);
            const service = createShikiHighlighterService();
            const mockTransformer = { name: "test" };

            // Act
            await service.highlightToHtml({
                code: "code",
                language: "python",
                transformers: [mockTransformer as any],
            });

            // Assert
            expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
                "code",
                expect.objectContaining({
                    transformers: [mockTransformer],
                }),
            );
        });

        test("then it uses the provided theme or falls back to the default", async () => {
            // Arrange
            const mockHighlighter = createMockHighlighter();
            mockHighlighter.getLoadedLanguages = vi.fn(() => ["javascript"]);
            const codeToHtmlMock = mockHighlighter.codeToHtml as ReturnType<typeof vi.fn>;
            cacheHighlighterForService(mockHighlighter);
            const service = createShikiHighlighterService({
                defaultTheme: "catppuccin-latte",
            });

            // Act
            await service.highlightToHtml({
                code: "code",
                language: "javascript",
                theme: "catppuccin-mocha",
            });

            // Assert
            expect(codeToHtmlMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ theme: "catppuccin-mocha" }),
            );

            // Act
            codeToHtmlMock.mockClear();
            await service.highlightToHtml({
                code: "code",
                language: "javascript",
            });

            // Assert
            expect(codeToHtmlMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ theme: "catppuccin-latte" }),
            );
        });
    });

    test("then it synchronizes the highlighter with the global cache", async () => {
        // Arrange
        const globalCache = globalThis as any;
        delete globalCache.__dibsShikiHighlighterPromise;
        const service = createShikiHighlighterService();

        // Act
        const highlighter = await service.getHighlighter();

        // Assert
        expect(globalCache.__dibsShikiHighlighterPromise).toBeDefined();
        expect(await globalCache.__dibsShikiHighlighterPromise).toBe(highlighter);
    });

    test("then it rehydrates from an existing global cache", async () => {
        // Arrange
        const mockHighlighter = createMockHighlighter();
        cacheHighlighterForService(mockHighlighter);
        const service = createShikiHighlighterService();

        // Act
        const highlighter = await service.getHighlighter();

        // Assert
        expect(highlighter).toBe(mockHighlighter);
    });
});

suite("given no cached Shiki highlighter", () => {
    beforeEach(() => {
        const globalCache = globalThis as any;
        delete globalCache.__dibsShikiHighlighterPromise;
    });

    test("then getShikiHighlighter throws", async () => {
        // Act / Assert
        await expect(getShikiHighlighter()).rejects.toThrow(
            /No cached Shiki highlighter found/,
        );
    });
});

suite("given a cached Shiki highlighter", () => {
    beforeEach(() => {
        const globalCache = globalThis as any;
        delete globalCache.__dibsShikiHighlighterPromise;
    });

    test("then getShikiHighlighter returns the cached highlighter promise", async () => {
        // Arrange
        const mockHighlighter = createMockHighlighter();
        cacheHighlighterForService(mockHighlighter);

        // Act
        const highlighter = await getShikiHighlighter();

        // Assert
        expect(highlighter).toBe(mockHighlighter);
    });
});
