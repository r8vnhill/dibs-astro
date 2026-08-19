import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import {
    cyclicDependencyCounterexample,
    packageReportSelectedGraph,
    taskDependencyGraph,
    taskGraphDiagramSpecs,
    verifyReportSelectedGraph,
} from "~/lib/diagrams/task-graph-examples";
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

    test("then the cyclic counterexample is explained as not representing a valid task order", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Ninguna de las tres tareas puede quedar lista");
        expect(normalizedHtml).toContain("Acíclico");
        expect(normalizedHtml).toContain(cyclicDependencyCounterexample.description);
    });

    test("then requesting packageReport and verifyReport selects two different task graphs", async () => {
        const { doc } = await renderLesson();
        const packageFigure = doc.querySelector(
            `figure[data-diagram-id="${packageReportSelectedGraph.id}"]`,
        );
        const verifyFigure = doc.querySelector(
            `figure[data-diagram-id="${verifyReportSelectedGraph.id}"]`,
        );
        const packageSvgText = packageFigure?.querySelector("svg")?.textContent ?? "";
        const verifySvgText = verifyFigure?.querySelector("svg")?.textContent ?? "";

        expect(packageSvgText).toContain("packageReport");
        expect(packageSvgText).not.toContain("verifyReport");
        expect(verifySvgText).toContain("verifyReport");
        expect(verifySvgText).not.toContain("packageReport");
    });

    test("then it distinguishes the build description from the task graph selected for one invocation", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("descripción del build");
        expect(normalizedHtml).toContain("tarea solicitada");
        expect(normalizedHtml).toContain(
            "El build puede conocer muchas tareas, pero una ejecución necesita solo la tarea solicitada",
        );
    });

    test("then it realizes the task graph as a minimal Gradle build", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("tasks.register");
        expect(normalizedHtml).toContain("dependsOn");
        expect(normalizedHtml).toContain("./gradlew packageReport --task-graph");
        expect(normalizedHtml).toContain("./gradlew verifyReport --task-graph");
    });

    test("then the Gradle realization keeps advanced build concepts out of the main path", async () => {
        const { doc } = await renderLesson();
        const article = doc.querySelector("article")?.textContent ?? "";

        expect(article).not.toContain("Provider");
        expect(article).not.toContain("plugins {");
        expect(article).not.toContain("inputs.");
        expect(article).not.toContain("outputs.");
        expect(article).not.toContain("sourceSets");
        expect(article).not.toContain("variant");
    });
});
