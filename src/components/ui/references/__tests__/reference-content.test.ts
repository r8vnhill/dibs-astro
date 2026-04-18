import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import {
    hasMeaningfulTextContent,
    prepareSlotsForReferences,
    resolveInlineField,
    resolveLinkedInlineField,
    resolveOptionalSlot,
    resolveOptionalSlots,
} from "../reference-content";

describe("hasMeaningfulTextContent", () => {
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

    it("treats plain text as meaningful", () => {
        expect(hasMeaningfulTextContent("Texto")).toBe(true);
    });
});

describe("resolveOptionalSlot", () => {
    it("returns the empty result when the slot is absent and skips rendering", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(false),
            render: vi.fn(),
        };

        await expect(resolveOptionalSlot(slots, "title")).resolves.toEqual({
            kind: "empty",
            html: "",
        });
        expect(slots.render).not.toHaveBeenCalled();
    });

    it("returns the empty result when rendered content is not meaningful", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(true),
            render: vi.fn().mockResolvedValue("<!-- empty -->"),
        };

        await expect(resolveOptionalSlot(slots, "title")).resolves.toEqual({
            kind: "empty",
            html: "",
        });
    });

    it("preserves original html when rendered content is meaningful", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(true),
            render: vi.fn().mockResolvedValue("<em>Título</em>"),
        };

        await expect(resolveOptionalSlot(slots, "title")).resolves.toEqual({
            kind: "meaningful",
            html: "<em>Título</em>",
        });
    });

    it("propagates render failures unchanged", async () => {
        const error = new Error("render failed");
        const slots = {
            has: vi.fn().mockReturnValue(true),
            render: vi.fn().mockRejectedValue(error),
        };

        await expect(resolveOptionalSlot(slots, "title")).rejects.toThrow(error);
    });
});

describe("resolveOptionalSlots", () => {
    it("resolves multiple optional slots in one call", async () => {
        const slotValues: Record<string, string> = {
            title: "<strong>Título</strong>",
            author: "<!-- vacío -->",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        const resolved = await resolveOptionalSlots(slots, ["title", "author", "publication"]);

        expect(resolved).toEqual({
            title: { kind: "meaningful", html: "<strong>Título</strong>" },
            author: { kind: "empty", html: "" },
            publication: { kind: "empty", html: "" },
        });
    });

    it("returns an empty object for an empty slot list", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(false),
            render: vi.fn().mockResolvedValue(""),
        };

        await expect(resolveOptionalSlots(slots, [])).resolves.toEqual({});
    });
});

describe("resolveInlineField", () => {
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

    it("returns missing when fallback text only contains non-breaking-space entities", () => {
        expect(resolveInlineField({ kind: "empty", html: "" }, " &nbsp; &#160; ")).toEqual({
            kind: "missing",
        });
    });
});

describe("resolveLinkedInlineField", () => {
    it("prefers meaningful slot content over prop text and url", () => {
        expect(
            resolveLinkedInlineField(
                { kind: "meaningful", html: "<strong>Institución</strong>" },
                "Institution base",
                "https://example.com",
            ),
        ).toEqual({
            kind: "slot",
            html: "<strong>Institución</strong>",
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

    it("returns plain text when prop text exists without a url", () => {
        expect(resolveLinkedInlineField({ kind: "empty", html: "" }, "Institution base")).toEqual(
            {
                kind: "text",
                text: "Institution base",
            },
        );
    });

    it("returns plain text when prop text is usable and the url is blank", () => {
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

    it("property: meaningful slot content always wins", () => {
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

describe("prepareSlotsForReferences", () => {
    it("prepares meaningful slot overrides for a single reference", async () => {
        const slotValues: Record<string, string> = {
            "title-ref-1": "<strong>Custom Title</strong>",
            "description-ref-1": "<p>Custom description</p>",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        const prepared = await prepareSlotsForReferences(slots, ["ref-1"]);

        expect(prepared).toEqual({
            "ref-1": {
                title: "<strong>Custom Title</strong>",
                description: "<p>Custom description</p>",
            },
        });
    });

    it("includes only meaningful slots in the prepared record", async () => {
        const slotValues: Record<string, string> = {
            "title-ref-1": "<strong>Custom Title</strong>",
            "publication-ref-1": "<!-- empty -->",
            "institution-ref-1": "",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        const prepared = await prepareSlotsForReferences(slots, ["ref-1"]);

        expect(prepared).toEqual({
            "ref-1": {
                title: "<strong>Custom Title</strong>",
            },
        });
    });

    it("prepares slots for multiple references", async () => {
        const slotValues: Record<string, string> = {
            "title-ref-1": "Title 1",
            "description-ref-1": "Description 1",
            "title-ref-2": "Title 2",
            "publication-ref-2": "Publication 2",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        const prepared = await prepareSlotsForReferences(slots, ["ref-1", "ref-2"]);

        expect(prepared).toEqual({
            "ref-1": {
                title: "Title 1",
                description: "Description 1",
            },
            "ref-2": {
                title: "Title 2",
                publication: "Publication 2",
            },
        });
    });

    it("returns empty slot entries when no meaningful overrides are found", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(false),
            render: vi.fn().mockResolvedValue(""),
        };

        const prepared = await prepareSlotsForReferences(slots, ["ref-1"]);

        expect(prepared).toEqual({
            "ref-1": {},
        });
    });

    it("handles empty reference ID list", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(false),
            render: vi.fn().mockResolvedValue(""),
        };

        const prepared = await prepareSlotsForReferences(slots, []);

        expect(prepared).toEqual({});
    });

    it("resolves all four slot types for a reference", async () => {
        const slotValues: Record<string, string> = {
            "title-ref-1": "Title Override",
            "description-ref-1": "Description Override",
            "publication-ref-1": "Publication Override",
            "institution-ref-1": "Institution Override",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        const prepared = await prepareSlotsForReferences(slots, ["ref-1"]);

        expect(prepared).toEqual({
            "ref-1": {
                title: "Title Override",
                description: "Description Override",
                publication: "Publication Override",
                institution: "Institution Override",
            },
        });
    });

    it("treats duplicate ids as one logical reference in the final output", async () => {
        const slotValues: Record<string, string> = {
            "title-ref-1": "Title Override",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        const prepared = await prepareSlotsForReferences(slots, ["ref-1", "ref-1"]);

        expect(prepared).toEqual({
            "ref-1": {
                title: "Title Override",
            },
        });
    });

    it("does not repeat slot-resolution work for duplicate ids", async () => {
        const slotValues: Record<string, string> = {
            "title-ref-1": "Title Override",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        await prepareSlotsForReferences(slots, ["ref-1", "ref-1"]);

        expect(slots.has).toHaveBeenCalledTimes(4);
        expect(slots.render).toHaveBeenCalledTimes(1);
        expect(slots.has.mock.calls.map(([name]) => name)).toEqual([
            "title-ref-1",
            "description-ref-1",
            "publication-ref-1",
            "institution-ref-1",
        ]);
    });
});
