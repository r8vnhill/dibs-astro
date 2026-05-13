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

        expect(html).toContain("Tareas como abstracciones de acciones repetibles");
        expect(html).toContain("/notes/scripting/tasks-as-abstractions/");
        expect(html).toContain("unidad de trabajo nombrada");
        expect(html).toContain("Función, script y tarea");
        expect(html).toContain("library-tasks.main.kts");
        expect(html).toContain("sistemas de construcción");
    });
});
