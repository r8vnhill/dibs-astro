/**
 * Tests for @ravenhill/shiki-core Phase 3 implementation.
 *
 * Covers highlighter service creation, orchestration, language loading,
 * fallback rendering, and global cache synchronization.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createShikiHighlighterService, getShikiHighlighter } from "../src/highlighter/service";
import { DEFAULT_DARK_THEME } from "../src/themes/defaults";
import type { Highlighter } from "shiki";

function createMockHighlighter(): Highlighter {
    return {
        getLoadedLanguages: vi.fn(() => []),
        loadLanguage: vi.fn(async () => {}),
        codeToHtml: vi.fn((code) => `<pre><code>${code}</code></pre>`),
    } as any;
}

describe("createShikiHighlighterService", () => {
    beforeEach(() => {
        // Clear global cache before each test
        const globalCache = globalThis as any;
        delete globalCache.__dibsShikiHighlighterPromise;
    });

    it("creates a service that provides getHighlighter and highlightToHtml", () => {
        const service = createShikiHighlighterService();

        expect(service.getHighlighter).toBeDefined();
        expect(service.highlightToHtml).toBeDefined();
        expect(typeof service.getHighlighter).toBe("function");
        expect(typeof service.highlightToHtml).toBe("function");
    });

    it("lazily creates a highlighter on first getHighlighter call", async () => {
        const service = createShikiHighlighterService();

        const highlighter1 = await service.getHighlighter();
        const highlighter2 = await service.getHighlighter();

        expect(highlighter1).toBe(highlighter2);
    });

    it("renders text language directly without loading", async () => {
        const mockHighlighter = createMockHighlighter();
        const mockCreate = vi.fn(async () => mockHighlighter);

        const service = createShikiHighlighterService({
            retry: (op) => op(),
        });

        // Inject the mock
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        const html = await service.highlightToHtml({
            code: "plain text",
            language: "text",
        });

        expect(html).toContain("plain text");
        expect(mockHighlighter.loadLanguage).not.toHaveBeenCalled();
    });

    it("wraps language loading with the configured retry function", async () => {
        const mockHighlighter = createMockHighlighter();
        mockHighlighter.getLoadedLanguages = vi.fn(() => []);

        const retryFn = vi.fn((op) => op());
        const service = createShikiHighlighterService({ retry: retryFn });

        // Inject the mock
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        await service.highlightToHtml({
            code: "code",
            language: "javascript",
        });

        // Verify retry was called for language loading
        expect(retryFn).toHaveBeenCalled();
    });

    it("handles unknown languages by returning fallback HTML", async () => {
        const mockHighlighter = createMockHighlighter();
        const warnFn = vi.fn();

        const service = createShikiHighlighterService({ warn: warnFn });

        // Inject the mock
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        const html = await service.highlightToHtml({
            code: "some code",
            language: "unknown-lang-xyz",
        });

        expect(html).toContain("some code");
        expect(warnFn).toHaveBeenCalledWith(
            expect.stringContaining("not recognized"),
        );
    });

    it("warns only once per unknown language", async () => {
        const mockHighlighter = createMockHighlighter();
        const warnFn = vi.fn();

        const service = createShikiHighlighterService({ warn: warnFn });

        // Inject the mock
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        await service.highlightToHtml({
            code: "code1",
            language: "unknown-xyz",
        });

        await service.highlightToHtml({
            code: "code2",
            language: "unknown-xyz",
        });

        expect(warnFn).toHaveBeenCalledTimes(1);
    });

    it("handles language load failures by returning fallback HTML", async () => {
        const mockHighlighter = createMockHighlighter();
        mockHighlighter.loadLanguage = vi.fn(async () => {
            throw new Error("Network failure");
        });
        const warnFn = vi.fn();

        // Inject the mock
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        const service = createShikiHighlighterService({ warn: warnFn });

        const html = await service.highlightToHtml({
            code: "code",
            language: "python",
        });

        expect(html).toContain("code");
        expect(warnFn).toHaveBeenCalledWith(
            expect.stringContaining("could not be loaded"),
        );
    });

    it("passes transformers through to the highlighter", async () => {
        const mockHighlighter = createMockHighlighter();
        mockHighlighter.getLoadedLanguages = vi.fn(() => ["python"]);
        mockHighlighter.codeToHtml = vi.fn(() => "<pre>highlighted</pre>");

        // Inject the mock
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        const service = createShikiHighlighterService();

        const mockTransformer = { name: "test" };
        await service.highlightToHtml({
            code: "code",
            language: "python",
            transformers: [mockTransformer as any],
        });

        expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
            "code",
            expect.objectContaining({
                transformers: [mockTransformer],
            }),
        );
    });

    it("uses provided theme or falls back to default", async () => {
        const mockHighlighter = createMockHighlighter();
        mockHighlighter.getLoadedLanguages = vi.fn(() => ["javascript"]);
        mockHighlighter.codeToHtml = vi.fn(() => "<pre>html</pre>");

        // Inject the mock
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        const service = createShikiHighlighterService({
            defaultTheme: "catppuccin-latte",
        });

        // With custom theme
        await service.highlightToHtml({
            code: "code",
            language: "javascript",
            theme: "catppuccin-mocha",
        });

        expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ theme: "catppuccin-mocha" }),
        );

        // With default theme
        mockHighlighter.codeToHtml.mockClear();
        await service.highlightToHtml({
            code: "code",
            language: "javascript",
        });

        expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ theme: "catppuccin-latte" }),
        );
    });

    it("synchronizes highlighter with global cache", async () => {
        const globalCache = globalThis as any;
        delete globalCache.__dibsShikiHighlighterPromise;

        const service = createShikiHighlighterService();

        // Get the highlighter (should create and store in global)
        const highlighter = await service.getHighlighter();

        expect(globalCache.__dibsShikiHighlighterPromise).toBeDefined();
        expect(await globalCache.__dibsShikiHighlighterPromise).toBe(highlighter);
    });

    it("rehydrates from existing global cache", async () => {
        const mockHighlighter = createMockHighlighter();
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        const service = createShikiHighlighterService();
        const highlighter = await service.getHighlighter();

        expect(highlighter).toBe(mockHighlighter);
    });
});

describe("getShikiHighlighter", () => {
    beforeEach(() => {
        const globalCache = globalThis as any;
        delete globalCache.__dibsShikiHighlighterPromise;
    });

    it("throws if no highlighter has been cached", async () => {
        await expect(getShikiHighlighter()).rejects.toThrow(
            /No cached Shiki highlighter found/,
        );
    });

    it("returns the cached highlighter promise", async () => {
        const mockHighlighter = createMockHighlighter();
        const globalCache = globalThis as any;
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(mockHighlighter);

        const highlighter = await getShikiHighlighter();

        expect(highlighter).toBe(mockHighlighter);
    });
});
