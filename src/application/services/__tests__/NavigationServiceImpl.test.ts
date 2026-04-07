import type { ILessonCatalog } from "$application/ports";
import type { NavigationResult } from "$application/ports/NavigationService";
import { beforeEach, describe, expect, it } from "vitest";
import { NavigationServiceImpl } from "../NavigationServiceImpl";

/**
 * Tests para NavigationServiceImpl.
 *
 * Ahora que el servicio delega a findAdjacentByHref,
 * verificamos que:
 * 1. El servicio correctamente invoca el catálogo
 * 2. Los resultados se pasan sin modificación
 * 3. La delegación es transparente
 *
 * Nota: la lógica de normalización y búsqueda se prueба completamente
 * en LessonCatalogAdapter.test.ts con PBT + DDT.
 */

describe("NavigationServiceImpl", () => {
    let navigationService: NavigationServiceImpl;
    let lessonCatalog: ILessonCatalog;

    beforeEach(() => {
        // Mock del catálogo que implementa findAdjacentByHref
        lessonCatalog = {
            getCourseStructure: async () => [],
            findByPath: async () => null,
            flatten: async () => [],
            // Simulamos respuestas pre-calculadas sin hacer flatten() internamente
            findAdjacentByHref: async (href: string): Promise<NavigationResult> => {
                const responses: { [key: string]: NavigationResult } = {
                    "/notes/unit1/lesson1/": {
                        next: {
                            title: "Lesson 2",
                            slug: "lesson2",
                            href: "/notes/unit1/lesson2/",
                        },
                    },
                    "/notes/unit1/lesson2/": {
                        previous: {
                            title: "Lesson 1",
                            slug: "lesson1",
                            href: "/notes/unit1/lesson1/",
                        },
                        next: {
                            title: "Lesson 3",
                            slug: "lesson3",
                            href: "/notes/unit2/lesson3/",
                        },
                    },
                    "/notes/unit2/lesson3/": {
                        previous: {
                            title: "Lesson 2",
                            slug: "lesson2",
                            href: "/notes/unit1/lesson2/",
                        },
                    },
                };
                return responses[href] ?? {};
            },
        };

        navigationService = new NavigationServiceImpl(lessonCatalog);
    });

    it("debe retornar undefined para previous en la primera lección", async () => {
        const result = await navigationService.resolveAutoNav("/notes/unit1/lesson1/");

        expect(result.previous).toBeUndefined();
        expect(result.next).toBeDefined();
        expect(result.next?.slug).toBe("lesson2");
    });

    it("debe retornar previous y next para una lección del medio", async () => {
        const result = await navigationService.resolveAutoNav("/notes/unit1/lesson2/");

        expect(result.previous).toBeDefined();
        expect(result.previous?.slug).toBe("lesson1");
        expect(result.next).toBeDefined();
        expect(result.next?.slug).toBe("lesson3");
    });

    it("debe retornar undefined para next en la última lección", async () => {
        const result = await navigationService.resolveAutoNav("/notes/unit2/lesson3/");

        expect(result.previous).toBeDefined();
        expect(result.previous?.slug).toBe("lesson2");
        expect(result.next).toBeUndefined();
    });

    it("debe retornar objeto vacío para una ruta no encontrada", async () => {
        const result = await navigationService.resolveAutoNav(
            "/notes/unknown/path/",
        );

        expect(result.previous).toBeUndefined();
        expect(result.next).toBeUndefined();
    });

    it("debe delegar correctamente a findAdjacentByHref sin modificar resultado", async () => {
        // El servicio es ahora transparente: solo pasa a través del resultado del catálogo
        const result = await navigationService.resolveAutoNav("/notes/unit1/lesson1/");

        // Verificar que el formato NavigationResult es correcto
        if (result.next) {
            expect(result.next).toHaveProperty("title");
            expect(result.next).toHaveProperty("slug");
            expect(result.next).toHaveProperty("href");
            expect(result.next.href).toMatch(/\/$/); // tiene trailing slash
        }
    });
});
