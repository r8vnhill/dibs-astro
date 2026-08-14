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

    test("then the client script can identify exactly one navigation element through a stable contract", async () => {
        const renderToc = await createAstroRenderer(LessonToc);
        const html = await renderToc({});
        const document = new JSDOM(html).window.document;

        expect(document.querySelectorAll("[data-lesson-toc]")).toHaveLength(1);
        expect(document.querySelector("[data-lesson-toc]")?.tagName).toBe("NAV");
    });

    test("then exactly one internal scrolling viewport exists and contains the entry list", async () => {
        const renderToc = await createAstroRenderer(LessonToc);
        const html = await renderToc({});
        const document = new JSDOM(html).window.document;
        const shell = document.querySelector("[data-lesson-toc]");
        const scroller = document.querySelectorAll("[data-lesson-toc-scroll]");

        expect(scroller).toHaveLength(1);
        expect(shell?.querySelector("[data-lesson-toc-scroll]")).not.toBeNull();
        expect(scroller[0]?.querySelector("[data-lesson-toc-list]")).not.toBeNull();
    });

    test("then the heading is outside the internally scrollable region", async () => {
        const renderToc = await createAstroRenderer(LessonToc);
        const html = await renderToc({});
        const document = new JSDOM(html).window.document;
        const scroller = document.querySelector("[data-lesson-toc-scroll]");

        expect(scroller?.textContent).not.toContain("En esta página");
    });
});
