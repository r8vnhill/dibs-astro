import { describe, expect, it } from "vitest";
import * as htmlModule from "../html";
import * as languageModule from "../language-aliases";
import * as classTokensModule from "../class-tokens";
import * as tailwindModule from "../tailwind-class-transformer";
import * as lineColorHelpersModule from "../line-text-color-helpers";
import * as lineColorTransformerModule from "../line-text-color-transformer";

/**
 * Compatibility tests for app-local Shiki wrapper imports.
 *
 * Verifies that existing import paths from `src/lib/shiki/*` still resolve and expose
 * the same names, even though they are now thin re-export wrappers from `@ravenhill/shiki-core`.
 *
 * These tests enforce the migration contract: old code should continue to work without changes.
 */
describe("shiki app-local compatibility wrappers", () => {
    it("preserves html module exports", () => {
        expect(htmlModule).toHaveProperty("escapeCodeHtml");
        expect(htmlModule).toHaveProperty("renderFallbackCodeHtml");
        expect(htmlModule).toHaveProperty("buildPlainHtml");
        expect(typeof htmlModule.escapeCodeHtml).toBe("function");
        expect(typeof htmlModule.renderFallbackCodeHtml).toBe("function");
        expect(typeof htmlModule.buildPlainHtml).toBe("function");
    });

    it("preserves language-aliases module exports", () => {
        expect(languageModule).toHaveProperty("isKnownShikiAlias");
        expect(languageModule).toHaveProperty("normalizeShikiLanguage");
        expect(languageModule).toHaveProperty("resolveShikiLanguage");
        expect(languageModule).toHaveProperty("resolveLanguage");
        expect(languageModule).toHaveProperty("availableLanguages");
        expect(languageModule).toHaveProperty("languageAliases");
        expect(typeof languageModule.isKnownShikiAlias).toBe("function");
        expect(typeof languageModule.normalizeShikiLanguage).toBe("function");
        expect(typeof languageModule.resolveShikiLanguage).toBe("function");
    });

    it("preserves class-tokens module exports", () => {
        expect(classTokensModule).toHaveProperty("splitClassTokens");
        expect(classTokensModule).toHaveProperty("toClassTokens");
        expect(classTokensModule).toHaveProperty("appendUniqueClasses");
        expect(classTokensModule).toHaveProperty("assignMergedClassName");
        expect(typeof classTokensModule.splitClassTokens).toBe("function");
        expect(typeof classTokensModule.toClassTokens).toBe("function");
        expect(typeof classTokensModule.appendUniqueClasses).toBe("function");
        expect(typeof classTokensModule.assignMergedClassName).toBe("function");
    });

    it("preserves tailwind-class-transformer module exports", () => {
        expect(tailwindModule).toHaveProperty("applyTailwindClasses");
        expect(tailwindModule).toHaveProperty("createTailwindClassTransformer");
        expect(typeof tailwindModule.applyTailwindClasses).toBe("function");
        expect(typeof tailwindModule.createTailwindClassTransformer).toBe("function");
    });

    it("preserves line-text-color-helpers module exports", () => {
        expect(lineColorHelpersModule).toHaveProperty("getMetaKey");
        expect(lineColorHelpersModule).toHaveProperty("sanitizeCssColor");
        expect(lineColorHelpersModule).toHaveProperty("parseInlineLineColorDirective");
        expect(lineColorHelpersModule).toHaveProperty("appendInlineStyle");
        expect(typeof lineColorHelpersModule.getMetaKey).toBe("function");
        expect(typeof lineColorHelpersModule.sanitizeCssColor).toBe("function");
        expect(typeof lineColorHelpersModule.parseInlineLineColorDirective).toBe("function");
        expect(typeof lineColorHelpersModule.appendInlineStyle).toBe("function");
    });

    it("preserves line-text-color-transformer module exports", () => {
        expect(lineColorTransformerModule).toHaveProperty("createLineTextColorTransformer");
        expect(lineColorTransformerModule).toHaveProperty("transformerNotationLineTextColor");
        expect(typeof lineColorTransformerModule.createLineTextColorTransformer).toBe("function");
        expect(typeof lineColorTransformerModule.transformerNotationLineTextColor).toBe("function");
    });

    it("verifies fallback HTML rendering works through wrapper", () => {
        const escaped = htmlModule.escapeCodeHtml("<div>");
        expect(escaped).toBe("&lt;div&gt;");

        const html = htmlModule.renderFallbackCodeHtml("code", [], []);
        expect(html).toContain('<pre class="shiki">');
        expect(html).toContain('<code');
        expect(html).toContain("code</code>");
    });

    it("verifies language resolution works through wrapper", () => {
        const result = languageModule.resolveShikiLanguage("py");
        expect(result.resolvedLang).toBe("python");
        expect(result.shouldWarn).toBe(false);

        const isAlias = languageModule.isKnownShikiAlias("py");
        expect(isAlias).toBe(true);
    });

    it("verifies transformers can be created through wrappers", () => {
        const tailwindTransformer = tailwindModule.createTailwindClassTransformer({
            pre: "rounded",
        });
        expect(tailwindTransformer).toHaveProperty("name");
        expect(tailwindTransformer.name).toBe("tailwind-class-injector");

        const colorTransformer = lineColorTransformerModule.createLineTextColorTransformer();
        expect(colorTransformer).toHaveProperty("name");
        expect(colorTransformer.name).toBe("notation-line-text-color");
    });
});
