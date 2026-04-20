import { describe, expect, it } from "vitest";
import { resolveLessonMetadata } from "../lesson-metadata-bridge";

describe("lesson-metadata-bridge", () => {
    it("expone metadata serializable para rutas conocidas", async () => {
        const result = await resolveLessonMetadata("/notes/scripting/first-script/");

        expect(result).toBeDefined();
        expect(result?.authors).toBeInstanceOf(Array);
        expect(result?.changes).toBeInstanceOf(Array);
        expect(result).not.toHaveProperty("sourceFile");
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

        expect(result && Object.keys(result).sort()).toEqual(["authors", "changes", "lastModified"]);
        expect(result?.changes[0]).not.toHaveProperty("sourceFile");
    });

    it("devuelve undefined para rutas sin metadata", async () => {
        await expect(resolveLessonMetadata("/notes/unknown/")).resolves.toBeUndefined();
    });
});
