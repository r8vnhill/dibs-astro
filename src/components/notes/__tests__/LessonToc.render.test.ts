import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import LessonToc from "../LessonToc.astro";

describe("given the lesson table of contents", () => {
    test("then it exposes a labelled complementary navigation region", async () => {
        const renderToc = await createAstroRenderer(LessonToc);
        const html = await renderToc({});
        const document = new JSDOM(html).window.document;
        const toc = document.querySelector<HTMLElement>("[data-testid='lesson-toc']");

        expect(toc?.getAttribute("aria-label")).toBe("En esta página");
        expect(toc?.querySelector("nav")?.getAttribute("aria-label")).toBe("En esta página");
        expect(toc?.querySelector("[data-lesson-toc-list]")).not.toBeNull();
    });
});
