import { type AstroRender, createAstroRenderer } from "$test-utils/astro-render";
import { load } from "cheerio";
import { expect } from "vitest";
import { beforeAll, describe, suite, test } from "vitest";
import P from "../P.astro";

type ParagraphProps = {
    class?: string;
    id?: string;
    title?: string;
    lang?: string;
    dir?: "ltr" | "rtl" | "auto";
    style?: string;
    "aria-label"?: string;
    "data-track"?: string;
};

suite("given the semantic paragraph component", () => {
    let render: AstroRender<ParagraphProps>;

    beforeAll(async () => {
        render = await createAstroRenderer<ParagraphProps>(P);
    });

    describe("when rendered with ordinary content", () => {
        test("then it produces exactly one paragraph containing the slot", async () => {
            const html = await render({});
            const document = load(html);

            expect(document("p")).toHaveLength(1);
            expect(document("p").text()).toBe("");
        });

        test("then it preserves text content", async () => {
            const html = await render({}, { slots: { default: "Project status" } });

            expect(load(html)("p").text()).toBe("Project status");
        });
    });

    describe("when consumer attributes are provided", () => {
        test.each(
            [
                ["id", "powerslave-summary"],
                ["title", "Project summary"],
                ["lang", "en"],
                ["dir", "ltr"],
                ["style", "color: red"],
                ["aria-label", "Project status"],
                ["data-track", "paragraph"],
            ] as const,
        )("then it forwards %s with its exact value", async (attribute, value) => {
            const html = await render({ [attribute]: value });
            const paragraph = load(html)("p");

            expect(paragraph.attr(attribute)).toBe(value);
        });

        test("then it combines the consumer class with the current spacing class", async () => {
            const html = await render({ class: "lesson-summary" });
            const paragraph = load(html)("p");

            expect(paragraph.attr("class")?.split(/\s+/)).toEqual(
                expect.arrayContaining(["my-2", "lesson-summary"]),
            );
        });

        test("then it preserves the canonical migration fixture", async () => {
            const html = await render(
                {
                    id: "powerslave-summary",
                    class: "lesson-summary",
                    lang: "en",
                    "data-track": "powerslave",
                },
                { slots: { default: "Project status" } },
            );
            const paragraph = load(html)("p");

            expect(paragraph.attr("id")).toBe("powerslave-summary");
            expect(paragraph.attr("class")?.split(/\s+/)).toEqual(
                expect.arrayContaining(["my-2", "lesson-summary"]),
            );
            expect(paragraph.attr("lang")).toBe("en");
            expect(paragraph.attr("data-track")).toBe("powerslave");
            expect(paragraph.text()).toBe("Project status");
        });
    });

    test("then it remains a static component without hydration markers", async () => {
        const html = await render({}, { slots: { default: "Static paragraph" } });

        expect(html).not.toContain("astro-island");
        expect(html).not.toContain("client:");
        expect(html).not.toContain("<script");
    });
});
