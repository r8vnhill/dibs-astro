import { describe, expect, it } from "vitest";
import { transformerNotationLineTextColor } from "../line-text-color-transformer";
import {
    appendInlineStyle,
    getMetaKey,
    parseInlineLineColorDirective,
    sanitizeCssColor,
} from "../line-text-color-helpers";

describe("line-text-color-transformer helpers", () => {
    it("sanitizes conservative CSS colors", () => {
        expect(sanitizeCssColor("red")).toBe("red");
        expect(sanitizeCssColor(" rgb(10, 20, 30) ")).toBe("rgb(10, 20, 30)");
        expect(sanitizeCssColor("")).toBeNull();
        expect(sanitizeCssColor(" ")).toBeNull();
        expect(sanitizeCssColor("red;display:block")).toBeNull();
        expect(sanitizeCssColor("var(--accent)")).toBe("var(--accent)");
    });

    it("parses inline color directives and strips the annotation from content", () => {
        expect(
            parseInlineLineColorDirective("Write-Host 'hola' # [!code color: rgb(10, 20, 30)]"),
        ).toEqual({
            color: "rgb(10, 20, 30)",
            content: "Write-Host 'hola'",
        });
        expect(parseInlineLineColorDirective("Write-Host 'hola'")).toBeNull();
    });

    it("appends inline styles ending with a semicolon", () => {
        expect(appendInlineStyle(undefined, "--x:red")).toBe("--x:red;");
        expect(appendInlineStyle("color:blue", "--x:red")).toBe("color:blue;--x:red;");
        expect(appendInlineStyle("color:blue;", "--x:red")).toBe("color:blue;--x:red;");
    });

    it("uses a stable fallback meta key for non-object metadata", () => {
        expect(getMetaKey(undefined)).toBe(getMetaKey(null));
        expect(getMetaKey("meta")).toBe(getMetaKey(1));
        expect(getMetaKey({})).not.toBe(getMetaKey({}));
    });
});

describe("transformerNotationLineTextColor", () => {
    it("adds line color class and inline style for annotated lines", () => {
        const transformer = transformerNotationLineTextColor();
        const meta = {};
        const preprocessed = transformer.preprocess?.call(
            { meta } as never,
            "a\nb // [!code color:red]",
            {} as never,
        );
        const node: { properties: Record<string, unknown> } = {
            properties: { class: "line existing" },
        };

        expect(preprocessed).toBe("a\nb");

        transformer.line?.call({ meta } as never, node as never, 2);

        expect(node.properties.className).toEqual(["line", "existing", "line-colored"]);
        expect(node.properties.style).toBe("--code-line-text-color:red;");
        expect(node.properties).not.toHaveProperty("class");
    });

    it("does not fail when metadata is not an object", () => {
        const transformer = transformerNotationLineTextColor();
        const preprocessed = transformer.preprocess?.call(
            { meta: undefined } as never,
            "echo hi ; [!code color:#fff]",
            {} as never,
        );
        const node: { properties: Record<string, unknown> } = { properties: {} };

        expect(preprocessed).toBe("echo hi");
        expect(() =>
            transformer.line?.call({ meta: null } as never, node as never, 1),
        ).not.toThrow();
        expect(() =>
            transformer.line?.call({ meta: 1 } as never, node as never, 1),
        ).not.toThrow();
    });

    it("leaves nodes untouched when no directive matched", () => {
        const transformer = transformerNotationLineTextColor();
        const meta = {};
        const code = "echo hi";
        const node: { properties: Record<string, unknown> } = {
            properties: { class: "line" },
        };

        expect(transformer.preprocess?.call({ meta } as never, code, {} as never)).toBe(code);

        transformer.line?.call({ meta } as never, node as never, 1);

        expect(node.properties).toEqual({ class: "line" });
    });
});
