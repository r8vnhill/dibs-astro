import { load } from "cheerio";
import { beforeAll, expect, suite, test } from "vitest";
import { createAstroRenderer } from "../../../test-utils/astro-render";
import Heading from "../Heading.astro";

type HeadingProps = {
    headingLevel?: "h2" | "h3" | "h4" | "h5" | "h6";
};

let renderHeading: Awaited<ReturnType<typeof createAstroRenderer<HeadingProps>>>;

suite("given a semantic heading component", () => {
    beforeAll(async () => {
        renderHeading = await createAstroRenderer<HeadingProps>(Heading);
    });

    test.each(
        [
            ["h2", "Kakyoin Noriaki"],
            ["h3", "Jean Pierre Polnareff"],
            ["h4", "Muhammad Avdol"],
            ["h5", "Noriaki's Hierophant"],
            ["h6", "Star Platinum"],
        ] as const,
    )("then it renders a %s heading with its slot content", async (headingLevel, text) => {
        const html = await renderHeading(
            { headingLevel },
            {
                slots: {
                    default: text,
                },
            },
        );

        const $ = load(html);
        const heading = $(headingLevel);

        expect(heading).toHaveLength(1);
        expect(heading.text().trim()).toBe(text);
    });
});
