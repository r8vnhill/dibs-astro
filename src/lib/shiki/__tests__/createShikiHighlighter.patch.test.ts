import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const shikiMocks = vi.hoisted(() => {
    const createHighlighter = vi.fn();
    const createCssVariablesTheme = vi.fn(() => ({ name: "css-variables", type: "theme" }));
    const isSpecialLang = vi.fn((lang: string) => lang === "text");

    return {
        createHighlighter,
        createCssVariablesTheme,
        isSpecialLang,
    };
});

vi.mock("shiki", () => ({
    createHighlighter: shikiMocks.createHighlighter,
    createCssVariablesTheme: shikiMocks.createCssVariablesTheme,
    isSpecialLang: shikiMocks.isSpecialLang,
}));

const modulePath = "../../../../config/patches/shiki/createShikiHighlighter";

function createFakeHighlighter(overrides: Partial<{
    loadedLanguages: string[];
    codeToHtml: ReturnType<typeof vi.fn>;
    codeToHast: ReturnType<typeof vi.fn>;
    loadLanguage: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
}> = {}) {
    const loadedLanguages = overrides.loadedLanguages ?? ["text"];

    return {
        getLoadedLanguages: vi.fn(() => [...loadedLanguages]),
        codeToHtml: overrides.codeToHtml ?? vi.fn(() => "<pre>html</pre>"),
        codeToHast: overrides.codeToHast ?? vi.fn(() => ({ type: "root", children: [] })),
        loadLanguage: overrides.loadLanguage ?? vi.fn(async () => {}),
        dispose: overrides.dispose ?? vi.fn(),
    };
}

