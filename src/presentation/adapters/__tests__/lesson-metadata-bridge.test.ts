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

    it("devuelve undefined para rutas sin metadata", async () => {
        await expect(resolveLessonMetadata("/notes/unknown/")).resolves.toBeUndefined();
    });
});
