import References from "$components/ui/references/References.astro";
import { createAstroRenderer } from "$test-utils/astro-render";
import { beforeAll, expect, suite, test } from "vitest";

suite("given reference-list slots", () => {
    let renderReferences: Awaited<ReturnType<typeof createAstroRenderer<Record<string, never>>>>;

    beforeAll(async () => {
        renderReferences = await createAstroRenderer<Record<string, never>>(References);
    });

    test("then meaningful rich content is rendered in its selected section", async () => {
        const html = await renderReferences({}, {
            slots: {
                recommended: "<li><strong>Referencia recomendada</strong></li>",
                additional: "<li><em>Referencia adicional</em></li>",
            },
        });

        expect(html).toContain("Referencia recomendada");
        expect(html).toContain("Referencia adicional");
        expect(html).toContain("<strong>Referencia recomendada</strong>");
        expect(html).toContain("<em>Referencia adicional</em>");
        expect(html.match(/Referencia recomendada/g)).toHaveLength(1);
        expect(html.match(/Referencia adicional/g)).toHaveLength(1);
    });

    test("then an empty forwarded slot does not create a reference section", async () => {
        const html = await renderReferences({}, {
            slots: { recommended: "<!-- intentionally empty -->" },
        });

        expect(html).not.toContain("Referencias recomendadas");
    });
});
