import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import Definition from "../Definition.astro";

type DefinitionProps = {
    title?: string;
};

let renderDefinition: Awaited<ReturnType<typeof createAstroRenderer<DefinitionProps>>>;

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
