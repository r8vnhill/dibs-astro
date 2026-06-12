import { expect, suite, test } from "vitest";
import * as shikiCore from "../src";

suite("given the @ravenhill/shiki-core public API", () => {
    test("then it exposes Phase 2 extracted implementations", () => {
        // Theme defaults
        expect(shikiCore).toHaveProperty("DEFAULT_DARK_THEME");
        expect(shikiCore).toHaveProperty("DEFAULT_LIGHT_THEME");
        expect(shikiCore).toHaveProperty("SHIKI_DEFAULT_THEMES");

        // Fallback HTML rendering
        expect(shikiCore).toHaveProperty("escapeHtmlText");
        expect(shikiCore).toHaveProperty("escapeHtmlAttribute");
        expect(shikiCore).toHaveProperty("renderFallbackCodeHtml");

        // Language resolution
        expect(shikiCore).toHaveProperty("isKnownShikiAlias");
        expect(shikiCore).toHaveProperty("normalizeShikiLanguage");
        expect(shikiCore).toHaveProperty("resolveShikiLanguage");
        expect(shikiCore).toHaveProperty("availableLanguages");

        // Transformers
        expect(shikiCore).toHaveProperty("createTailwindClassTransformer");
        expect(shikiCore).toHaveProperty("applyTailwindClasses");
        expect(shikiCore).toHaveProperty("createLineTextColorTransformer");
        expect(shikiCore).toHaveProperty("transformerNotationLineTextColor");
    });

    test("then it exposes Phase 3 real implementations", () => {
        expect(shikiCore).toHaveProperty("createShikiHighlighterService");
        expect(shikiCore).toHaveProperty("getShikiHighlighter");
        // Backward compatibility alias
        expect(shikiCore).toHaveProperty("createShikiHighlighter");
    });

    test("then it exposes type contracts", () => {
        const _serviceCheck: shikiCore.ShikiHighlighterService = {
            getHighlighter: async () => {
                throw new Error("mock");
            },
            highlightToHtml: async () => "",
        };
        const _optionsCheck: shikiCore.HighlightToHtmlOptions = {
            code: "println()",
            language: "kotlin",
        };
        const _retryCheck: shikiCore.ShikiRetry = async (op) => op();
        // Unused variable check passes if types are valid
        expect(_serviceCheck).toBeDefined();
        expect(_optionsCheck.language).toBe("kotlin");
        expect(_retryCheck).toBeDefined();
    });

    test("then it creates a service that provides highlighter access", () => {
        const service = shikiCore.createShikiHighlighterService();
        expect(service).toHaveProperty("getHighlighter");
        expect(service).toHaveProperty("highlightToHtml");
        expect(typeof service.getHighlighter).toBe("function");
        expect(typeof service.highlightToHtml).toBe("function");
    });

    test("then it exposes correct default theme values", () => {
        expect(shikiCore.DEFAULT_DARK_THEME).toBe("catppuccin-mocha");
        expect(shikiCore.DEFAULT_LIGHT_THEME).toBe("catppuccin-latte");
    });

    test("then it exposes theme compatibility alias", () => {
        expect(shikiCore.SHIKI_DEFAULT_THEMES).toEqual({
            light: "catppuccin-latte",
            dark: "catppuccin-mocha",
        });
    });

    test("then it exposes transformer factory functions", () => {
        const tailwindTransformer = shikiCore.createTailwindClassTransformer({
            pre: "rounded-lg",
        });
        expect(tailwindTransformer).toHaveProperty("name");
        expect(tailwindTransformer.name).toBe("tailwind-class-injector");

        const colorTransformer = shikiCore.createLineTextColorTransformer();
        expect(colorTransformer).toHaveProperty("name");
        expect(colorTransformer.name).toBe("notation-line-text-color");
    });

    test("then it exposes fallback HTML rendering functions", () => {
        expect(shikiCore.escapeHtmlText("'quoted'")).toBe("'quoted'");
        expect(shikiCore.escapeHtmlAttribute("'quoted'")).toBe("&#39;quoted&#39;");

        const html = shikiCore.renderFallbackCodeHtml("code", ["pre-class"], ["code-class"]);
        expect(html).toContain('<pre class="shiki pre-class">');
        expect(html).toContain('<code class="code-class">');
        expect(html).toContain("code</code></pre>");
    });

    test("then it exposes language resolution functions", () => {
        const pyResult = shikiCore.resolveShikiLanguage("py");
        expect(pyResult.resolvedLang).toBe("python");
        expect(pyResult.shouldWarn).toBe(false);

        const unknownResult = shikiCore.resolveShikiLanguage("unknown-lang-xyz");
        expect(unknownResult.resolvedLang).toBeNull();
        expect(unknownResult.shouldWarn).toBe(true);

        const isAlias = shikiCore.isKnownShikiAlias("py");
        expect(isAlias).toBe(true);

        const notAlias = shikiCore.isKnownShikiAlias("unknown-lang-xyz");
        expect(notAlias).toBe(false);
    });

    test("then it exposes available languages array", () => {
        expect(shikiCore.availableLanguages).toBeDefined();
        expect(Array.isArray(shikiCore.availableLanguages)).toBe(true);
        expect(shikiCore.availableLanguages.length).toBeGreaterThan(0);
        expect(shikiCore.availableLanguages).toContain("python");
        expect(shikiCore.availableLanguages).toContain("javascript");
    });
});
