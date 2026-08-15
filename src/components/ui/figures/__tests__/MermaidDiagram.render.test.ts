import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "~/test-utils/astro-render";
import MermaidDiagram from "../MermaidDiagram.astro";
import { canonicalDiagramSpecs } from "~/lib/diagrams/__fixtures__/diagram-specs";

suite("given the shared Mermaid diagram figure", () => {
    test.each(canonicalDiagramSpecs)("then fixture $id uses a scrollable, static viewport", async (spec) => {
        const render = await createAstroRenderer<{ spec: typeof spec }>(MermaidDiagram);
        const document = new JSDOM(await render({ spec })).window.document;
        const figure = document.querySelector(`figure[data-diagram-id="${spec.id}"]`);
        const viewport = figure?.querySelector(".diagram-viewport");

        expect(figure).not.toBeNull();
        expect(viewport).not.toBeNull();
        expect(viewport?.getAttribute("aria-hidden")).toBe("true");
        expect(viewport?.querySelector("svg")).not.toBeNull();
        expect(document.querySelector("script")).toBeNull();
    });
});
