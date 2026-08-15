import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import SupportScriptsPage from "../index.astro";
import NushellSupportScriptsPage from "../nushell.astro";
import PythonSupportScriptsPage from "../py.astro";

describe.concurrent("support scripts lesson render", () => {
    test("renders the reusable support scripts lesson", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(SupportScriptsPage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/support-scripts/",
                ),
            },
        );

        expect(html).toContain("Scripts de apoyo como software reusable");
        expect(html).toContain("/notes/scripting/support-scripts/");
        expect(html).toContain("contrato operativo");
        expect(html).toContain("check-library-layout.main.kts");
        expect(html).toContain("README.md");
        expect(html).toContain("LICENSE");
        expect(html).toContain("CODE_OF_CONDUCT.md");

        const document = new JSDOM(html).window.document;
        const sourceLink = document.querySelector<HTMLAnchorElement>(
            "a[href*=\"dibs-course/kotlin-companion\"]",
        );
        expect(sourceLink?.href).toContain("scripts/check-library-layout.main.kts");
        expect(sourceLink?.textContent).toContain("scripts/check-library-layout.main.kts");

        const text = document.body.textContent ?? "";
        expect(text).toContain("kotlin check-library-layout.main.kts .");
        expect(text).toContain("contrato operativo del script");
        expect(text).toContain("fun checkPath");
        expect(text).toContain("args.isNotEmpty()");
        expect(text).not.toContain("data class");
        expect(text).not.toContain("Files.walk");
    });

    test("exposes both the Python and Nushell comparative lessons", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(SupportScriptsPage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/support-scripts/",
                ),
            },
        );

        const document = new JSDOM(html).window.document;
        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
            .map((anchor) => anchor.getAttribute("href"));

        expect(links).toContain("/notes/scripting/support-scripts/py/");
        expect(links).toContain("/notes/scripting/support-scripts/nushell/");
    });

    test("renders the Python comparative conclusion", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(PythonSupportScriptsPage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/support-scripts/py/",
                ),
            },
        );

        const text = new JSDOM(html).window.document.body.textContent ?? "";
        expect(text).toContain("Conclusiones");
        expect(text).toContain("Puntos clave");
        expect(text).toContain("argparse");
        expect(text).toContain("pathlib.Path");
        expect(text).toContain("retroalimentación estática");
        expect(text).toContain("Reflexión de cierre");
    });

    test("renders the Nushell comparative lesson as a structured-pipeline comparison", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(NushellSupportScriptsPage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/support-scripts/nushell/",
                ),
            },
        );

        expect(html).toContain("Scripts de apoyo reusables en Nushell");

        const text = new JSDOM(html).window.document.body.textContent ?? "";

        // Identifies itself as a comparison with the Kotlin support-script problem
        expect(text).toContain("powerslave");
        expect(text).toContain("README.md");
        expect(text).toContain("LICENSE");
        expect(text).toContain("CODE_OF_CONDUCT.md");

        // Core conceptual markers: structured values, records/tables, pipelines, filesystem inspection
        expect(text).toContain("Nushell");
        expect(text).toContain("estructurad");
        expect(text).toContain("record");
        expect(text).toContain("tabla");
        expect(text).toContain("pipeline");
        expect(text).toContain("ls");

        // Cycle 3/4: loading structured file formats
        expect(text).toContain("open album.json");
        expect(text).toContain("NUON");
        expect(text).toContain("duration_seconds");

        // Cycle 4: pipeline-native script execution
        expect(text).toContain("run check-library-layout.nu");
        expect(text).toContain("0.114");
        expect(text).toContain("record -> record");

        // Conclusions and references stay present
        expect(text).toContain("Conclusiones");
        expect(text).toContain("Puntos clave");
        expect(text).toContain("Reflexión de cierre");

        // No Kotlin source fragments from the base lesson should leak into the comparison
        expect(text).not.toContain("fun checkPath");
        expect(text).not.toContain("args.isNotEmpty()");
        expect(text).not.toContain("Path.of(");
        expect(text).not.toContain("Files.exists(");
    });
});
