import { ClosingReflection } from "$callouts";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, suite, test } from "vitest";

type ClosingReflectionProps = {
    id?: string;
    title?: string;
    compact?: boolean;
};

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

suite("given the ClosingReflection callout", () => {
    let render: Awaited<ReturnType<typeof createAstroRenderer<ClosingReflectionProps>>>;

    beforeAll(async () => {
        render = await createAstroRenderer<ClosingReflectionProps>(ClosingReflection);
    });

    describe("when rendered with its defaults", () => {
        test("then it exposes the closing-reflection variant and accessible title", async () => {
            const html = await render(
                { id: "closing-reflection" },
                { slots: { default: "<p>La siguiente lección continúa la pregunta.</p>" } },
            );
            const doc = parseHtml(html);
            const section = doc.querySelector("[data-callout]");

            expect(section?.getAttribute("data-variant")).toBe("closing-reflection");
            expect(section?.id).toBe("closing-reflection");
            expect(section?.getAttribute("aria-labelledby")).toBe("closing-reflection__title");
            expect(section?.classList.contains("px-4")).toBe(true);
            expect(section?.classList.contains("py-3")).toBe(true);
            expect(doc.querySelector("#closing-reflection__title")?.textContent).toContain("Reflexión de cierre");
            expect(doc.body.textContent).toContain("La siguiente lección continúa la pregunta.");
        });
    });

    describe("when compact is explicitly disabled", () => {
        test("then it preserves the shared callout padding contract", async () => {
            const html = await render({ compact: false });
            const doc = parseHtml(html);
            const section = doc.querySelector("[data-callout]");

            expect(section?.classList.contains("px-5")).toBe(true);
            expect(section?.classList.contains("py-4")).toBe(true);
        });
    });
});
