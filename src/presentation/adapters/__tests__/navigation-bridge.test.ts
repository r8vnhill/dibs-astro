/**
 * @file navigation-bridge.test.ts
 *
 * Tests para el adaptador de presentación que conecta NotesLayout con Application layer.
 *
 * Estos tests verifican:
 * - Corrección de la adaptación de tipos NavigationResult → AutoNavResult
 * - Contrato público estable para NotesLayout
 * - Comportamiento correcto del servicio nuevo vía adaptador
 */

import { describe, expect, it } from "vitest";
import type { Lesson } from "~/data/course-structure";

/**
 * Estructura de curso simplificada para testing.
 * Usa el mismo formato que courseStructure real (kind, id, children).
 */
const mockCourseStructure: Lesson[] = [
    {
        kind: "group",
        id: "introduccion",
        title: "Unidad 1: Introducción",
        children: [
            {
                kind: "link",
                id: "conceptos-basicos",
                title: "Lección 1: Conceptos básicos",
                href: "/notes/introduccion/conceptos-basicos/",
            },
            {
                kind: "link",
                id: "configuracion",
                title: "Lección 2: Configuración",
                href: "/notes/introduccion/configuracion/",
            },
            {
                kind: "link",
                id: "primer-script",
                title: "Lección 3: Primer script",
                href: "/notes/introduccion/primer-script/",
            },
        ],
    },
];

describe("navigation-bridge", () => {
    describe("resolveAutoNav", () => {
        it("debe retornar undefined para previous en la primera lección", async () => {
            const { resolveAutoNav } = await import(
                "$presentation/adapters/navigation-bridge"
            );

            const result = await resolveAutoNav(
                "/notes/introduccion/conceptos-basicos/",
                mockCourseStructure,
            );

            expect(result.previous).toBeUndefined();
            expect(result.next).toBeDefined();
            expect(result.next?.title).toBe("Lección 2: Configuración");
        });

        it("debe retornar undefined para next en la última lección", async () => {
            const { resolveAutoNav } = await import(
                "$presentation/adapters/navigation-bridge"
            );

            const result = await resolveAutoNav(
                "/notes/introduccion/primer-script/",
                mockCourseStructure,
            );

            expect(result.next).toBeUndefined();
            expect(result.previous).toBeDefined();
            expect(result.previous?.title).toBe("Lección 2: Configuración");
        });

        it("debe retornar both previous y next para lecciones intermedias", async () => {
            const { resolveAutoNav } = await import(
                "$presentation/adapters/navigation-bridge"
            );

            const result = await resolveAutoNav(
                "/notes/introduccion/configuracion/",
                mockCourseStructure,
            );

            expect(result.previous).toBeDefined();
            expect(result.next).toBeDefined();
            expect(result.previous?.title).toBe("Lección 1: Conceptos básicos");
            expect(result.next?.title).toBe("Lección 3: Primer script");
        });

        it("debe retornar previous y next vacíos para ruta no encontrada", async () => {
            const { resolveAutoNav } = await import(
                "$presentation/adapters/navigation-bridge"
            );

            const result = await resolveAutoNav(
                "/notes/not-found/",
                mockCourseStructure,
            );

            expect(result.previous).toBeUndefined();
            expect(result.next).toBeUndefined();
        });

        it("debe retornar objetos con estructura { title, href }", async () => {
            const { resolveAutoNav } = await import(
                "$presentation/adapters/navigation-bridge"
            );

            const result = await resolveAutoNav(
                "/notes/introduccion/configuracion/",
                mockCourseStructure,
            );

            expect(result.previous).toHaveProperty("title");
            expect(result.previous).toHaveProperty("href");
            expect(result.next).toHaveProperty("title");
            expect(result.next).toHaveProperty("href");

            // Verificar trailing slashes
            expect(result.previous?.href).toMatch(/\/$/);
            expect(result.next?.href).toMatch(/\/$/);
        });

        it("debe exponer solo title y href en los enlaces públicos", async () => {
            const { resolveAutoNav } = await import(
                "$presentation/adapters/navigation-bridge"
            );

            const result = await resolveAutoNav(
                "/notes/introduccion/configuracion/",
                mockCourseStructure,
            );

            expect(result.previous).toEqual({
                title: "Lección 1: Conceptos básicos",
                href: "/notes/introduccion/conceptos-basicos/",
            });
            expect(result.next).toEqual({
                title: "Lección 3: Primer script",
                href: "/notes/introduccion/primer-script/",
            });
            expect(result.previous).not.toHaveProperty("slug");
            expect(result.next).not.toHaveProperty("slug");
        });
    });
});
