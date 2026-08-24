/**
 * Contract and render tests for the task-graphs lesson's readings page (`../index.astro`): the grouping of
 * `~/data/readings/lesson-readings.ts`'s `taskGraphsReadings` into guided-path sections, its editorial
 * taxonomy (format/role/author order), and the rendered page itself (intro, sections, and each reading's
 * retrieval-task question — see `LessonReadingGuide.render.test.ts` for that block's shared markup contract).
 */
import { getDefaultBibliographyCatalog } from "$presentation/adapters/bibliography-catalog";
import { getTaskGraphsReadings } from "$presentation/adapters/lesson-readings";
import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import { resolveLessonReadings } from "~/lib/readings/lesson-readings-contract";
import { referenceAnchor } from "~/lib/references/reference-links";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import ReadingsPage from "../index.astro";

const readingsPageUrl = "https://dibs.ravenhill.cl/readings/scripting/task-graphs/";

// Every test below needs a successful resolution; a failed one is a fixture/contract bug, not a
// per-test case to assert on, so it fails loudly here instead of repeating an ok-check per test.
function resolveTaskGraphsReadings() {
    const resolution = resolveLessonReadings(getTaskGraphsReadings(), getDefaultBibliographyCatalog());
    if (!resolution.ok) {
        throw new Error(`expected task-graphs readings to resolve, got: ${JSON.stringify(resolution)}`);
    }
    return resolution.value;
}

async function renderReadingsPageDocument() {
    const renderPage = await createAstroRenderer<Record<string, never>>(ReadingsPage);
    const html = await renderPage({}, { request: new Request(readingsPageUrl) });
    return new JSDOM(html).window.document;
}

