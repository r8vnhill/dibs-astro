import { getDefaultBibliographyCatalog } from "$presentation/adapters/bibliography-catalog";
import { getSelectedTaskGraphsReadings } from "$presentation/adapters/lesson-readings";
import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import { resolveLessonReadings } from "~/lib/readings/lesson-readings-contract";
import { referenceAnchor } from "~/lib/references/reference-links";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import ReadingsPage from "../index.astro";

suite("given the selected-task-graphs readings catalog", () => {
    test("then every configured reference resolves to one declared section and anchor", () => {
        const configuration = getSelectedTaskGraphsReadings();
        const resolution = resolveLessonReadings(configuration, getDefaultBibliographyCatalog());

        expect(resolution.ok).toBe(true);
        if (!resolution.ok) return;

        const readings = resolution.value.sections.flatMap((section) => section.readings);
        expect(readings).toHaveLength(4);
        expect(new Set(readings.map((reading) => reading.referenceId)).size).toBe(readings.length);
        expect(readings.map((reading) => reading.anchorId)).toEqual(
            readings.map((reading) => referenceAnchor(reading.referenceId)),
        );
    });

    test("then it renders the Gradle reading guide with a lesson backlink", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(ReadingsPage);
        const html = await renderPage({}, {
            request: new Request("https://dibs.ravenhill.cl/readings/scripting/selected-task-graphs/"),
        });
        const doc = new JSDOM(html).window.document;

        expect(doc.querySelector("a[href=\"/notes/scripting/selected-task-graphs/\"]")).not.toBeNull();
        expect(doc.querySelectorAll("section[aria-labelledby]")).toHaveLength(4);
        expect(html).toContain("Grafo seleccionado y Gradle");
        expect(html).toContain("Lecturas esenciales");
        expect(html).toContain("dependsOn");
        expect(html).toContain("Configuration Cache");
        expect(doc.querySelectorAll("[id^=\"ref-\"]")).toHaveLength(4);
    });
});