describe("patched createShikiHighlighter", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("reuses one cached wrapper for equivalent normalized configs", async () => {
        const fakeHighlighter = createFakeHighlighter();
        shikiMocks.createHighlighter.mockResolvedValue(fakeHighlighter);

        const { createShikiHighlighter } = await import(modulePath);

        const first = await createShikiHighlighter({
            langs: ["ts", "text", "ts"],
            langAlias: { plaintext: "text" },
        });
        const second = await createShikiHighlighter({
            langs: ["text", "ts"],
            langAlias: { plaintext: "text" },
        });

        expect(first).toBe(second);
        expect(shikiMocks.createHighlighter).toHaveBeenCalledTimes(1);
        expect(shikiMocks.createHighlighter).toHaveBeenCalledWith(expect.objectContaining({
            langs: ["text", "ts"],
        }));
    });

    it("creates separate cached wrappers for different configs", async () => {
        shikiMocks.createHighlighter
            .mockResolvedValueOnce(createFakeHighlighter())
            .mockResolvedValueOnce(createFakeHighlighter());

        const { createShikiHighlighter } = await import(modulePath);

        const first = await createShikiHighlighter({ theme: "github-dark" });
        const second = await createShikiHighlighter({ theme: "catppuccin-latte" });

        expect(first).not.toBe(second);
        expect(shikiMocks.createHighlighter).toHaveBeenCalledTimes(2);
    });

    it("clears a rejected creation from cache and retries on the next call", async () => {
        const failure = new Error("boom");
        shikiMocks.createHighlighter
            .mockRejectedValueOnce(failure)
            .mockResolvedValueOnce(createFakeHighlighter());

        const { createShikiHighlighter } = await import(modulePath);

        await expect(createShikiHighlighter({ langs: ["ts"] })).rejects.toThrow("boom");
        await expect(createShikiHighlighter({ langs: ["ts"] })).resolves.toMatchObject({
            codeToHtml: expect.any(Function),
            codeToHast: expect.any(Function),
            dispose: expect.any(Function),
        });
        expect(shikiMocks.createHighlighter).toHaveBeenCalledTimes(2);
    });

    it("dispose invalidates the cache entry and delegates to the underlying highlighter", async () => {
        const firstHighlighter = createFakeHighlighter();
        const secondHighlighter = createFakeHighlighter();
        shikiMocks.createHighlighter
            .mockResolvedValueOnce(firstHighlighter)
            .mockResolvedValueOnce(secondHighlighter);

        const { createShikiHighlighter } = await import(modulePath);

        const first = await createShikiHighlighter({ langs: ["ts"] });
        await first.dispose();
        const second = await createShikiHighlighter({ langs: ["ts"] });

        expect(firstHighlighter.dispose).toHaveBeenCalledTimes(1);
        expect(second).not.toBe(first);
        expect(shikiMocks.createHighlighter).toHaveBeenCalledTimes(2);
    });

    it("renders css-variables themes with the registered theme object and canonical theme id", async () => {
        const fakeHighlighter = createFakeHighlighter();
        shikiMocks.createHighlighter.mockResolvedValue(fakeHighlighter);

        const { createShikiHighlighter } = await import(modulePath);

        const highlighter = await createShikiHighlighter({ theme: "css-variables" });
        await highlighter.codeToHtml("const x = 1;", "ts");

        expect(shikiMocks.createCssVariablesTheme).toHaveBeenCalledTimes(1);
        expect(shikiMocks.createHighlighter).toHaveBeenCalledWith(expect.objectContaining({
            themes: [{ name: "css-variables", type: "theme" }],
        }));
        expect(fakeHighlighter.codeToHtml).toHaveBeenCalledWith(
            "const x = 1;",
            expect.objectContaining({ theme: "css-variables" }),
        );
    });

    it("copies transformers instead of mutating the caller array", async () => {
        const fakeHighlighter = createFakeHighlighter();
        shikiMocks.createHighlighter.mockResolvedValue(fakeHighlighter);

        const { createShikiHighlighter } = await import(modulePath);

        const highlighter = await createShikiHighlighter();
        const transformers = [{ name: "custom-transformer" }];

        await highlighter.codeToHtml("const x = 1;\n", "ts", { transformers });

        const receivedOptions = fakeHighlighter.codeToHtml.mock.calls[0]?.[1];
        expect(receivedOptions.transformers).not.toBe(transformers);
        expect(transformers).toEqual([{ name: "custom-transformer" }]);
    });

    it("defaults to text and falls back to text when language loading fails", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const fakeHighlighter = createFakeHighlighter({
            loadedLanguages: [],
            loadLanguage: vi.fn(async () => {
                throw new Error("missing grammar");
            }),
        });
        shikiMocks.createHighlighter.mockResolvedValue(fakeHighlighter);

        const { createShikiHighlighter } = await import(modulePath);

        const highlighter = await createShikiHighlighter();

        await highlighter.codeToHtml("echo hi\n", "bash");
        await highlighter.codeToHtml("echo hi\n", "plaintext");

        expect(fakeHighlighter.codeToHtml).toHaveBeenNthCalledWith(
            1,
            "echo hi",
            expect.objectContaining({ lang: "text" }),
        );
        expect(fakeHighlighter.codeToHtml).toHaveBeenNthCalledWith(
            2,
            "echo hi",
            expect.objectContaining({ lang: "text" }),
        );
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('falling back to "text"'),
        );
    });

    it("supports both html and hast outputs", async () => {
        const fakeHighlighter = createFakeHighlighter();
        shikiMocks.createHighlighter.mockResolvedValue(fakeHighlighter);

        const { createShikiHighlighter } = await import(modulePath);

        const highlighter = await createShikiHighlighter({ themes: { light: "github-light" } });
        await highlighter.codeToHtml("const x = 1;", "ts");
        await highlighter.codeToHast("const x = 1;", "ts");

        expect(fakeHighlighter.codeToHtml).toHaveBeenCalledTimes(1);
        expect(fakeHighlighter.codeToHast).toHaveBeenCalledTimes(1);
        expect(fakeHighlighter.codeToHtml).toHaveBeenCalledWith(
            "const x = 1;",
            expect.objectContaining({ themes: { light: "github-light" } }),
        );
    });
});
