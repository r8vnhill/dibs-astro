import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import Dash from "../Dash.astro";

type DashProps = {
    kind?: "hyphen" | "en" | "em" | "minus";
    length?: number;
    class?: string;
    ariaLabel?: string;
};

async function renderDash(props: DashProps): Promise<Element> {
    const render = await createAstroRenderer<DashProps>(Dash);
    const html = await render(props);
    const document = new JSDOM(html).window.document;
    const span = document.querySelector("span");

    if (!span) {
        throw new Error("Dash did not render a span element");
    }

    return span;
}

describe("Dash.astro render", () => {
    test("renders an en dash by default", async () => {
        const element = await renderDash({});
        expect(element.textContent).toBe("–");
    });

    test("repeats the selected dash according to length", async () => {
        const element = await renderDash({ length: 2 });
        expect(element.textContent).toBe("––");
    });

    test.each([
        { kind: "hyphen" as const, expected: "-" },
        { kind: "en" as const, expected: "–" },
        { kind: "em" as const, expected: "—" },
        { kind: "minus" as const, expected: "−" },
    ])("renders the expected glyph for $kind", async ({ kind, expected }) => {
        const element = await renderDash({ kind });
        expect(element.textContent).toBe(expected);
    });

    test.each([0, -1, -5])("normalizes non-positive lengths to 1 (%i)", async (length) => {
        const element = await renderDash({ kind: "em", length });
        expect(element.textContent).toBe("—");
    });

    test("forwards class and aria-label", async () => {
        const element = await renderDash({
            class: "custom-dash",
            ariaLabel: "raya larga",
        });

        expect(element.getAttribute("class") ?? "").toContain("custom-dash");
        expect(element.getAttribute("aria-label")).toBe("raya larga");
    });
});
