/**
 * @file Locks the standalone-vs-embedded Solution contract introduced for nested
 * Question/Solution pedagogical units (see `traceability-log` improvement plan for the callout
 * hierarchy). Standalone solutions must keep their existing prominent card treatment; embedded
 * solutions must expose a semantic marker, stay collapsible, default closed, and use reduced
 * spacing instead of the independent-card shadow/margin.
 */

import { Solution } from "$callouts";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, suite, test } from "vitest";

type SolutionProps = {
    title?: string;
    embedded?: boolean;
};

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

suite("given the Solution callout", () => {
    let render: Awaited<ReturnType<typeof createAstroRenderer<SolutionProps>>>;

    beforeAll(async () => {
        render = await createAstroRenderer<SolutionProps>(Solution);
    });

    describe("when rendered standalone (no embedded prop)", () => {
        test("then it retains its independent-card visual contract", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            const section = doc.querySelector("[data-callout]");
            expect(section).not.toBeNull();
            expect(section?.getAttribute("data-variant")).toBe("solution");
            expect(section?.hasAttribute("data-embedded")).toBe(false);
            expect(section?.classList.contains("shadow-sm")).toBe(true);
            expect(section?.classList.contains("my-4")).toBe(true);
            expect(section?.classList.contains("callout--embedded")).toBe(false);
        });

        test("then it remains a native disclosure that defaults closed", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            const details = doc.querySelector("details.callout__details");
            expect(details).not.toBeNull();
            expect(details?.hasAttribute("open")).toBe(false);
            expect(details?.querySelector("summary")).not.toBeNull();
        });
    });

    describe("when embedded inside another callout", () => {
        test("then it exposes a data-embedded marker instead of the standalone card treatment", async () => {
            const html = await render({ embedded: true });
            const doc = parseHtml(html);

            const section = doc.querySelector("[data-callout]");
            expect(section?.getAttribute("data-embedded")).toBe("true");
            expect(section?.classList.contains("callout--embedded")).toBe(true);
            expect(section?.classList.contains("shadow-sm")).toBe(false);
            expect(section?.classList.contains("my-4")).toBe(false);
        });

        test("then it remains collapsible and defaults closed", async () => {
            const html = await render({ embedded: true });
            const doc = parseHtml(html);

            const details = doc.querySelector("details.callout__details");
            expect(details).not.toBeNull();
            expect(details?.hasAttribute("open")).toBe(false);
            expect(details?.querySelector("summary")).not.toBeNull();
        });

        test("then it uses reduced outer padding instead of the standalone default", async () => {
            const html = await render({ embedded: true });
            const doc = parseHtml(html);

            const section = doc.querySelector("[data-callout]");
            expect(section?.classList.contains("px-3")).toBe(true);
            expect(section?.classList.contains("py-2")).toBe(true);
            expect(section?.classList.contains("px-5")).toBe(false);
            expect(section?.classList.contains("py-4")).toBe(false);
        });
    });
});
