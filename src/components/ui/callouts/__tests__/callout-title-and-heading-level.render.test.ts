/**
 * @file Render-contract tests shared by the Important/Tip/Warning callout family.
 *
 * `CalloutShell` already implements a `title` prop and a richer `title` slot (slot wins when both
 * are present), and `CalloutHeading` already defaults to `h3`. This suite locks that contract with a
 * data-driven test across the three variants, since lesson call sites now rely on it directly instead
 * of always wiring `<span slot="title">` and an explicit `headingLevel="h3"`.
 */

import { JSDOM } from "jsdom";
import { suite, beforeAll, describe, expect, test } from "vitest";
import { createAstroRenderer } from "$test-utils/astro-render";
import { Important, Tip, Warning } from "$callouts";

type CalloutProps = {
    title?: string;
    headingLevel?: "h2" | "h3" | "h4" | "h5" | "h6";
};

const variants = [
    { name: "Important", Component: Important },
    { name: "Tip", Component: Tip },
    { name: "Warning", Component: Warning },
] as const;

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

suite.each(variants)("given the $name callout", ({ Component }) => {
    let render: Awaited<ReturnType<typeof createAstroRenderer<CalloutProps>>>;

    beforeAll(async () => {
        render = await createAstroRenderer<CalloutProps>(Component);
    });

    describe("when no headingLevel is passed", () => {
        test("then its title renders as an h3 by default", async () => {
            const html = await render({ title: "Plain title" });
            const doc = parseHtml(html);

            const heading = doc.querySelector("h3");
            expect(heading).not.toBeNull();
            expect(heading?.textContent?.trim()).toBe("Plain title");
        });
    });

    describe("when an explicit headingLevel override is passed", () => {
        test("then it renders that heading level instead of the h3 default", async () => {
            const html = await render({ title: "Nested title", headingLevel: "h4" });
            const doc = parseHtml(html);

            expect(doc.querySelector("h4")?.textContent?.trim()).toBe("Nested title");
            expect(doc.querySelector("h3")).toBeNull();
        });
    });

    describe("when both a title prop and a rich title slot are provided", () => {
        test("then the title slot wins over the title prop", async () => {
            const html = await render(
                { title: "Ignored plain title" },
                { slots: { title: "Rich <em>title</em>" } },
            );
            const doc = parseHtml(html);

            expect(doc.querySelector("h3")?.innerHTML).toContain("<em>title</em>");
            expect(html).not.toContain("Ignored plain title");
        });
    });
});
