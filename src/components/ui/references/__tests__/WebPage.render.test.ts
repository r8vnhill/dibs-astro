import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import WebPage from "../WebPage.astro";

type WebPageProps = {
    title?: string;
    url: string;
    location?: string;
    locationUrl?: string;
    author?: string;
};

let renderWebPage: AstroRender<WebPageProps>;

describe.concurrent("WebPage.astro render", () => {
    beforeEach(async () => {
        renderWebPage = await createAstroRenderer<WebPageProps>(WebPage);
    });

    test("renders a linked location when locationUrl is provided", async () => {
        const html = await renderWebPage({
            title: "Pipelines",
            url: "https://www.nushell.sh/book/pipelines.html",
            location: "Nushell",
            locationUrl: "https://www.nushell.sh/",
            author: "Equipo Nushell",
        });

        expect(html).toContain("Pipelines");
        expect(html).toContain('href="https://www.nushell.sh/"');
        expect(html).toMatch(/>\s*Nushell\s*<\/a>/);
        expect(html).toContain("Equipo Nushell");
    });

    test("respects the location slot without wrapping it automatically", async () => {
        const html = await renderWebPage(
            {
                title: "Pipelines",
                url: "https://www.nushell.sh/book/pipelines.html",
                location: "Nushell",
                locationUrl: "https://www.nushell.sh/",
            },
            {
                slots: {
                    location: '<strong data-slot="location">Nushell slot</strong>',
                },
            },
        );

        expect(html).toContain('data-slot="location"');
        expect(html).toContain("Nushell slot");
    });
});
