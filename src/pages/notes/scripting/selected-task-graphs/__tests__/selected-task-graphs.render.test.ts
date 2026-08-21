import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import { packageReportSelectedGraph, verifyReportSelectedGraph } from "~/lib/diagrams/task-graph-examples";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import SelectedTaskGraphsPage from "../index.astro";

async function renderLesson(): Promise<{ html: string; doc: Document }> {
    const renderPage = await createAstroRenderer<Record<string, never>>(SelectedTaskGraphsPage);
    const html = await renderPage(
        {},
        {
            request: new Request("https://dibs.ravenhill.cl/notes/scripting/selected-task-graphs/"),
        },
    );
    return { html, doc: new JSDOM(html).window.document };
}

suite("given the conceptual task graph lesson has established a DAG", () => {
    test("then the selected-graph lesson starts from the previous outcome without reteaching it", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Grafo seleccionado y Gradle");
        expect(normalizedHtml).toContain("modelo completo");
        expect(normalizedHtml).toContain("dependencias directas e indirectas");
        expect(normalizedHtml).toContain("tarea solicitada");
    });

    test.each([
        packageReportSelectedGraph,
        verifyReportSelectedGraph,
    ])("then it renders the selected diagram $id as accessible inline SVG", async (spec) => {
        const { doc } = await renderLesson();
        const figure = doc.querySelector("figure[data-diagram-id=\"" + spec.id + "\"]");

        expect(figure).not.toBeNull();
        expect(figure?.querySelector("svg")).not.toBeNull();
        expect(figure?.textContent).toContain(spec.title);
        expect(figure?.textContent).toContain(spec.description);
    });

    test("then it distributes one question to selected-graph reasoning and one to Gradle observation", async () => {
        const { doc } = await renderLesson();
        const questions = doc.querySelectorAll("[data-callout][data-variant=\"question\"]");
        const selectedQuestion = doc.querySelector("#h2-selected-task-graph [data-callout][data-variant=\"question\"]");
        const gradleQuestion = doc.querySelector("#h2-gradle-realization [data-callout][data-variant=\"question\"]");

        expect(questions.length).toBe(2);
        expect(selectedQuestion).not.toBeNull();
        expect(selectedQuestion?.textContent?.toLowerCase()).toContain("qué tareas pertenecen al grafo");
        expect(gradleQuestion).not.toBeNull();
        expect(gradleQuestion?.textContent).toContain("--task-graph");
        expect(selectedQuestion?.querySelector("[data-callout][data-variant=\"solution\"][data-embedded=\"true\"]"))
            .not.toBeNull();
        expect(gradleQuestion?.querySelector("[data-callout][data-variant=\"solution\"][data-embedded=\"true\"]"))
            .not.toBeNull();
    });

    test("then it realizes both requested graphs in Gradle and exposes the dependsOn limitation", async () => {
        const { html, doc } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");
        const warning = doc.querySelector("[data-callout][data-variant=\"warning\"]");

        expect(normalizedHtml).toContain("tasks.register");
        expect(normalizedHtml).toContain("dependsOn");
        expect(normalizedHtml).toContain("./gradlew packageReport --task-graph");
        expect(normalizedHtml).toContain("./gradlew verifyReport --task-graph");
        expect(normalizedHtml).toContain("simplificación pedagógica");
        expect(normalizedHtml).toContain("inputs y outputs");
        expect(warning?.textContent).toContain("productor–consumidor");
    });

    test("then the lesson bridges from graph selection to dataflow", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("output del productor -> input del consumidor");
        expect(normalizedHtml).toContain("qué produce cada tarea y quién necesita ese resultado");
        expect(normalizedHtml).toContain("Grafo de tareas más allá de Gradle");
        expect(normalizedHtml).toContain("El grafo también tiene un costo");
    });

    test("then the Gradle code remains linked to the companion project", async () => {
        const { doc } = await renderLesson();
        const sourceLinks = Array.from(doc.querySelectorAll("a.dibs-source-link"))
            .map((a) => a.getAttribute("href") ?? "");

        expect(sourceLinks.some((href) =>
            href.includes("kotlin-companion")
            && href.includes("gradle/task-graph/build.gradle.kts")
        )).toBe(true);
    });
});
