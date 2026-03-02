import { describe, expect, it } from "vitest";
import { LessonCatalogAdapter } from "../LessonCatalogAdapter";

/**
 * Tests para LessonCatalogAdapter (implementación de infraestructura).
 *
 * Valida que el adaptador convierte correctamente courseStructure
 * a la interfaz ILessonCatalog.
 */

describe("LessonCatalogAdapter", () => {
    const adapter = new LessonCatalogAdapter();

    it("debe retornar la estructura del curso", async () => {
        const structure = await adapter.getCourseStructure();

        expect(Array.isArray(structure)).toBe(true);
        expect(structure.length).toBeGreaterThan(0);
    });

    it("debe aplanar la estructura en una lista lineal", async () => {
        const flattened = await adapter.flatten();

        expect(Array.isArray(flattened)).toBe(true);
        expect(flattened.length).toBeGreaterThan(0);

        // Verificar que todos tengan slug
        flattened.forEach((lesson) => {
            expect(lesson.slug).toBeDefined();
            expect(lesson.title).toBeDefined();
            expect(lesson.id).toBeDefined();
        });
    });

    it("debe buscar una lección por route (href)", async () => {
        const lesson = await adapter.findByPath("/notes/");

        expect(lesson).toBeDefined();
        if (lesson) {
            expect(lesson.title.length).toBeGreaterThan(0);
            expect(lesson.id).toBeDefined();
        }
    });

    it("debe retornar null para una ruta inexistente", async () => {
        const lesson = await adapter.findByPath("/notes/nonexistent/");

        expect(lesson).toBeNull();
    });

    it("debe preservar el orden de la estructura en flatten", async () => {
        const flattened = await adapter.flatten();
        const structure = await adapter.getCourseStructure();

        // La primera lección aplanada debe corresponder a la raíz
        expect(flattened.length).toBeGreaterThan(0);
        expect(structure.length).toBeGreaterThan(0);

        // Simplemente verificar que ambas retornan datos en el mismo orden
        if (flattened[0] && structure[0]) {
            expect(flattened[0].id).toBe(structure[0].id);
        }
    });
});
