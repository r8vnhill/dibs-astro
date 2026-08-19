import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import TaskGraphsPage from "../index.astro";

suite("given the task-abstraction lesson has introduced named tasks", () => {
    test("then the task-graphs lesson establishes the dependency model", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(TaskGraphsPage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/task-graphs/",
                ),
            },
        );
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain(
            "De tareas a grafos: cómo coordinar un proceso de construcción",
        );
        expect(normalizedHtml).toContain("/notes/scripting/tasks-as-abstractions/");
        expect(normalizedHtml).toContain("Ahora aparece una pregunta nueva");
        expect(normalizedHtml).toContain("Cuando una tarea necesita de otra");
        expect(normalizedHtml).toContain("Sistema de construcción");
        expect(normalizedHtml).toContain("Grafo dirigido y acíclico");
        expect(normalizedHtml).toContain("Grafo de tareas");
        expect(normalizedHtml).toContain("generateReport");
        expect(normalizedHtml).toContain("prepareCatalog");
        expect(normalizedHtml).not.toContain("Gradle");
    });
});
