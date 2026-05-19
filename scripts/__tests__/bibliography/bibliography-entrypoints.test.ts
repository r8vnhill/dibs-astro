import { describe, expect, it } from "vitest";

describe("bibliography script library entrypoints", () => {
    it("exports the catalog builder entrypoint", async () => {
        const module = await import("../../lib/bibliography/catalog-builder.mjs");

        expect(module).toHaveProperty("buildCatalogArtifactFromTurtle");
    });

    it("exports the records entrypoint", async () => {
        const module = await import("../../lib/bibliography/reader/records.mjs");

        expect(module).toHaveProperty("createRecord");
        expect(module).toHaveProperty("scalarLiteral");
    });

    it("exports the graph entrypoint", async () => {
        const module = await import("../../lib/bibliography/graph/index.mjs");

        expect(module).toHaveProperty("buildReferenceNode");
        expect(module).toHaveProperty("sortGraphNodes");
    });

    it("exports the constants entrypoint", async () => {
        const module = await import("../../lib/bibliography/shared/constants.mjs");

        expect(module).toHaveProperty("SCHEMA");
        expect(module).toHaveProperty("DIBS");
    });

    it("exports the validation entrypoint", async () => {
        const module = await import("../../lib/bibliography/reader/validation.mjs");

        expect(module).toHaveProperty("abortValidation");
        expect(module).toHaveProperty("ensureNodeCategory");
    });
});
