import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import KotlinBlock from "../KotlinBlock.astro";

type KotlinBlockProps = {
    code: string;
};

let renderKotlinBlock: Awaited<ReturnType<typeof createAstroRenderer<KotlinBlockProps>>>;

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

describe("KotlinBlock.astro render", () => {
    beforeAll(async () => {
        renderKotlinBlock = await createAstroRenderer<KotlinBlockProps>(KotlinBlock);
    });

    test("renders footer slot content when provided", async () => {
        const html = await renderKotlinBlock(
            { code: "fun main() = println(\"hi\")" },
            {
                slots: {
                    title: "<span>Ejemplo Kotlin</span>",
                    footer: "<span>Contexto adicional</span>",
                },
            },
        );

        const document = parseHtml(html);

        expect(document.body.textContent).toContain("Ejemplo Kotlin");
        expect(document.body.textContent).toContain("Contexto adicional");
    });

    test("renders correctly without footer content", async () => {
        const html = await renderKotlinBlock(
            { code: "fun main() = println(\"hi\")" },
            {
                slots: {
                    title: "<span>Solo titulo</span>",
                },
            },
        );

        const document = parseHtml(html);

        expect(document.body.textContent).toContain("Solo titulo");
        expect(document.body.textContent).not.toContain("Contexto adicional");
        expect(document.querySelector("pre")).not.toBeNull();
    });
});
