import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import Arrow from "../Arrow.astro";

type ArrowProps = {
    direction?: "up" | "down" | "left" | "right";
    class?: string;
    ariaLabel?: string;
};

async function renderArrow(props: ArrowProps): Promise<Element> {
    const render = await createAstroRenderer<ArrowProps>(Arrow);
    const html = await render(props);
    const document = new JSDOM(html).window.document;
    const span = document.querySelector("span");

    if (!span) {
        throw new Error("Arrow did not render a span element");
    }

    return span;
}

describe("Arrow.astro render", () => {
    test("renders a right arrow by default", async () => {
        const element = await renderArrow({});
        expect(element.textContent).toBe("→");
    });

    test.each([
        { direction: "up" as const, expected: "↑" },
        { direction: "down" as const, expected: "↓" },
        { direction: "left" as const, expected: "←" },
        { direction: "right" as const, expected: "→" },
    ])("renders the expected glyph for $direction", async ({ direction, expected }) => {
        const element = await renderArrow({ direction });
        expect(element.textContent).toBe(expected);
    });

    test("forwards class and aria-label", async () => {
        const element = await renderArrow({
            class: "custom-arrow",
            ariaLabel: "flecha a la derecha",
        });

        expect(element.getAttribute("class") ?? "").toContain("custom-arrow");
        expect(element.getAttribute("aria-label")).toBe("flecha a la derecha");
    });
});
