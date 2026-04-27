import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import DocumentationPage from "../documentation/index.astro";

describe.concurrent("API documentation lesson render", () => {
    test("renders the API documentation lesson", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(DocumentationPage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/software-libraries/api-design/documentation/",
                ),
            },
        );

        expect(html).toContain("Documentar una API como parte del producto");
        expect(html).toContain("La documentación completa el contrato de la API");
        expect(html).toContain("CONTRIBUTING.md");
        expect(html).toContain("LICENSE");
        expect(html).toContain("CODE_OF_CONDUCT.md");
    });
});
