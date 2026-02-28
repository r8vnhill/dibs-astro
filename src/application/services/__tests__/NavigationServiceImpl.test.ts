import type { ILessonCatalog } from "$application/ports";
import { beforeEach, describe, expect, it } from "vitest";
import { NavigationServiceImpl } from "../NavigationServiceImpl";

/**
 * Tests para NavigationService (piloto).
 *
 * TDD: definir comportamiento esperado antes de implementar.
 * Nota: estos tests asumen que LessonCatalogAdapter está disponible.
 * En caso contrario, se mockea el puerto.
 */

describe("NavigationServiceImpl", () => {
    let navigationService: NavigationServiceImpl;
    let lessonCatalog: ILessonCatalog;

    beforeEach(() => {
        // Mock simple del catálogo de lecciones para pruebas
        lessonCatalog = {
            getCourseStructure: async () => [
                {
                    id: "unit1",
                    title: "Unit 1",
                    slug: "unit1",
                    children: [
                        {
                            id: "lesson1",
                            title: "Lesson 1",
                            slug: "lesson1",
                            href: "/notes/unit1/lesson1/",
                        },
                        {
                            id: "lesson2",
                            title: "Lesson 2",
                            slug: "lesson2",
                            href: "/notes/unit1/lesson2/",
                        },
                    ],
                },
                {
                    id: "unit2",
                    title: "Unit 2",
                    slug: "unit2",
                    children: [
                        {
                            id: "lesson3",
                            title: "Lesson 3",
                            slug: "lesson3",
                            href: "/notes/unit2/lesson3/",
                        },
                    ],
                },
            ],
            findByPath: async () => null, // no requerido para estos tests
            flatten: async () => {
                // Retorna lista plana esperada por resolveAutoNav
                return [
                    {
                        id: "lesson1",
                        title: "Lesson 1",
                        slug: "lesson1",
                        href: "/notes/unit1/lesson1/",
                    },
                    {
                        id: "lesson2",
                        title: "Lesson 2",
                        slug: "lesson2",
                        href: "/notes/unit1/lesson2/",
                    },
                    {
                        id: "lesson3",
                        title: "Lesson 3",
                        slug: "lesson3",
                        href: "/notes/unit2/lesson3/",
                    },
                ];
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

    it("debe normalizar hrefs con trailing slash", async () => {
        const result = await navigationService.resolveAutoNav("/notes/unit1/lesson1/");

        if (result.next) {
            expect(result.next.href).toMatch(/\/$/); // termina en /
        }
    });
});
