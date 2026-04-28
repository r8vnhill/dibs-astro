import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    classifyRenderedReferenceContent,
    hasMeaningfulTextContent,
    normalizeFallbackText,
    normalizeHref,
    resolveInlineField,
    resolveLinkedInlineField,
    resolveRequiredInlineField,
} from "../reference-content";

describe("reference-content domain", () => {
    describe("rendered content classification", () => {
        it.each([
            { html: "", expected: false },
            { html: " ", expected: false },
            { html: "&nbsp;", expected: false },
            { html: "&#160;", expected: false },
            { html: "&#xA0;", expected: false },
            { html: "<!-- comment -->", expected: false },
            { html: "<span></span>", expected: false },
            { html: "<span>text</span>", expected: true },
            { html: "<strong> x </strong>", expected: true },
            { html: "<img src='x' alt='' />", expected: false },
            { html: "<span>&nbsp;text&nbsp;</span>", expected: true },
        ])("classifies $html as $expected", ({ html, expected }) => {
            expect(hasMeaningfulTextContent(html)).toBe(expected);
        });

        it("preserves original html for meaningful content", () => {
            expect(classifyRenderedReferenceContent("<em>Título</em>")).toEqual({
                kind: "meaningful",
                html: "<em>Título</em>",
            });
        });

        it("normalizes non-meaningful content to the empty payload", () => {
            expect(classifyRenderedReferenceContent("<!-- empty -->")).toEqual({
                kind: "empty",
                html: "",
            });
        });
    });

    describe("fallback normalization and precedence", () => {
        it("returns undefined for blank fallback text", () => {
            expect(normalizeFallbackText("   ")).toBeUndefined();
        });

        it("normalizes inline whitespace and entities in fallback text", () => {
            expect(normalizeFallbackText("  Título &nbsp; base\t\tcon\nsaltos  ")).toBe(
                "Título base con saltos",
            );
        });

        it("returns undefined for blank href values", () => {
            expect(normalizeHref("   ")).toBeUndefined();
        });

        it("prefers meaningful slot content over fallback text", () => {
            expect(
                resolveInlineField(
                    { kind: "meaningful", html: "<strong>Título</strong>" },
                    "Título base",
                ),
            ).toEqual({
                kind: "slot",
                html: "<strong>Título</strong>",
            });
        });

        it("returns normalized fallback text when the slot is empty", () => {
            expect(resolveInlineField({ kind: "empty", html: "" }, "  Título   base  ")).toEqual({
                kind: "text",
                text: "Título base",
            });
        });

        it("returns missing when fallback text is blank", () => {
            expect(resolveInlineField({ kind: "empty", html: "" }, "   ")).toEqual({
                kind: "missing",
            });
        });

        it("returns a link when prop text and url are both usable", () => {
            expect(
                resolveLinkedInlineField(
                    { kind: "empty", html: "" },
                    "Institution base",
                    "https://example.com",
                ),
            ).toEqual({
                kind: "link",
                text: "Institution base",
                href: "https://example.com",
            });
        });

        it("degrades to plain text when the url is blank", () => {
            expect(
                resolveLinkedInlineField(
                    { kind: "empty", html: "" },
                    "Institution base",
                    "   ",
                ),
            ).toEqual({
                kind: "text",
                text: "Institution base",
            });
        });

        it("returns missing when fallback text is blank even if a url exists", () => {
            expect(
                resolveLinkedInlineField(
                    { kind: "empty", html: "" },
                    "   ",
                    "https://example.com",
                ),
            ).toEqual({
                kind: "missing",
            });
        });

        // Skip this property-based test in CI: fast-check generates many property combinations
        // that exceed the 5000ms timeout on resource-constrained runners. Runs locally for full
        // coverage during development.
        it.skipIf(process.env.CI)("property: meaningful slot content always wins", () => {
            fc.assert(
                fc.property(
                    fc.string(),
                    fc.option(fc.string()),
                    fc.option(fc.webUrl()),
                    (html, text, url) => {
                        const result = resolveLinkedInlineField(
                            { kind: "meaningful", html },
                            text ?? undefined,
                            url ?? undefined,
                        );

                        expect(result).toEqual({
                            kind: "slot",
                            html,
                        });
                    },
                ),
            );
        });
    });

    describe("required title validity", () => {
        it("accepts a meaningful slot title", () => {
            expect(
                resolveRequiredInlineField(
                    { kind: "meaningful", html: "<strong>Título</strong>" },
                    undefined,
                ),
            ).toEqual({
                kind: "slot",
                html: "<strong>Título</strong>",
            });
        });

        it("accepts a meaningful fallback title", () => {
            expect(resolveRequiredInlineField({ kind: "empty", html: "" }, "Título base")).toEqual(
                {
                    kind: "text",
                    text: "Título base",
                },
            );
        });

        it("returns an explicit invalid outcome when no meaningful title source exists", () => {
            expect(resolveRequiredInlineField({ kind: "empty", html: "" }, "   ")).toEqual({
                kind: "invalid",
                reason: "missing-title",
            });
        });
    });
});
