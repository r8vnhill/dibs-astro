import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import TasksAsAbstractionsPage from "../index.astro";

describe.concurrent("tasks as abstractions lesson render", () => {
    test("renders the task abstraction bridge lesson route", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(
            TasksAsAbstractionsPage,
        );

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/tasks-as-abstractions/",
                ),
            },
        );
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Tareas como abstracciones de acciones repetibles");
        expect(normalizedHtml).toContain("/notes/scripting/tasks-as-abstractions/");
        expect(normalizedHtml).toContain(
            "La lección anterior mostró cómo un script de apoyo puede tener un contrato operativo",
        );
        expect(normalizedHtml).toContain("count-files");
        expect(normalizedHtml).toContain("summarize");
        expect(normalizedHtml).toMatch(/agregaremos una tercera tarea:[\s\S]*list/);
        expect(normalizedHtml).toContain("library-tasks.main.kts");
        expect(normalizedHtml).toContain("sistema de construcción");
        expect(normalizedHtml).toContain("Coding conventions");
        expect(normalizedHtml.indexOf("agregaremos una tercera tarea:")).toBeGreaterThan(
            normalizedHtml.indexOf("summarize"),
        );
    });
});
