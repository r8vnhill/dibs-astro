/**
 * @file Locks the standalone-vs-embedded Solution contract introduced for nested
 * Question/Solution pedagogical units (see `traceability-log` improvement plan for the callout
 * hierarchy). Standalone solutions must keep their existing prominent card treatment; embedded
 * solutions must expose a semantic marker, stay collapsible, default closed, and use reduced
 * spacing instead of the independent-card shadow/margin. Also locks Phase 3's disclosure-affordance
 * contract: an embedded solution's collapsed label names the action ("Ver solución"). The
 * rest/hover/focus-visible/expanded-separator styling lives in `CalloutShell`'s scoped `<style>`,
 * which `AstroContainer.renderToString` does not inline into component-only render output, so that
 * part of the contract is verified by CSS review rather than an assertion here.
 */

import { Solution } from "$callouts";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, suite, test } from "vitest";

type SolutionProps = {
    title?: string;
    embedded?: boolean;
    headingLevel?: "h2" | "h3" | "h4" | "h5" | "h6";
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

        test("then it keeps the standalone h3 heading and body rhythm", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            expect(doc.querySelector("h3")).not.toBeNull();
            expect(doc.querySelector("h4")).toBeNull();
            expect(doc.querySelector(".callout__body")?.classList.contains("mt-3")).toBe(true);
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

        test("then it uses a quieter h4 heading and one deliberate answer gap", async () => {
            const html = await render({ embedded: true });
            const doc = parseHtml(html);

            expect(doc.querySelector("h4")).not.toBeNull();
            expect(doc.querySelector("h3")).toBeNull();
            expect(doc.querySelector(".callout__body")?.classList.contains("mt-3")).toBe(false);
        });

        test("then an explicit heading level still overrides the embedded default", async () => {
            const html = await render({ embedded: true, headingLevel: "h5" });
            const doc = parseHtml(html);

            expect(doc.querySelector("h5")).not.toBeNull();
            expect(doc.querySelector("h4")).toBeNull();
        });

        test("then its disclosure summary carries the interaction-state style hook", async () => {
            const html = await render({ embedded: true });
            const doc = parseHtml(html);

            const summary = doc.querySelector("summary");
            expect(summary?.classList.contains("callout__summary")).toBe(true);
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

        test("then its collapsed label names the action instead of the standalone noun title", async () => {
            const html = await render({ embedded: true });
            const doc = parseHtml(html);

            const summary = doc.querySelector("summary");
            expect(summary?.textContent).toContain("Ver solución");
        });

        test("then an explicit title still overrides the embedded default", async () => {
            const html = await render({ embedded: true, title: "Respuesta" });
            const doc = parseHtml(html);

            const summary = doc.querySelector("summary");
            expect(summary?.textContent).toContain("Respuesta");
            expect(summary?.textContent).not.toContain("Ver solución");
        });
    });
});
