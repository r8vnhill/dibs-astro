import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../test-utils/astro-render";
import HomePage from "../index.astro";

describe.concurrent("Home page render", () => {
    test("renders the main CTAs, roadmap states, and refined section headings", async () => {
        const renderHome = await createAstroRenderer<Record<string, never>>(HomePage);

        const html = await renderHome(
            {},
            { request: new Request("https://dibs.ravenhill.cl/") },
        );

        expect(html).toContain("Diseño e Implementación de Bibliotecas de Software");
        expect(html).toContain("href=\"/notes/\"");
        expect(html).toContain("Empezar por los apuntes");
        expect(html).toContain("Seguir el proyecto");
        expect(html).toContain("Mapa del sitio hoy");
        expect(html).toContain("Disponible hoy");
        expect(html).toContain("En desarrollo");
        expect(html).toContain("Próximamente");
        expect(html).toContain("Recorrido recomendado");
        expect(html).toContain("Cómo empezar sin perder contexto");
        expect(html).toContain("Seguir el proyecto");
        expect(html).toContain("Cómo empezar");
        expect(html).toContain("Herramientas necesarias");
        expect(html).toContain("Unidad 1");
    });
});
