import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import ListItem from "../ListItem.astro";
import TestIcon from "./fixtures/TestIcon.astro";

type ListItemProps = {
    icon?: unknown;
    iconSize?: string;
    iconColor?: string;
};

async function renderListItem(props: ListItemProps): Promise<Document> {
    const render = await createAstroRenderer<ListItemProps>(ListItem);
    const html = await render(props);

    return new JSDOM(html).window.document;
}

describe("ListItem.astro render", () => {
    test("uses callout color variable by default when iconColor is currentColor", async () => {
        const document = await renderListItem({ icon: TestIcon });
        const iconWrapper = document.querySelector(".listitem__icon");

        expect(iconWrapper).toBeTruthy();
        expect(iconWrapper?.getAttribute("style") ?? "").toContain(
            "color:var(--callout-title-color, var(--color-primary, currentColor))",
        );
    });

    test("does not force text-primary on the icon component", async () => {
        const document = await renderListItem({ icon: TestIcon });
        const icon = document.querySelector("[data-testid=\"test-icon\"]");

        expect(icon).toBeTruthy();
        expect(icon?.getAttribute("class") ?? "").not.toContain("text-primary");
    });
});
