import { beforeAll, describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../test-utils/astro-render";
import HomePage from "../index.astro";

/**
 * Assertions run against `<main>` only, not the full page. The shared header (nav links, GitHub/
 * GitLab) is out of scope for this phase (see Non-goals) and still references legacy routes such
 * as `/lessons/`; scoping to `main` keeps this suite about what `index.astro` itself owns.
 */
let main: string;

describe("Home page render", () => {
    beforeAll(async () => {
        const renderHome = await createAstroRenderer<Record<string, never>>(HomePage);
        const html = await renderHome({}, { request: new Request("https://dibs.ravenhill.cl/") });
        const start = html.indexOf("<main");
        const end = html.indexOf("</main>") + "</main>".length;
        main = html.slice(start, end);
    });

    describe("Given the DIBS homepage", () => {
        test("then it identifies DIBS as a \"Curso online de nivel universitario\" and exposes exactly one primary heading", () => {
            expect(main).toContain("Curso online de nivel universitario");
            expect(main).toContain("Diseño e Implementación de Bibliotecas de Software");
            expect(main.match(/<h1[\s>]/g)).toHaveLength(1);
        });

        test("then it never describes DIBS as simply a \"curso universitario\"", () => {
            expect(main).not.toMatch(/(?<!nivel )curso universitario/i);
        });
    });

    describe("Given the current set of published learning surfaces", () => {
        test("then Notes is navigable from the primary CTA", () => {
            expect(main).toContain("href=\"/notes/\"");
            expect(main).toContain("Explorar apuntes");
        });

        test("then unavailable resources do not expose navigation", () => {
            expect(main).not.toContain("/syllabus/");
            expect(main).not.toContain("/bibliography/");
            expect(main).toContain("Temario · Próximamente");
            expect(main).toContain("Bibliografía · Próximamente");
        });

        test.each(["/lessons/", "/assignments/"])(
            "then %s is not linked from the homepage's own content",
            (path) => {
                expect(main).not.toContain(path);
            },
        );
    });

    describe("Given the reference-architecture section", () => {
        test.each([
            "Presentación",
            "Aplicación",
            "Dominio",
            "Infraestructura",
        ])("then %s is presented as an architectural responsibility", (layer) => {
            expect(main).toContain(layer);
        });

        test("then Domain is identified as the conceptual core", () => {
            expect(main).toContain("Núcleo conceptual");
        });

        test("then the architecture is framed as a reference, not a universal prescription", () => {
            expect(main).toContain("arquitectura de referencia");
        });
    });

    describe("Given the implementation-stack section", () => {
        test.each([
            "Astro",
            "Tailwind CSS",
            "Markdoc",
            "React Islands",
        ])("then %s is represented", (technology) => {
            expect(main).toContain(technology);
        });

        test.each([
            "Astro 5",
            "Tailwind CSS v4",
            "Tailwind CSS 4",
        ])("then the versioned label %s does not appear", (versioned) => {
            expect(main).not.toContain(versioned);
        });
    });

    describe("Given the previous roadmap-oriented homepage", () => {
        test.each([
            "Clases",
            "Tareas",
            "Curso y sitio en evolución",
            "Proyecto en construcción",
        ])("then the removed concept %s is absent from the homepage's own content", (concept) => {
            expect(main).not.toContain(concept);
        });
    });
});
