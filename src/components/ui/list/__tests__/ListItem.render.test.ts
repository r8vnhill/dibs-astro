import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import ListItem from "../ListItem.astro";
import TestIcon from "./fixtures/TestIcon.astro";

type ListItemProps = {
    icon?: unknown;
    iconSize?: string;
    iconColor?: string;
    class?: string;
    id?: string;
    role?: string;
    "aria-label"?: string;
    "data-kind"?: string;
};

async function renderListItem(props: ListItemProps = {}, slot = "Item content"): Promise<Document> {
    const render = await createAstroRenderer<ListItemProps>(ListItem);
    const html = await render(props, { slots: { default: slot } });

    return new JSDOM(html).window.document;
}

describe("ListItem.astro render", () => {
    test("renders a root li with the base layout classes", async () => {
        const document = await renderListItem();
        const listItem = document.querySelector("li");

        expect(listItem).toBeTruthy();
        expect(listItem?.getAttribute("class")).toContain("flex");
        expect(listItem?.getAttribute("class")).toContain("items-start");
        expect(listItem?.getAttribute("class")).toContain("gap-2");
    });

    test("renders without an icon wrapper when icon is absent", async () => {
        const document = await renderListItem();

        expect(document.querySelector(".listitem__icon")).toBeNull();
    });

    test("renders the icon wrapper and icon component when icon is present", async () => {
        const document = await renderListItem({ icon: TestIcon });
        const iconWrapper = document.querySelector(".listitem__icon");
        const icon = document.querySelector("[data-testid=\"test-icon\"]");

        expect(iconWrapper).toBeTruthy();
        expect(iconWrapper?.getAttribute("aria-hidden")).toBe("true");
        expect(icon).toBeTruthy();
        expect(icon?.getAttribute("width")).toBe("1em");
        expect(icon?.getAttribute("height")).toBe("1em");
    });

    test("applies the default icon size and literal currentColor", async () => {
        const document = await renderListItem({ icon: TestIcon });
        const iconWrapper = document.querySelector(".listitem__icon");
        const style = iconWrapper?.getAttribute("style") ?? "";

        expect(style).toContain("font-size:1.25em");
        expect(style).toContain("color:currentColor");
        expect(style).toContain("line-height:1");
        expect(style).not.toContain("--callout-title-color");
        expect(style).not.toContain("margin-top");
    });

    test("applies a custom icon size and color", async () => {
        const document = await renderListItem({
            icon: TestIcon,
            iconSize: "2rem",
            iconColor: "tomato",
        });
        const style = document.querySelector(".listitem__icon")?.getAttribute("style") ?? "";

        expect(style).toContain("font-size:2rem");
        expect(style).toContain("color:tomato");
    });

    test("forwards native li attributes and merges consumer classes on the root element", async () => {
        const document = await renderListItem({
            class: "text-sm custom-item",
            id: "resource-item",
            role: "listitem",
            "aria-label": "Resource item",
            "data-kind": "reference",
        });
        const listItem = document.querySelector("li");

        expect(listItem?.getAttribute("id")).toBe("resource-item");
        expect(listItem?.getAttribute("role")).toBe("listitem");
        expect(listItem?.getAttribute("aria-label")).toBe("Resource item");
        expect(listItem?.getAttribute("data-kind")).toBe("reference");
        expect(listItem?.getAttribute("class")).toContain("text-sm");
        expect(listItem?.getAttribute("class")).toContain("custom-item");
    });

    test("renders the content wrapper with min-w-0 flex-1", async () => {
        const document = await renderListItem({}, "Long content");
        const contentWrapper = document.querySelector("li > div");

        expect(contentWrapper?.getAttribute("class")).toBe("min-w-0 flex-1");
        expect(contentWrapper?.textContent).toContain("Long content");
    });

    test("does not force text-primary on the icon component", async () => {
        const document = await renderListItem({ icon: TestIcon });
        const icon = document.querySelector("[data-testid=\"test-icon\"]");

        expect(icon).toBeTruthy();
        expect(icon?.getAttribute("class") ?? "").not.toContain("text-primary");
    });
});
