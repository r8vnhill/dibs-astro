import { describe, expect, it, vi } from "vitest";
import {
    hasMeaningfulTextContent,
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
