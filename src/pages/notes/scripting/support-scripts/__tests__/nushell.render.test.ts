/**
 * @file Render-level characterization tests for the Nushell comparative lesson.
 *
 * These tests assert the conceptual markers, fixtures, and citations required by the
 * research-grounded revision plan without pinning down exact prose, so editorial wording can
 * still evolve.
 */

import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import { nushellDiagramSpecs } from "~/lib/diagrams/nushell-examples";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import NushellPage from "../nushell.astro";

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

async function renderLesson(): Promise<{ html: string; doc: Document }> {
    const renderPage = await createAstroRenderer<Record<string, never>>(NushellPage);
    const html = await renderPage(
        {},
        {
            request: new Request("https://dibs.ravenhill.cl/notes/scripting/support-scripts/nushell/"),
        },
    );
    return { html, doc: parseHtml(html) };
}

suite("given the Nushell comparative lesson", () => {
    test("then it frames Nushell as an evolution of the Unix pipeline, not its origin", async () => {
        const { html } = await renderLesson();

        expect(html).toContain("Del pipe de Unix al pipeline estructurado");
        expect(html).toContain("La misma composición con representaciones distintas");
        expect(html).toContain("bytes o texto");
        expect(html).toContain("valor estructurado");
    });

    test("then it makes the execution model explicit before syntax-heavy examples", async () => {
        const { html } = await renderLesson();

        expect(html).toContain("Un modelo mental para esta lección");
        expect(html).toContain("La frontera entre el pipeline interno y un proceso externo");
        expect(html).toContain("interpretarla explícitamente según el formato de salida");
        expect(html).toContain("from json");
        expect(html).toContain("from csv");
        expect(html).toContain("parse");
    });

    test("then it distinguishes stdout re-entry from explicit structured interpretation", async () => {
        const { doc } = await renderLesson();
        const section = doc.querySelector("#h2-mental-model-for-this-lesson");
        const text = section?.textContent ?? "";

        expect(text).toContain("stdout");
        expect(text).toContain("datos del proceso externo");
        expect(text).toContain("interpretación explícita");
        expect(text).not.toContain("stdout llega como un valor Nushell");
    });

    test("then the execution-boundary diagram uses channels and notes as its visual grammar", async () => {
        const { doc } = await renderLesson();
        const figure = doc.querySelector("figure[data-diagram-id=\"internal-and-external-boundary\"]");
        const svgText = figure?.querySelector("svg")?.textContent ?? "";

        expect(svgText).toContain("Nushell (interno)");
        expect(svgText).toContain("Proceso externo");
        expect(svgText).toContain("stdin: representación");
        expect(svgText).toContain("stdout: datos del proceso externo");
        expect(svgText).toContain("interpretación explícita");
        expect(svgText).not.toContain("parseo");
        expect(svgText).not.toContain("comando interno (valor");
        expect(svgText).not.toContain("Note over Externo");
    });

    test("then stdin and stdout use the same connector style, not a request/response distinction", async () => {
        const { doc } = await renderLesson();
        const figure = doc.querySelector("figure[data-diagram-id=\"internal-and-external-boundary\"]");
        const messages = Array.from(figure?.querySelectorAll("svg g.message") ?? []);
        const stdinMessage = messages.find((message) => message.getAttribute("data-label")?.startsWith("stdin"));
        const stdoutMessage = messages.find((message) => message.getAttribute("data-label")?.startsWith("stdout"));

        expect(stdinMessage).not.toBeUndefined();
        expect(stdoutMessage).not.toBeUndefined();
        expect(stdinMessage?.getAttribute("data-line-style")).toBe(stdoutMessage?.getAttribute("data-line-style"));
        expect(stdinMessage?.getAttribute("data-arrow-head")).toBe(stdoutMessage?.getAttribute("data-arrow-head"));
    });

    test.each(nushellDiagramSpecs)(
        "then it renders the conceptual diagram $id as accessible inline SVG",
        async (spec) => {
            const { doc } = await renderLesson();
            const figure = doc.querySelector(`figure[data-diagram-id="${spec.id}"]`);

            expect(figure).not.toBeNull();
            expect(figure?.querySelector("svg")).not.toBeNull();
            expect(figure?.textContent).toContain(spec.title);
            expect(figure?.textContent).toContain(spec.description);
        },
    );

    test("then it keeps representative terminal output as text", async () => {
        const { doc } = await renderLesson();
        const outputBlocks = Array.from(doc.querySelectorAll("pre"));

        expect(outputBlocks.some((block) => block.textContent?.includes("CODE_OF_CONDUCT.md"))).toBe(true);
        expect(outputBlocks.some((block) => block.textContent?.includes("Rime of the Ancient Mariner"))).toBe(true);
        expect(outputBlocks.some((block) => block.textContent?.includes("nu::parser::input_type_mismatch"))).toBe(true);
    });

    test("then it cites Greenberg et al. (2021) and Sippel and Schirmeier (2023)", async () => {
        const { doc } = await renderLesson();
        const citationLinks = Array.from(doc.querySelectorAll("a.reference-citation"));
        const hrefs = citationLinks.map((link) => link.getAttribute("href") ?? "");

        expect(hrefs.some((href) => href.includes("greenberg-unix-shell-next-50-years-2021"))).toBe(true);
        expect(hrefs.some((href) => href.includes("sippel-process-composition-typed-unix-pipes-2023"))).toBe(true);
        expect(hrefs.some((href) => href.includes("sorva-notional-machines-2013"))).toBe(true);
    });

    test("then it teaches an explicit pipeline type contract with a compatible and an incompatible composition", async () => {
        const { html } = await renderLesson();

        expect(html).toContain("El pipeline también tiene contratos de tipo");
        expect(html).toContain("record -&gt; string");
        expect(html).toContain("open album.json | album-title");
        expect(html).toContain("album-title");
        expect(html).toMatch(/incompatib/);
    });

    test("then it replaces the NUON fixture with album.json as the primary persisted example", async () => {
        const { html } = await renderLesson();

        expect(html).toContain("album.json");
        expect(html).toContain("open album.json");
        expect(html).toContain("get tracks");
        expect(html).toContain("¿Y NUON?");
        expect(html).not.toContain("open album.nuon");
    });

    test("then run follows the type-contracts section as the culmination of the model", async () => {
        const { html, doc } = await renderLesson();

        expect(html).toContain("como culminación");
        expect(html).toContain("Valores estructurados");
        expect(html).toContain("Contratos de pipeline tipados");
        expect(html).toContain("run como etapa del pipeline");

        const typeContractsIndex = html.indexOf("El pipeline también tiene contratos de tipo");
        const runSectionIndex = html.indexOf("como culminación");
        expect(typeContractsIndex).toBeGreaterThan(-1);
        expect(runSectionIndex).toBeGreaterThan(typeContractsIndex);
        void doc;
    });

    test("then it distinguishes run as a pipeline stage from crossing the external-process boundary", async () => {
        const { html } = await renderLesson();

        expect(html).toContain("run script.nu");
        expect(html).toContain("^external-program");
    });

    test("then the final section states the closing conceptual chain and links to the readings route", async () => {
        const { doc } = await renderLesson();

        expect(doc.body.textContent).toMatch(
            /composici[oó]n\s*→\s*representaci[oó]n\s*→\s*contratos de tipo\s*→\s*frontera de proceso/,
        );

        const readingsLink = Array.from(doc.querySelectorAll("a")).find((link) =>
            link.getAttribute("href") === "/readings/scripting/support-scripts/nushell/"
        );
        expect(readingsLink).not.toBeUndefined();
    });

    test("then it introduces no Kotlin code", async () => {
        const { html } = await renderLesson();

        expect(html).not.toContain("fun ");
        expect(html).not.toContain("data class");
    });
});
