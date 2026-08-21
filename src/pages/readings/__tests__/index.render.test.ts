import { getTaskGraphsReadings } from "$presentation/adapters/lesson-readings";
import { getSelectedTaskGraphsReadings } from "$presentation/adapters/lesson-readings";
import { expect, suite, test } from "vitest";
import { lessonReadingsRoute } from "~/lib/readings/lesson-readings-contract";
import { createAstroRenderer } from "../../../test-utils/astro-render";
import ReadingsIndexPage from "../index.astro";

suite("given the published readings index", () => {
    test("then it lists the task-graphs readings page once with its canonical route", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(ReadingsIndexPage);
        const html = await renderPage({});
        const route = lessonReadingsRoute(getTaskGraphsReadings().lessonPath);

        expect(html.match(new RegExp(route.replaceAll("/", "\\/"), "gu"))).toHaveLength(1);
        expect(html).toContain(getTaskGraphsReadings().title);
        expect(html).toContain(getSelectedTaskGraphsReadings().title);
        expect(html).toContain("/readings/scripting/selected-task-graphs/");
    });
});
