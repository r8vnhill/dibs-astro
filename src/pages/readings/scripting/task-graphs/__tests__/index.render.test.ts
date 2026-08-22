import { getDefaultBibliographyCatalog } from "$presentation/adapters/bibliography-catalog";
import { getTaskGraphsReadings } from "$presentation/adapters/lesson-readings";
import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import { resolveLessonReadings } from "~/lib/readings/lesson-readings-contract";
import { referenceAnchor } from "~/lib/references/reference-links";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import ReadingsPage from "../index.astro";

suite("given the task-graphs readings catalog", () => {
    test("then every configured reference resolves to one declared section and anchor", () => {
        const configuration = getTaskGraphsReadings();
        const resolution = resolveLessonReadings(configuration, getDefaultBibliographyCatalog());

        expect(resolution.ok).toBe(true);
        if (!resolution.ok) return;

        const readings = resolution.value.sections.flatMap((section) => section.readings);
        expect(readings).toHaveLength(4);
        expect(new Set(readings.map((reading) => reading.referenceId)).size).toBe(readings.length);
        expect(new Set(readings.map((reading) => reading.anchorId)).size).toBe(readings.length);
        expect(readings.map((reading) => reading.anchorId)).toEqual(
            readings.map((reading) => referenceAnchor(reading.referenceId)),
        );
    });

    test("then its taxonomy separates canonical format from the lesson role", () => {
        const resolution = resolveLessonReadings(getTaskGraphsReadings(), getDefaultBibliographyCatalog());

        expect(resolution.ok).toBe(true);
        if (!resolution.ok) return;

        const readings = resolution.value.sections.flatMap((section) => section.readings);
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
        const renderPage = await createAstroRenderer<Record<string, never>>(ReadingsPage);
        const html = await renderPage({}, {
            request: new Request("https://dibs.ravenhill.cl/readings/scripting/task-graphs/"),
        });
        const doc = new JSDOM(html).window.document;

        expect(doc.querySelector("a[href=\"/notes/scripting/task-graphs/\"]")).not.toBeNull();
        expect(doc.querySelectorAll("section[aria-labelledby]")).toHaveLength(3);
        expect(html).toContain("Lecturas esenciales");
        expect(html).toContain("De la idea a la práctica");
        expect(html).toContain("Para profundizar");
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
});
