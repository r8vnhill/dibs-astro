/**
 * @file Locks the Phase 2 visual-weight reduction for the Question callout (see `traceability-log`
 * improvement plan for the pedagogical callout hierarchy): compact density by default, with the
 * option to opt back into the larger treatment, and a subtler surface than the base saturated fill.
 */

import { Question } from "$callouts";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, suite, test } from "vitest";

type QuestionProps = {
    title?: string;
    compact?: boolean;
};

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

suite("given the Question callout", () => {
    let render: Awaited<ReturnType<typeof createAstroRenderer<QuestionProps>>>;

    beforeAll(async () => {
        render = await createAstroRenderer<QuestionProps>(Question);
    });

    describe("when rendered with no compact prop", () => {
        test("then it defaults to the compact padding", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            const section = doc.querySelector("[data-callout]");
            expect(section?.getAttribute("data-variant")).toBe("question");
            expect(section?.classList.contains("px-4")).toBe(true);
            expect(section?.classList.contains("py-3")).toBe(true);
            expect(section?.classList.contains("px-5")).toBe(false);
            expect(section?.classList.contains("py-4")).toBe(false);
        });
    });

    describe("when compact is explicitly disabled", () => {
        test("then it opts back into the larger padding", async () => {
            const html = await render({ compact: false });
            const doc = parseHtml(html);

            const section = doc.querySelector("[data-callout]");
            expect(section?.classList.contains("px-5")).toBe(true);
            expect(section?.classList.contains("py-4")).toBe(true);
            expect(section?.classList.contains("px-4")).toBe(false);
            expect(section?.classList.contains("py-3")).toBe(false);
        });
    });

    describe("when rendered standalone", () => {
        test("then it selects the purple semantic accent with a subtle surface", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            const section = doc.querySelector("[data-callout]");
            expect(section?.getAttribute("data-accent")).toBe("purple");
            expect(section?.getAttribute("data-surface")).toBe("subtle");
            expect(section?.getAttribute("data-context")).toBe("standalone");
        });

        test("then it keeps its independent-card shadow and margin", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            const section = doc.querySelector("[data-callout]");
            expect(section?.classList.contains("shadow-sm")).toBe(true);
            expect(section?.classList.contains("my-4")).toBe(true);
            expect(section?.classList.contains("callout--embedded")).toBe(false);
        });
    });
});
