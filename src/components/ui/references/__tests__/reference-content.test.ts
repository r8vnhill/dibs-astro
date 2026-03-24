import { describe, expect, it, vi } from "vitest";
import { hasMeaningfulContent, resolveOptionalSlot } from "../reference-content";

describe("reference-content utilities", () => {
    it("detects meaningful plain text", () => {
        expect(hasMeaningfulContent("Texto")).toBe(true);
    });

    it("detects meaningful html with text", () => {
        expect(hasMeaningfulContent("<strong>Texto</strong>")).toBe(true);
    });

    it("rejects empty html", () => {
        expect(hasMeaningfulContent("   ")).toBe(false);
    });

    it("rejects comment-only html", () => {
        expect(hasMeaningfulContent("<!-- comentario -->")).toBe(false);
    });

    it("returns empty result when slot is absent", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(false),
            render: vi.fn(),
        };

        await expect(resolveOptionalSlot(slots, "title")).resolves.toEqual({
            hasContent: false,
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
            hasContent: false,
            html: "<!-- vacío -->",
        });
    });

    it("returns html when rendered slot is meaningful", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(true),
            render: vi.fn().mockResolvedValue("<em>Título</em>"),
        };

        await expect(resolveOptionalSlot(slots, "title")).resolves.toEqual({
            hasContent: true,
            html: "<em>Título</em>",
        });
    });
});
