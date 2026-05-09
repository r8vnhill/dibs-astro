import { describe, expect, it } from "vitest";
import * as shikiCore from "../src";

describe("@ravenhill/shiki-core public API", () => {
    it("exposes the Phase 1 root contract", () => {
        expect(shikiCore).toHaveProperty("createShikiHighlighter");
        expect(shikiCore).toHaveProperty("getShikiHighlighter");
        expect(shikiCore).toHaveProperty("normalizeShikiLanguage");
        expect(shikiCore).toHaveProperty("resolveShikiLanguage");
        expect(shikiCore).toHaveProperty("isKnownShikiAlias");
        expect(shikiCore).toHaveProperty("escapeCodeHtml");
        expect(shikiCore).toHaveProperty("renderFallbackCodeHtml");
        expect(shikiCore).toHaveProperty("createTailwindClassTransformer");
        expect(shikiCore).toHaveProperty("createLineTextColorTransformer");
        expect(shikiCore).toHaveProperty("DEFAULT_DARK_THEME");
        expect(shikiCore).toHaveProperty("DEFAULT_LIGHT_THEME");
    });

    it("exposes type contracts", () => {
        const _typeCheck: shikiCore.HighlightLanguage = "python";
        const _themeCheck: shikiCore.HighlightThemePair = {
            light: "catppuccin-latte",
            dark: "catppuccin-mocha",
        };
        const _optionsCheck: shikiCore.HighlightCodeOptions = {
            code: "println()",
            language: "kotlin",
        };
        // Unused variable check passes if types are valid
        expect(_typeCheck).toBe("python");
        expect(_themeCheck.light).toBe("catppuccin-latte");
        expect(_optionsCheck.language).toBe("kotlin");
    });

    it("marks scaffold runtime functions as intentionally unimplemented", () => {
        expect(() => shikiCore.getShikiHighlighter()).toThrow(
            /scheduled for a later extraction phase/,
        );
        expect(() => shikiCore.normalizeShikiLanguage()).toThrow(
            /scheduled for a later extraction phase/,
        );
        expect(() => shikiCore.createTailwindClassTransformer()).toThrow(
            /scheduled for a later extraction phase/,
        );
    });

    it("exposes correct default theme values", () => {
        expect(shikiCore.DEFAULT_DARK_THEME).toBe("catppuccin-mocha");
        expect(shikiCore.DEFAULT_LIGHT_THEME).toBe("catppuccin-latte");
    });
});
