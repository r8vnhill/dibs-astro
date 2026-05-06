import { AdjacentLessons } from "../adjacent-lessons";
import { LessonHref } from "../lesson-href";
import { NavigationService } from "../navigation-service";
import type { LessonNavigationRepository } from "../repositories";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Tests para NavigationService.
 *
 * Ahora que el servicio delega a un repositorio de navegación de dominio,
 * verificamos que:
 * 1. El servicio canonicaliza el pathname en el borde de aplicación
 * 2. La delegación se hace a través del contrato de dominio
 * 3. El resultado expuesto mantiene solo { title, href }
 *
 * Nota: la lógica de normalización y búsqueda se prueba completamente
 * en LessonCatalogAdapter.test.ts con PBT + DDT.
 */

describe("NavigationService", () => {
    let navigationService: NavigationService;
    let lessonNavigationRepository: LessonNavigationRepository;
    let receivedHref: LessonHref | undefined;

    beforeEach(() => {
        lessonNavigationRepository = {
            findAdjacentTo: async (href: LessonHref) => {
                receivedHref = href;
                const responses: Record<string, AdjacentLessons> = {
                    "/notes/unit1/lesson1/": AdjacentLessons.create(
                        undefined,
                        { title: "Lesson 2", slug: "lesson2", href: "/notes/unit1/lesson2/" },
                    ),
                    "/notes/unit1/lesson2/": AdjacentLessons.create(
                        { title: "Lesson 1", slug: "lesson1", href: "/notes/unit1/lesson1/" },
                        { title: "Lesson 3", slug: "lesson3", href: "/notes/unit2/lesson3/" },
                    ),
                    "/notes/unit2/lesson3/": AdjacentLessons.create(
                        { title: "Lesson 2", slug: "lesson2", href: "/notes/unit1/lesson2/" },
                    ),
                };
                return responses[href.value] ?? AdjacentLessons.create();
            },
        };

        navigationService = new NavigationService(lessonNavigationRepository);
        receivedHref = undefined;
    });

    it("debe retornar undefined para previous en la primera lección", async () => {
        const result = await navigationService.resolveAutoNav("/notes/unit1/lesson1/");

        expect(result.previous).toBeUndefined();
        expect(result.next).toBeDefined();
        expect(result.next?.href).toBe("/notes/unit1/lesson2/");
    });

    it("debe retornar previous y next para una lección del medio", async () => {
        const result = await navigationService.resolveAutoNav("/notes/unit1/lesson2/");

        expect(result.previous).toBeDefined();
        expect(result.previous?.href).toBe("/notes/unit1/lesson1/");
        expect(result.next).toBeDefined();
        expect(result.next?.href).toBe("/notes/unit2/lesson3/");
    });

    it("debe retornar undefined para next en la última lección", async () => {
        const result = await navigationService.resolveAutoNav("/notes/unit2/lesson3/");

        expect(result.previous).toBeDefined();
        expect(result.previous?.href).toBe("/notes/unit1/lesson2/");
        expect(result.next).toBeUndefined();
    });

    it("debe retornar objeto vacío para una ruta no encontrada", async () => {
        const result = await navigationService.resolveAutoNav(
            "/notes/unknown/path/",
        );

        expect(result.previous).toBeUndefined();
        expect(result.next).toBeUndefined();
    });

    it("canonicaliza el pathname antes de delegar al repositorio", async () => {
        const result = await navigationService.resolveAutoNav(
            " notes//unit1/lesson1?lang=es#intro ",
        );

        expect(receivedHref?.value).toBe("/notes/unit1/lesson1/");
        expect(result.next).toEqual({
            title: "Lesson 2",
            href: "/notes/unit1/lesson2/",
        });
    });

    it("expone un resultado sin slug", async () => {
        const result = await navigationService.resolveAutoNav("/notes/unit1/lesson1/");

        expect(result.next).toEqual({
            title: "Lesson 2",
            href: "/notes/unit1/lesson2/",
        });
        expect(result.next).not.toHaveProperty("slug");
    });
});
