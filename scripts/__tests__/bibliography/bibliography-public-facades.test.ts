import { describe, expect, it } from "vitest";

describe("bibliography public facades", () => {
    it("exports the catalog builder facade", async () => {
        const module = await import("../../lib/bibliography-catalog-builder.mjs");

        expect(module).toHaveProperty("buildCatalogArtifactFromTurtle");
    });

    it("exports the records facade", async () => {
        const module = await import("../../lib/bibliography-catalog-builder.records.mjs");

        expect(module).toHaveProperty("createRecord");
        expect(module).toHaveProperty("scalarLiteral");
    });

    it("exports the graph facade", async () => {
        const module = await import("../../lib/bibliography-catalog-builder.graph.mjs");

        expect(module).toHaveProperty("buildReferenceNode");
        expect(module).toHaveProperty("sortGraphNodes");
    });

    it("exports the constants facade", async () => {
        const module = await import("../../lib/bibliography-catalog-builder.constants.mjs");

        expect(module).toHaveProperty("SCHEMA");
        expect(module).toHaveProperty("DIBS");
    });

    it("exports the validation facade", async () => {
        const module = await import("../../lib/bibliography-catalog-builder.validation.mjs");

        expect(module).toHaveProperty("abortValidation");
        expect(module).toHaveProperty("ensureNodeCategory");
    });
});
