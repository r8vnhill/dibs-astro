import { getDefaultBibliographyCatalog } from "$presentation/adapters/bibliography-catalog";
import { getTaskGraphsReadings } from "$presentation/adapters/lesson-readings";
import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import {
    cyclicDependencyCounterexample,
    packageReportSelectedGraph,
    taskDependencyGraph,
    taskGraphDiagramSpecs,
    verifyReportSelectedGraph,
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

        expect(normalizedHtml).toContain("Grafos de tareas y sistemas de construcción");
        expect(normalizedHtml).toContain("/notes/scripting/tasks-as-abstractions/");
        expect(normalizedHtml).toContain("Dependencias entre tareas");
        expect(normalizedHtml).toContain("Sistema de construcción");
        expect(normalizedHtml).toContain("Grafo dirigido y acíclico");
        expect(normalizedHtml).toContain("Grafo de tareas");
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

        expect(normalizedHtml).toContain("Descripción del build:");
        expect(normalizedHtml).toContain("Tarea solicitada:");
        expect(normalizedHtml).toContain(
            "El grafo seleccionado no es una propiedad fija del build",
        );
    });

    test("then it distinguishes the task graph from an execution trace", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Grafo ≠ traza de ejecución");
        expect(normalizedHtml).toContain("no describe qué ocurrió realmente");
        expect(normalizedHtml).toContain(
            "no volver a ejecutar sus acciones si el sistema determina que su resultado ya está disponible",
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

    test("then its question and solution render as one typography hierarchy", async () => {
        const { doc } = await renderLesson();
        const question = doc.querySelector("[data-callout][data-variant=question]");
        const solution = question?.querySelector("[data-callout][data-variant=solution]");

        expect(question?.querySelector("h3")).not.toBeNull();
        expect(solution?.getAttribute("data-embedded")).toBe("true");
        expect(solution?.querySelector("h4")).not.toBeNull();
        expect(solution?.querySelector(".callout__body")?.classList.contains("mt-3")).toBe(false);
    });

    test("then each graph concept is followed by its own embedded question and solution", async () => {
        const { doc } = await renderLesson();
        const contracts = [
            ["h2-task-dependencies", "¿cuáles tareas dependen de qué otras?"],
            ["h2-directed-acyclic-shape", "¿por qué no existe un orden"],
            ["h2-topological-orders", "¿debe ejecutarse"],
            ["h2-selected-task-graph", "¿qué tareas pertenecen al grafo"],
            ["h2-gradle-realization", "¿qué nos permite verificar la salida"],
        ] as const;
        const questions = doc.querySelectorAll("[data-callout][data-variant=\"question\"]");

        expect(questions.length).toBe(5);

        for (const [sectionId, questionMarker] of contracts) {
            const section = doc.querySelector(`#${sectionId}`);
            const question = section?.querySelector("[data-callout][data-variant=\"question\"]");
            const solution = question?.querySelector(
                "[data-callout][data-variant=\"solution\"][data-embedded=\"true\"]",
            );

            expect(question).not.toBeNull();
            expect(question?.textContent?.toLowerCase()).toContain(questionMarker);
            expect(solution).not.toBeNull();
            expect(solution?.querySelector("h4")).not.toBeNull();
        }
    });

    test("then it labels explicit dependsOn wiring as pedagogical and previews dataflow practice", async () => {
        const { doc } = await renderLesson();
        const warning = Array.from(doc.querySelectorAll("[data-callout][data-variant=\"warning\"]")).find((callout) =>
            callout.querySelector("a[href=\"https://docs.gradle.org/current/userguide/best_practices_tasks.html\"]")
        );
        const warningText = warning?.textContent ?? "";

        expect(warningText).toContain("simplificación pedagógica");
        expect(warningText).toContain("inputs y outputs");
        expect(
            warning?.querySelector("a[href=\"https://docs.gradle.org/current/userguide/best_practices_tasks.html\"]"),
        )
            .not.toBeNull();
    });

    test("then modern task-graph context is optional and linked to primary sources", async () => {
        const { doc } = await renderLesson();
        const moreCallouts = doc.querySelectorAll("[data-callout][data-variant=\"more\"]");
        const moreText = Array.from(moreCallouts).map((callout) => callout.textContent ?? "").join(" ");

        expect(moreCallouts.length).toBe(2);
        expect(moreText).toContain("Grafo de tareas más allá de Gradle");
        expect(moreText).toContain("El grafo también tiene un costo");
        expect(moreText).toContain("incubating");
        expect(doc.querySelector("a[href=\"https://nx.dev/docs/concepts/task-pipeline-configuration\"]"))
            .not.toBeNull();
        expect(doc.querySelector("a[href=\"https://bazel.build/reference/glossary\"]")).not.toBeNull();
        expect(doc.querySelector("a[href=\"https://docs.gradle.org/current/userguide/configuration_cache.html\"]"))
            .not.toBeNull();
        expect(doc.querySelector("a[href=\"https://docs.gradle.org/current/userguide/isolated_projects.html\"]"))
            .not.toBeNull();
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
        expect(normalizedHtml).toContain("inputs y outputs");
        expect(normalizedHtml).toContain("por qué existe esa dependencia");
        expect(normalizedHtml).toContain("resultado producido por otra");
    });

    test("then it links to the lesson-specific readings page", async () => {
        const { doc } = await renderLesson();
        const readingsPath = "/readings/scripting/task-graphs/";
        const readingsLink = doc.querySelector(`a[href="${readingsPath}"]`);

        expect(readingsLink).not.toBeNull();
        expect(readingsLink?.textContent).toContain("Ver lecturas complementarias");
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

    test("then it links the Gradle code blocks to the companion project", async () => {
        const { doc } = await renderLesson();
        const sourceLinks = Array.from(doc.querySelectorAll("a.dibs-source-link"))
            .map((a) => a.getAttribute("href") ?? "");

        expect(sourceLinks.some((href) =>
            href.includes("kotlin-companion")
            && href.includes("gradle/task-graph/build.gradle.kts")
        )).toBe(true);
    });

    test("then the old exercise corpus is no longer rendered", async () => {
        const { html } = await renderLesson();
        expect(html).not.toContain("finalizeReport");
        expect(html).not.toContain("extended-task-graph-with-finalize");
    });
});