suite("given the task-graphs readings catalog", () => {
    test("then every configured reference resolves to one declared section and anchor", () => {
        const readings = resolveTaskGraphsReadings().sections.flatMap((section) => section.readings);

        expect(readings).toHaveLength(4);
        expect(new Set(readings.map((reading) => reading.referenceId)).size).toBe(readings.length);
        expect(new Set(readings.map((reading) => reading.anchorId)).size).toBe(readings.length);
        expect(readings.map((reading) => reading.anchorId)).toEqual(
            readings.map((reading) => referenceAnchor(reading.referenceId)),
        );
    });

    test("then it groups readings into the guided-path sections rather than the shared defaults", () => {
        const { sections } = resolveTaskGraphsReadings();

        expect(
            sections.map((section) => ({
                title: section.title,
                references: section.readings.map((reading) => reading.referenceId),
            })),
        ).toEqual([
            {
                title: "Para acompañar la lección",
                references: ["ref:introduction-to-algorithms-2022"],
            },
            {
                title: "Para conectar con sistemas de construcción",
                references: ["ref:build-systems-a-la-carte-2018"],
            },
            {
                title: "Si quieres profundizar",
                references: [
                    "ref:mathematics-for-computer-science-2018",
                    "ref:build-scripts-perfect-dependencies-2020",
                ],
            },
        ]);

        const deeperSection = sections.find((section) => section.title === "Si quieres profundizar");
        expect(deeperSection?.readings.map((reading) => reading.guide.purpose)).toEqual([
            "Profundiza en órdenes parciales",
            "Profundiza en la corrección de las dependencias",
        ]);

        const readings = sections.flatMap((section) => section.readings);
        const mokhov = readings.find((reading) => reading.referenceId === "ref:build-systems-a-la-carte-2018");
        expect(mokhov?.guide.whatToRead).toBe("§4.1.1, “Topological”.");
        expect(mokhov?.guide.why).toContain("planificador");
        expect(mokhov?.guide.focus).toContain("acíclico");
    });

    test("then its taxonomy separates canonical format from the lesson role", () => {
        const readings = resolveTaskGraphsReadings().sections.flatMap((section) => section.readings);

        expect(readings.map((reading) => reading.guide.role)).toEqual([
            "Base conceptual",
            "Sistemas de construcción",
            "Profundización",
            "Profundización",
        ]);
        expect(readings.map((reading) => reading.reference.type)).toEqual([
            "Book",
            "ScholarlyArticle",
            "Book",
            "ScholarlyArticle",
        ]);
        expect(readings.map((reading) => reading.reference.authors.map((author) => author.lastName))).toEqual([
            ["Cormen", "Leiserson", "Rivest", "Stein"],
            ["Mokhov", "Mitchell", "Peyton Jones"],
            ["Lehman", "Leighton", "Meyer"],
            ["Spall", "Mitchell", "Tobin-Hochstadt"],
        ]);
    });

    test("then it renders all three reading sections with guidance and a lesson backlink", async () => {
        const doc = await renderReadingsPageDocument();
        const html = doc.documentElement.innerHTML;

        expect(doc.querySelector("a[href=\"/notes/scripting/task-graphs/\"]")).not.toBeNull();
        expect(doc.querySelectorAll("section[aria-labelledby]")).toHaveLength(3);
        expect(html).toContain("Para acompañar la lección");
        expect(html).toContain("Para conectar con sistemas de construcción");
        expect(html).toContain("Si quieres profundizar");
        expect(html).toContain("Formato");
        expect(html).toContain("Rol en esta lección");
        expect(html).not.toContain("Tipo");
        expect(html).not.toContain("Fuente primaria");
        expect(html).toContain("Qué leer");
        expect(html).toContain("Qué buscar");
        expect(html).toContain("Comprueba tu comprensión");
        expect(html).not.toContain("Después de leer");
        expect(doc.querySelector("#ref-build-systems-a-la-carte-2018")?.textContent).toContain(
            "Andrey Mokhov, Neil Mitchell y Simon Peyton Jones",
        );
        expect(doc.querySelector("#ref-build-scripts-perfect-dependencies-2020")?.textContent).toContain(
            "Sarah Spall, Neil Mitchell y Sam Tobin-Hochstadt",
        );
        expect(doc.querySelectorAll("[id^=\"ref-\"]")).toHaveLength(4);
    });

    test.each([
        "ref-introduction-to-algorithms-2022",
        "ref-build-systems-a-la-carte-2018",
        "ref-mathematics-for-computer-science-2018",
        "ref-build-scripts-perfect-dependencies-2020",
    ])("then %s uses the shared guided-reference composition", async (anchorId) => {
        const doc = await renderReadingsPageDocument();
        const reference = doc.querySelector(`#${anchorId}`);

        expect(reference?.matches("li[data-guided-reference=\"true\"]")).toBe(true);
        expect(reference?.querySelector("[data-reference-identity]")).not.toBeNull();
        expect(reference?.querySelector("[data-reading-guidance]")).not.toBeNull();
        expect(reference?.querySelector("[data-reading-metadata]")).not.toBeNull();
        expect(reference?.querySelector("[data-reading-guide-question]")).not.toBeNull();
    });

    test("then its introduction presents one recommended reading and optional paths", async () => {
        const doc = await renderReadingsPageDocument();
        const routeGuide = doc.querySelector("#route-heading")?.parentElement;

        expect(routeGuide).not.toBeNull();
        expect(routeGuide?.textContent).toContain("basta con la primera lectura seleccionada");
        expect(routeGuide?.textContent).toContain("Para esta lección");
        expect(routeGuide?.textContent).toContain("Si quieres conectar la teoría con sistemas de construcción");
        expect(routeGuide?.textContent).toContain("Para profundizar");
        expect(routeGuide?.querySelector("a[href=\"#ref-introduction-to-algorithms-2022\"]")).not.toBeNull();
        expect(routeGuide?.querySelector("a[href=\"#ref-build-systems-a-la-carte-2018\"]")).not.toBeNull();
        expect(routeGuide?.querySelector("a[href=\"#ref-mathematics-for-computer-science-2018\"]")).not.toBeNull();
        expect(routeGuide?.querySelector("a[href=\"#ref-build-scripts-perfect-dependencies-2020\"]")).not.toBeNull();
    });

    test.each([
        [
            "introduction-to-algorithms-2022",
            "¿Por qué un grafo con un ciclo dirigido no puede tener un orden topológico?",
        ],
        [
            "build-systems-a-la-carte-2018",
            "Si solicitamos una tarea concreta, ¿por qué un planificador no necesita considerar necesariamente"
            + " todas las tareas conocidas?",
        ],
        [
            "mathematics-for-computer-science-2018",
            "¿Qué significa que dos tareas sean incomparables y qué libertad deja eso al planificador?",
        ],
        [
            "build-scripts-perfect-dependencies-2020",
            "¿Qué consecuencias distintas pueden tener una dependencia que falta y una dependencia innecesaria?",
        ],
    ])("then %s renders its approved retrieval-task question", (referenceId, expectedQuestion) => {
        const readings = resolveTaskGraphsReadings().sections.flatMap((section) => section.readings);
        const reading = readings.find((candidate) => candidate.referenceId === `ref:${referenceId}`);

        expect(reading?.guide.guidingQuestion).toBe(expectedQuestion);
    });
});
