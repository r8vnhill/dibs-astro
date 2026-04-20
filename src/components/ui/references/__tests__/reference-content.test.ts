import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
    prepareSlotsForReferences,
    resolveOptionalSlot,
    resolveOptionalSlots,
    resolveRequiredTitleField,
} from "../reference-content";
import { MissingReferenceTitleError } from "../ReferenceContractError";

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

    it("classifies rendered html through the shared domain-backed adapter path", async () => {
        const slots = {
            has: vi.fn().mockReturnValue(true),
            render: vi.fn().mockResolvedValue("<img src='x' alt='' />"),
        };

        await expect(resolveOptionalSlot(slots, "title")).resolves.toEqual({
            kind: "empty",
            html: "",
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

describe("resolveRequiredTitleField", () => {
    it("returns a valid title when slot content is meaningful", () => {
        expect(
            resolveRequiredTitleField(
                { kind: "meaningful", html: "<strong>Título</strong>" },
                undefined,
            ),
        ).toEqual({
            kind: "slot",
            html: "<strong>Título</strong>",
        });
    });

    it("maps the invalid title domain result to MissingReferenceTitleError", () => {
        expect(() => resolveRequiredTitleField({ kind: "empty", html: "" }, "   ")).toThrow(
            MissingReferenceTitleError,
        );
    });
});

describe("prepareSlotsForReferences", () => {
    it("requests all schema-derived slots for one id before the first pending render resolves", async () => {
        let releaseTitleRender: (() => void) | undefined;
        const renderedSlots = new Set(["title-ref-1", "description-ref-1", "publication-ref-1"]);

        const slots = {
            has: vi.fn().mockReturnValue(true),
            render: vi.fn((name: string) => {
                if (name === "title-ref-1") {
                    return new Promise<string>((resolve) => {
                        releaseTitleRender = () => resolve("Title Override");
                    });
                }

                return Promise.resolve(
                    renderedSlots.has(name) ? `${name} override` : "<!-- empty -->",
                );
            }),
        };

        const preparedPromise = prepareSlotsForReferences(slots, ["ref-1"]);

        await vi.waitFor(() => {
            expect(slots.render.mock.calls.map(([name]) => name)).toEqual([
                "title-ref-1",
                "description-ref-1",
                "publication-ref-1",
                "institution-ref-1",
            ]);
        });

        releaseTitleRender?.();

        await expect(preparedPromise).resolves.toEqual({
            "ref-1": {
                title: "Title Override",
                description: "description-ref-1 override",
                publication: "publication-ref-1 override",
            },
        });
    });

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

    it("queries exactly the schema-driven slot names for each unique id", async () => {
        const slotValues: Record<string, string> = {
            "title-ref-1": "Title Override",
            "publication-ref-2": "Publication Override",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        await prepareSlotsForReferences(slots, ["ref-1", "ref-2"]);

        expect(slots.has.mock.calls.map(([name]) => name)).toEqual([
            "title-ref-1",
            "description-ref-1",
            "publication-ref-1",
            "institution-ref-1",
            "title-ref-2",
            "description-ref-2",
            "publication-ref-2",
            "institution-ref-2",
        ]);
        expect(slots.has).not.toHaveBeenCalledWith("author-ref-1");
        expect(slots.has).not.toHaveBeenCalledWith("author-ref-2");
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

    it("deduplicates repeated ids while preserving first-seen output order", async () => {
        const slotValues: Record<string, string> = {
            "title-ref-2": "Title 2",
            "title-ref-1": "Title 1",
        };

        const slots = {
            has: vi.fn((name: string) => name in slotValues),
            render: vi.fn((name: string) => Promise.resolve(slotValues[name] ?? "")),
        };

        const prepared = await prepareSlotsForReferences(slots, ["ref-2", "ref-1", "ref-2"]);

        expect(Object.keys(prepared)).toEqual(["ref-2", "ref-1"]);
        expect(prepared).toEqual({
            "ref-2": {
                title: "Title 2",
            },
            "ref-1": {
                title: "Title 1",
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

    it("preserves literal id unions for readonly tuples and widens plain string arrays", () => {
        const slots = {
            has: vi.fn().mockReturnValue(false),
            render: vi.fn().mockResolvedValue(""),
        };

        const literalIds = ["ref-1", "ref-2"] as const;
        const widenedIds: string[] = ["ref-1", "ref-2"];

        expectTypeOf(prepareSlotsForReferences(slots, literalIds)).toEqualTypeOf<
            Promise<
                Record<"ref-1" | "ref-2", import("../reference-content").PreparedReferenceSlots>
            >
        >();
        expectTypeOf(prepareSlotsForReferences(slots, widenedIds)).toEqualTypeOf<
            Promise<Record<string, import("../reference-content").PreparedReferenceSlots>>
        >();
    });
});
