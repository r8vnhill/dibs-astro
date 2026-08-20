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
        expect(normalizedHtml).toContain("tarea requerida -> tarea dependiente");
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

    test("then the cyclic counterexample is explained as not representing a valid task order", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Ninguna de las tres tareas puede quedar lista");
        expect(normalizedHtml).toContain("Acíclico");
        expect(normalizedHtml).toContain(cyclicDependencyCounterexample.description);
    });

    test("then the DAG is presented as precedence constraints with multiple valid topological orders", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Un DAG admite órdenes válidos");
        expect(normalizedHtml).toContain("Orden topológico");
        expect(normalizedHtml).toContain("no necesariamente una secuencia única de ejecución");
        expect(normalizedHtml).toContain(
            "prepareCatalog -> generateReport -> packageReport -> verifyReport",
        );
        expect(normalizedHtml).toContain(
            "prepareCatalog -> generateReport -> verifyReport -> packageReport",
        );
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

    test("then it distinguishes the task graph from an execution trace", async () => {
        const { html } = await renderLesson();
        const normalizedHtml = html.replace(/\s+/g, " ");

        expect(normalizedHtml).toContain("Grafo ≠ traza de ejecución");
        expect(normalizedHtml).toContain("qué tareas se ejecutaron realmente y cuándo");
        expect(normalizedHtml).toContain("permitir que el sistema lo programe en paralelo");
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
            ["h2-directed-acyclic-shape", "¿por qué no podría proporcionar un orden"],
            ["h2-topological-orders", "¿packagereport debe ejecutarse antes"],
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
        const warning = doc.querySelector("[data-callout][data-variant=\"warning\"]");
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
                "ref:gradle-controlling-task-execution",
                "ref:gradle-command-line-interface",
            ]),
        );
        expect(new Set(resolution.value.sections[1]?.readings.map((reading) => reading.referenceId))).toEqual(
            new Set(["ref:build-systems-a-la-carte-2018"]),
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
        expect(normalizedHtml).toContain("tarea");
        expect(normalizedHtml).toContain("dependencia");
        expect(normalizedHtml).toContain("restricciones de ejecución");
        expect(normalizedHtml).toContain("grafo seleccionado");
        expect(normalizedHtml).toContain("inputs y outputs");
        expect(normalizedHtml).toContain("¿De dónde provienen esas dependencias?");
        expect(normalizedHtml).toContain("salida de una tarea productora");
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
