import { describe, expect, it } from "vitest";
import {
    createLineTextColorTransformer,
    transformerNotationLineTextColor,
    getMetaKey,
    sanitizeCssColor,
    parseInlineLineColorDirective,
    appendInlineStyle,
} from "../src/transformers/line-text-color";

/**
 * Contract tests for line-text-color transformer and helpers.
 *
 * These tests verify directive parsing, sanitization, style handling, and transformer behavior.
 */
describe("line-text-color transformer", () => {
    describe("getMetaKey", () => {
        it("returns object metadata directly", () => {
            const meta = { key: "value" };
            expect(getMetaKey(meta)).toBe(meta);
        });

        it("returns a consistent fallback for non-objects", () => {
            const fallback1 = getMetaKey(null);
            const fallback2 = getMetaKey(undefined);
            const fallback3 = getMetaKey("string");
            const fallback4 = getMetaKey(42);

            // All should return the same fallback object
            expect(fallback1).toBe(fallback2);
            expect(fallback2).toBe(fallback3);
            expect(fallback3).toBe(fallback4);
        });
    });

    describe("sanitizeCssColor", () => {
        it.each([
            { input: "red", expected: "red" },
            { input: "#ff0000", expected: "#ff0000" },
            { input: "rgb(255, 0, 0)", expected: "rgb(255, 0, 0)" },
            { input: "hsl(0, 100%, 50%)", expected: "hsl(0, 100%, 50%)" },
            { input: "currentColor", expected: "currentColor" },
            { input: "var(--my-color)", expected: "var(--my-color)" },
        ])("accepts valid CSS colors: $input", ({ input, expected }) => {
            expect(sanitizeCssColor(input)).toBe(expected);
        });

        it.each([
            "",
            "   ",
            "red; border: 1px solid black",
            "red; color: blue",
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "a".repeat(100),
        ])("rejects unsafe or invalid colors: %s", (input) => {
            expect(sanitizeCssColor(input)).toBeNull();
        });

        it("trims whitespace from valid colors", () => {
            const result = sanitizeCssColor("  red  ");
            expect(result).toBe("red");
        });

        it("rejects colors with semicolons", () => {
            expect(sanitizeCssColor("red;")).toBeNull();
            expect(sanitizeCssColor(";red")).toBeNull();
        });

        it("enforces maximum length", () => {
            const validColor = "a".repeat(64);
            const tooLong = "a".repeat(65);
            expect(sanitizeCssColor(validColor)).toBe(validColor);
            expect(sanitizeCssColor(tooLong)).toBeNull();
        });
    });

    describe("parseInlineLineColorDirective", () => {
        it.each([
            {
                input: "code [!code color:red]",
                expectedContent: "code",
                expectedColor: "red",
            },
            {
                input: "code # [!code color:#ff0000]",
                expectedContent: "code",
                expectedColor: "#ff0000",
            },
            {
                input: "code // [!code color:blue]",
                expectedContent: "code",
                expectedColor: "blue",
            },
            {
                input: "code ; [!code color:green]",
                expectedContent: "code",
                expectedColor: "green",
            },
            {
                input: "code -- [!code color:yellow]",
                expectedContent: "code",
                expectedColor: "yellow",
            },
        ])("parses valid directives: $input", ({ input, expectedContent, expectedColor }) => {
            const result = parseInlineLineColorDirective(input);
            expect(result).not.toBeNull();
            expect(result!.content).toBe(expectedContent);
            expect(result!.color).toBe(expectedColor);
        });

        it.each([
            "no directive here",
            "[!code]",
            "[!code color:]",
            "[!code color:red; border: 1px",
        ])("returns null for invalid directives: %s", (input) => {
            expect(parseInlineLineColorDirective(input)).toBeNull();
        });

        it("removes trailing whitespace from content", () => {
            const result = parseInlineLineColorDirective("code   [!code color:red]");
            expect(result).not.toBeNull();
            expect(result!.content).toBe("code");
        });

        it("handles content with leading whitespace preserved", () => {
            const result = parseInlineLineColorDirective("  code  [!code color:red]");
            expect(result).not.toBeNull();
            expect(result!.content).toBe("  code");
        });

        it("rejects directives with invalid colors", () => {
            const result = parseInlineLineColorDirective("code [!code color:red;border:blue]");
            expect(result).toBeNull();
        });
    });

    describe("appendInlineStyle", () => {
        it("appends to empty style", () => {
            expect(appendInlineStyle("", "color:red")).toBe("color:red;");
            expect(appendInlineStyle(undefined, "color:red")).toBe("color:red;");
        });

        it("appends to existing style without trailing semicolon", () => {
            expect(appendInlineStyle("color:blue", "font-size:12px")).toBe(
                "color:blue;font-size:12px;",
            );
        });

        it("appends to existing style with trailing semicolon", () => {
            expect(appendInlineStyle("color:blue;", "font-size:12px")).toBe(
                "color:blue;font-size:12px;",
            );
        });

        it("trims whitespace from existing styles", () => {
            expect(appendInlineStyle("  color:blue  ", "font-size:12px")).toBe(
                "color:blue;font-size:12px;",
            );
        });

        it("handles non-string existing values", () => {
            expect(appendInlineStyle(null, "color:red")).toBe("color:red;");
            expect(appendInlineStyle(42 as any, "color:red")).toBe("color:red;");
        });
    });

    describe("createLineTextColorTransformer", () => {
        it("creates a transformer with correct name", () => {
            const transformer = createLineTextColorTransformer();
            expect(transformer).toHaveProperty("name");
            expect(transformer.name).toBe("notation-line-text-color");
        });

        it("exposes preprocess and line hooks", () => {
            const transformer = createLineTextColorTransformer();
            expect(transformer).toHaveProperty("preprocess");
            expect(transformer).toHaveProperty("line");
            expect(typeof transformer.preprocess).toBe("function");
            expect(typeof transformer.line).toBe("function");
        });

        it("returns a valid ShikiTransformer structure", () => {
            const transformer = createLineTextColorTransformer();
            expect(transformer).toBeDefined();
            expect(transformer.name).toBe("notation-line-text-color");
            expect(typeof transformer.preprocess).toBe("function");
        });
    });

    describe("transformerNotationLineTextColor (backwards compatibility)", () => {
        it("is an alias for createLineTextColorTransformer", () => {
            const transformer1 = transformerNotationLineTextColor();
            const transformer2 = createLineTextColorTransformer();

            expect(transformer1.name).toBe(transformer2.name);
            expect(transformer1.name).toBe("notation-line-text-color");
        });

        it("can be used as a drop-in replacement", () => {
            const transformer = transformerNotationLineTextColor();
            expect(transformer).toHaveProperty("preprocess");
            expect(transformer).toHaveProperty("line");
        });
    });
});
