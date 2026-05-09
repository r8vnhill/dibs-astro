import { describe, expect, it } from "vitest";
import * as shikiCore from "../src";

describe("@ravenhill/shiki-core public API", () => {
    it("exposes Phase 2 extracted implementations", () => {
        // Theme defaults
        expect(shikiCore).toHaveProperty("DEFAULT_DARK_THEME");
        expect(shikiCore).toHaveProperty("DEFAULT_LIGHT_THEME");
        expect(shikiCore).toHaveProperty("SHIKI_DEFAULT_THEMES");

        // Fallback HTML rendering
        expect(shikiCore).toHaveProperty("escapeCodeHtml");
        expect(shikiCore).toHaveProperty("renderFallbackCodeHtml");
        expect(shikiCore).toHaveProperty("buildPlainHtml");

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

    it("exposes Phase 3 real implementations", () => {
        expect(shikiCore).toHaveProperty("createShikiHighlighterService");
        expect(shikiCore).toHaveProperty("getShikiHighlighter");
        // Backward compatibility alias
        expect(shikiCore).toHaveProperty("createShikiHighlighter");
    });

    it("exposes type contracts", () => {
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

    it("creates a service that provides highlighter access", () => {
        const service = shikiCore.createShikiHighlighterService();
        expect(service).toHaveProperty("getHighlighter");
        expect(service).toHaveProperty("highlightToHtml");
        expect(typeof service.getHighlighter).toBe("function");
        expect(typeof service.highlightToHtml).toBe("function");
    });

    it("exposes correct default theme values", () => {
        expect(shikiCore.DEFAULT_DARK_THEME).toBe("catppuccin-mocha");
        expect(shikiCore.DEFAULT_LIGHT_THEME).toBe("catppuccin-latte");
    });

    it("exposes theme compatibility alias", () => {
        expect(shikiCore.SHIKI_DEFAULT_THEMES).toEqual({
            light: "catppuccin-latte",
            dark: "catppuccin-mocha",
        });
    });

    it("exposes transformer factory functions", () => {
        const tailwindTransformer = shikiCore.createTailwindClassTransformer({
            pre: "rounded-lg",
        });
        expect(tailwindTransformer).toHaveProperty("name");
        expect(tailwindTransformer.name).toBe("tailwind-class-injector");

        const colorTransformer = shikiCore.createLineTextColorTransformer();
        expect(colorTransformer).toHaveProperty("name");
        expect(colorTransformer.name).toBe("notation-line-text-color");
    });

    it("exposes fallback HTML rendering functions", () => {
        const escaped = shikiCore.escapeCodeHtml("<script>");
        expect(escaped).toBe("&lt;script&gt;");

        const html = shikiCore.renderFallbackCodeHtml("code", ["pre-class"], ["code-class"]);
        expect(html).toContain('<pre class="shiki pre-class">');
        expect(html).toContain('<code class="code-class">');
        expect(html).toContain("code</code></pre>");
    });

    it("exposes language resolution functions", () => {
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

    it("exposes available languages array", () => {
        expect(shikiCore.availableLanguages).toBeDefined();
        expect(Array.isArray(shikiCore.availableLanguages)).toBe(true);
        expect(shikiCore.availableLanguages.length).toBeGreaterThan(0);
        expect(shikiCore.availableLanguages).toContain("python");
        expect(shikiCore.availableLanguages).toContain("javascript");
    });
});
