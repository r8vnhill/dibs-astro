import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "../../../../../../test-utils/astro-render";
import ReadingsPage from "../index.astro";

suite("given the Nushell support-scripts readings catalog", () => {
    test("renders catalog references whose ids use the ref namespace", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(ReadingsPage);
        const html = await renderPage({}, {
            request: new Request("https://dibs.ravenhill.cl/readings/scripting/support-scripts/nushell/"),
        });

        expect(html).toContain("Unix shell programming: the next 50 years");
        expect(html).toContain("Process Composition with Typed Unix Pipes");
        expect(html).toContain("Notional machines and introductory programming education");
        expect(html).not.toContain("<ul class=\"mt-6 space-y-5\"></ul>");
    });

    test("then explains the route and gives each source a reading guide", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(ReadingsPage);
        const html = await renderPage({});

        expect(html).toContain("Cómo usar estas lecturas");
        expect(html).toContain("Lecturas esenciales");
        expect(html).toContain("De la idea a la práctica");
        expect(html).toContain("Para profundizar");
        expect(html).toContain("Por qué leerlo");
    });
});
