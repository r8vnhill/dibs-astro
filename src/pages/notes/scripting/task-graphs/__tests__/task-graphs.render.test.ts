import { getDefaultBibliographyCatalog } from "$presentation/adapters/bibliography-catalog";
import { getTaskGraphsReadings } from "$presentation/adapters/lesson-readings";
import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import {
    cyclicDependencyCounterexample,
    taskDependencyGraph,
    taskGraphDiagramSpecs,
} from "~/lib/diagrams/task-graph-examples";
import { resolveLessonReadings } from "~/lib/readings/lesson-readings-contract";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import TaskGraphsPage from "../index.astro";

async function renderLesson(): Promise<{ html: string; doc: Document }> {
    const renderPage = await createAstroRenderer<Record<string, never>>(TaskGraphsPage);
    const html = await renderPage(
        {},
        {
            request: new Request("https://dibs.ravenhill.cl/notes/scripting/task-graphs/"),
        },
    );
    return { html, doc: new JSDOM(html).window.document };
}

suite("given the task-abstraction lesson has introduced named tasks", () => {
    test("then the task-graphs lesson establishes the dependency model", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Dependencias y grafos de tareas");
        expect(normalizedHtml).toContain("/notes/scripting/tasks-as-abstractions/");
        expect(normalizedHtml).toContain("Dependencias entre tareas");
        expect(normalizedHtml).toContain("Sistema de construcción");
        expect(normalizedHtml).toContain("Grafo dirigido y acíclico");
        expect(normalizedHtml).toContain("grafo de tareas");
        expect(normalizedHtml).toContain("generateReport");
        expect(normalizedHtml).toContain("prepareCatalog");
        expect(normalizedHtml).toContain("modelar las tareas y sus relaciones explícitamente");
        expect(normalizedHtml).not.toContain("tarea -> tarea requerida");
    });

    test("then the task lookup notation is centered", async () => {
        const { doc } = await renderLesson();
        const notation = Array.from(doc.querySelectorAll("p.text-center")).find((paragraph) =>
            paragraph.textContent?.includes("nombre de tarea -> tarea")
        );

        expect(notation).not.toBeUndefined();
    });

    test.each(taskGraphDiagramSpecs)(
        "then it renders the dependency diagram $id as accessible inline SVG",
        async (spec) => {
            const { doc } = await renderLesson();
            const figure = doc.querySelector(`figure[data-diagram-id="${spec.id}"]`);

            expect(figure).not.toBeNull();
            expect(figure?.querySelector("svg")).not.toBeNull();
            expect(figure?.textContent).toContain(spec.title);
            expect(figure?.textContent).toContain(spec.description);
        },
    );

    test("then the branching dependency graph connects every task in one consistent direction", async () => {
        const { doc } = await renderLesson();
        const figure = doc.querySelector(`figure[data-diagram-id="${taskDependencyGraph.id}"]`);
        const svgText = figure?.querySelector("svg")?.textContent ?? "";

        expect(svgText).toContain("prepareCatalog");
        expect(svgText).toContain("generateReport");
        expect(svgText).toContain("packageReport");
        expect(svgText).toContain("verifyReport");
    });

    test("then the cyclic counterexample is explained as incompatible precedence constraints", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("No existe una primera tarea que permita satisfacer las tres condiciones");
        expect(normalizedHtml).toContain("Ciclo dirigido");
        expect(normalizedHtml).toContain(cyclicDependencyCounterexample.description);
    });

    test("then the DAG is presented as precedence constraints with multiple valid topological orders", async () => {
        const { html, doc } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");
        const topologicalSectionText = doc.querySelector("#h2-topological-orders")?.textContent ?? "";

        expect(normalizedHtml).toContain("Un DAG puede admitir más de un orden válido");
        expect(normalizedHtml).toContain("Orden topológico");
        expect(normalizedHtml).toContain("Tareas incomparables");
        expect(normalizedHtml).toContain("No basta con buscar una flecha directa");
        expect(normalizedHtml).toContain("Orden topológico ≠ orden observado de ejecución");
        expect(normalizedHtml).toContain("no existe un camino dirigido");
        expect(normalizedHtml).toContain("ejecuten en paralelo");
        expect(topologicalSectionText).toContain("prepareCatalog");
        expect(topologicalSectionText).toContain("generateReport");
        expect(topologicalSectionText).toContain("packageReport");
        expect(topologicalSectionText).toContain("verifyReport");
    });

    test("then the conceptual lesson keeps its three questions before the extraction boundary", async () => {
        const { doc } = await renderLesson();
        const questions = doc.querySelectorAll("[data-callout][data-variant=\"question\"]");

        expect(questions.length).toBe(3);
        expect(doc.querySelector("#h2-task-dependencies [data-callout][data-variant=\"question\"]")).not.toBeNull();
        expect(doc.querySelector("#h2-directed-acyclic-shape [data-callout][data-variant=\"question\"]"))
            .not.toBeNull();
        expect(doc.querySelector("#h2-topological-orders [data-callout][data-variant=\"question\"]")).not.toBeNull();
        expect(doc.querySelector("#h2-selected-task-graph")).toBeNull();
        expect(doc.querySelector("#h2-gradle-realization")).toBeNull();
    });

    test("then its readings keep Gradle sources essential and research sources in deeper sections", () => {
        const resolution = resolveLessonReadings(getTaskGraphsReadings(), getDefaultBibliographyCatalog());

        expect(resolution.ok).toBe(true);
        if (!resolution.ok) return;

        expect(new Set(resolution.value.sections[0]?.readings.map((reading) => reading.referenceId))).toEqual(
            new Set([
                "ref:gradle-build-lifecycle",
                "ref:gradle-task-configuration-avoidance",
                "ref:gradle-controlling-task-execution",
                "ref:gradle-command-line-interface",
            ]),
        );
        expect(new Set(resolution.value.sections[1]?.readings.map((reading) => reading.referenceId))).toEqual(
            new Set([
                "ref:build-systems-a-la-carte-2018",
                "ref:introduction-to-algorithms-2022",
                "ref:mathematics-for-computer-science-2018",
            ]),
        );
        expect(new Set(resolution.value.sections[2]?.readings.map((reading) => reading.referenceId))).toEqual(
            new Set(["ref:build-scripts-perfect-dependencies-2020"]),
        );
    });

    test("then it renders catalog-backed citations and the next conceptual step", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Gradle, Inc. (s. f.)");
        expect(normalizedHtml).toContain("Mokhov et al. (2018)");
        expect(normalizedHtml).toContain("Cormen et al. (2022, cap. 20, §20.1)");
        expect(normalizedHtml).toContain("arista dirigida");
        expect(normalizedHtml).toContain("tarea");
        expect(normalizedHtml).toContain("dependencia");
        expect(normalizedHtml).toContain("incomparables");
        expect(normalizedHtml).toContain("orden parcial");
        expect(normalizedHtml).toContain("directamente");
        expect(normalizedHtml).toContain("indirectamente");
        expect(normalizedHtml).toContain("Durante esta lección usaremos siempre la misma convención");
        expect(normalizedHtml).toContain("restricciones de precedencia");
        expect(normalizedHtml).toContain("grafo seleccionado");
    });

    test("then it links to the lesson-specific readings page", async () => {
        const { doc } = await renderLesson();
        const readingsPath = "/readings/scripting/task-graphs/";
        const readingsLink = doc.querySelector(`a[href="${readingsPath}"]`);

        expect(readingsLink).not.toBeNull();
        expect(readingsLink?.textContent).toContain("Ver lecturas complementarias");
    });

    test("then the old exercise corpus is no longer rendered", async () => {
        const { html } = await renderLesson();
        expect(html).not.toContain("finalizeReport");
        expect(html).not.toContain("extended-task-graph-with-finalize");
    });
});
