import { describe, expect, it, vi } from "vitest";
import {
    hasMeaningfulTextContent,
    prepareSlotsForReferences,
    resolveOptionalSlot,
    resolveOptionalSlots,
} from "../reference-content";

describe("reference-content utilities", () => {
    it("detects meaningful plain text", () => {
        expect(hasMeaningfulTextContent("Texto")).toBe(true);
    });

    it("detects meaningful html with text", () => {
        expect(hasMeaningfulTextContent("<strong>Texto</strong>")).toBe(true);
    });

    it("rejects empty html", () => {
        expect(hasMeaningfulTextContent("   ")).toBe(false);
    });

    it("rejects comment-only html", () => {
        expect(hasMeaningfulTextContent("<!-- comentario -->")).toBe(false);
    });

    it("rejects tag-only and media-only html", () => {
        expect(hasMeaningfulTextContent("<span></span>")).toBe(false);
        expect(hasMeaningfulTextContent("<img src=\"x\" alt=\"\" />")).toBe(false);
    });

    it("rejects non-breaking-space entities as empty text", () => {
        expect(hasMeaningfulTextContent("&nbsp;")).toBe(false);
        expect(hasMeaningfulTextContent("&#160;")).toBe(false);
        expect(hasMeaningfulTextContent("&#xA0;")).toBe(false);
    });

    it("returns empty result when slot is absent", async () => {
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

    it("returns empty result when rendered slot is empty", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(true),
            render: vi.fn().mockResolvedValue("<!-- vacío -->"),
        };

        await expect(resolveOptionalSlot(slots, "title")).resolves.toEqual({
            kind: "empty",
            html: "",
        });
    });

    it("returns html when rendered slot is meaningful", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(true),
            render: vi.fn().mockResolvedValue("<em>Título</em>"),
        };

        await expect(resolveOptionalSlot(slots, "title")).resolves.toEqual({
            kind: "meaningful",
            html: "<em>Título</em>",
        });
    });

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
});
