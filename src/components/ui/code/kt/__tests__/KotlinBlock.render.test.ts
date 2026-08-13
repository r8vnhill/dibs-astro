import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import KotlinBlock from "../KotlinBlock.astro";

type KotlinBlockProps = {
    code: string;
    title?: string;
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

    test("renders the title prop when no title slot is provided", async () => {
        const html = await renderKotlinBlock({ code: "fun main() = println(\"hi\")", title: "Ejemplo por prop" });

        const document = parseHtml(html);

        expect(document.body.textContent).toContain("Ejemplo por prop");
    });

    test("prefers a rich title slot over the title prop when both are given", async () => {
        const html = await renderKotlinBlock(
            { code: "fun main() = println(\"hi\")", title: "Ignorado" },
            { slots: { title: "<span>Slot con <em>énfasis</em></span>" } },
        );

        const document = parseHtml(html);

        expect(document.body.innerHTML).toContain("<em>énfasis</em>");
        expect(document.body.textContent).not.toContain("Ignorado");
    });
});
