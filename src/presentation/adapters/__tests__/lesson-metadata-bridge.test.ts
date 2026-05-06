import { describe, expect, it } from "vitest";
import { resolveLessonMetadata } from "../lesson-metadata-bridge";

describe("lesson-metadata-bridge", () => {
    it("expone metadata serializable para rutas conocidas", async () => {
        const result = await resolveLessonMetadata("/notes/scripting/first-script/");

        expect(result.kind).toBe("found");
        expect(result.kind === "found" ? result.metadata.authors : undefined).toBeInstanceOf(Array);
        expect(result.kind === "found" ? result.metadata.changes : undefined).toBeInstanceOf(Array);
        expect(result.kind === "found" ? result.metadata : {}).not.toHaveProperty("sourceFile");
    });

    it("normaliza rutas crudas y URLs completas al mismo DTO canónico", async () => {
        const canonical = await resolveLessonMetadata("/notes/scripting/first-script/");
        const rawPath = await resolveLessonMetadata("notes/scripting/first-script");
        const fullUrl = await resolveLessonMetadata("https://dibs.ravenhill.cl/notes/scripting/first-script");

        expect(rawPath).toEqual(canonical);
        expect(fullUrl).toEqual(canonical);
    });

    it("expone solo campos DTO para la capa de presentación", async () => {
        const result = await resolveLessonMetadata("/notes/scripting/first-script/");

        expect(result.kind === "found" ? Object.keys(result.metadata).sort() : []).toEqual([
            "authors",
            "changes",
            "lastModified",
        ]);
        expect(result.kind === "found" ? result.metadata.changes[0] : {}).not.toHaveProperty("sourceFile");
    });

    it("devuelve missing para rutas sin metadata", async () => {
        await expect(resolveLessonMetadata("/notes/unknown/")).resolves.toMatchObject({
            kind: "missing",
        });
    });
});
