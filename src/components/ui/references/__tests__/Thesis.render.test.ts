import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import Thesis from "../Thesis.astro";

type ThesisProps = {
    title?: string;
    url: string;
    institution?: string;
    institutionUrl?: string;
    author?: string;
};

let renderThesis: AstroRender<ThesisProps>;

describe.concurrent("Thesis.astro render", () => {
    beforeEach(async () => {
        renderThesis = await createAstroRenderer<ThesisProps>(Thesis);
    });

    test("renders a linked institution when institutionUrl is provided", async () => {
        const html = await renderThesis({
            title: "An Empirical Study on Bash Language Usage in Github",
            url: "http://hdl.handle.net/10012/17036",
            institution: "University of Waterloo",
            institutionUrl: "https://uwaterloo.ca/",
            author: "Quien investiga",
        });

        expect(html).toContain("An Empirical Study on Bash Language Usage in Github");
        expect(html).toContain('href="https://uwaterloo.ca/"');
        expect(html).toMatch(/>\s*University of Waterloo\s*<\/a>/);
        expect(html).toContain("Quien investiga");
    });

    test("respects the institution slot without wrapping it automatically", async () => {
        const html = await renderThesis(
            {
                title: "Thesis",
                url: "https://example.com/thesis",
                institution: "Institution base",
                institutionUrl: "https://example.com/institution",
            },
            {
                slots: {
                    institution: '<em data-slot="institution">Institución desde slot</em>',
                },
            },
        );

        expect(html).toContain('data-slot="institution"');
        expect(html).toContain("Institución desde slot");
    });
});
