import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, suite, test } from "vitest";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import Definition from "../Definition.astro";

type DefinitionProps = {
    title?: string;
    headingLevel?: "h2" | "h3" | "h4" | "h5" | "h6";
};

let renderDefinition: Awaited<ReturnType<typeof createAstroRenderer<DefinitionProps>>>;

const parseHtml = (html: string): Document => new JSDOM(html).window.document;

describe("Definition.astro render", () => {
    beforeAll(async () => {
        renderDefinition = await createAstroRenderer<DefinitionProps>(Definition);
    });

    test("uses a global selector so slotted strong text in the body can receive the callout accent color", async () => {
        const html = await renderDefinition(
            { title: "Concepto importante" },
            {
                slots: {
                    default: "<p>Texto con <strong>énfasis</strong> dentro del cuerpo.</p>",
                },
            },
        );

        expect(html).toContain("<strong>énfasis</strong>");

        const testDir = dirname(fileURLToPath(import.meta.url));
        const source = readFileSync(
            join(testDir, "../CalloutShell.astro"),
            "utf8",
        );

        expect(source).toContain(".callout__body :global(:where(strong, b))");
        expect(source).toContain("color: var(--callout-title-color);");
    });
});

suite("Definition callout heading", () => {
    beforeAll(async () => {
        renderDefinition = await createAstroRenderer<DefinitionProps>(Definition);
    });

    test("renders the configured heading level", async () => {
        const html = await renderDefinition(
            { headingLevel: "h2", title: "The World" },
            {
                slots: {
                    default: "<p>DIO has entered the clock tower.</p>",
                },
            },
        );
        const document = parseHtml(html);
        const heading = document.querySelector("h2");

        expect(heading).not.toBeNull();
        expect(heading?.textContent).toContain("Definición - The World");
    });

    test("preserves the title classes and body content", async () => {
        const html = await renderDefinition(
            { headingLevel: "h2", title: "The World" },
            {
                slots: {
                    default: "<p>DIO has entered the clock tower.</p>",
                },
            },
        );
        const document = parseHtml(html);
        const heading = document.querySelector("h2");

        expect(heading?.className).toContain("callout__title");
        expect(heading?.textContent).toContain("Definición - The World");
        expect(document.body.textContent).toContain("DIO has entered the clock tower.");
    });
});
