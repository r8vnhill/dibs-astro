import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import ReadingsPage from "../index.astro";

suite("given the library readings catalog", () => {
    test("renders catalog references whose ids use the ref namespace", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(ReadingsPage);
        const html = await renderPage({}, {
            request: new Request("https://dibs.ravenhill.cl/readings/software-libraries/what-is/"),
        });

        expect(html).toContain("On the Criteria To Be Used in Decomposing Systems into Modules");
        expect(html).toContain("Effect system | Nim Manual");
        expect(html).not.toContain("<ul class=\"mt-6 space-y-5\"></ul>");
    });

    test("then explains the route and gives each source a reading guide", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(ReadingsPage);
        const html = await renderPage({});

        expect(html).toContain("Cómo usar estas lecturas");
        expect(html).toContain("Lecturas esenciales");
        expect(html).toContain("De la idea a la práctica");
        expect(html).toContain("Para profundizar");
        expect(html).toContain("Qué leer");
        expect(html).toContain("Por qué");
        expect(html).toContain("Comprueba tu comprensión");
        expect(html).toContain("What Is Software Engineering?");
        expect(html).toContain("Chapter 13. Binary Compatibility");
        expect(html).toContain("<dl");
        expect(html).not.toContain("<ul class=\"mt-6 space-y-5\"></ul>");
    });
});
