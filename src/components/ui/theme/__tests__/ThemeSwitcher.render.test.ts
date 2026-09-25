import { load } from "cheerio";
import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "~/test-utils/astro-render";
import type { ThemeLabels } from "../theme-labels";
import ThemeSwitcher from "../ThemeSwitcher.astro";

const labels = {
    current: "Tema actual:",
    change: "Cambiar tema",
    light: "Claro",
    dark: "Oscuro",
    auto: "Auto",
} as unknown as ThemeLabels;

async function renderSwitcher(): Promise<ReturnType<typeof load>> {
    const render = await createAstroRenderer<{ labels: ThemeLabels }>(ThemeSwitcher);
    return load(await render({ labels }));
}

suite("given the Astro theme switcher", () => {
    test("then it renders a framework-free custom element, not a React island", async () => {
        const $ = await renderSwitcher();

        expect($("theme-switcher")).toHaveLength(1);
        expect($("astro-island")).toHaveLength(0);
        expect($("theme-switcher").attr("data-default")).toBe("auto");
    });

    test("then all three localized options are present in the server-rendered HTML", async () => {
        const $ = await renderSwitcher();
        const options = $("theme-switcher [data-theme-value]");

        expect(options.map((_, el) => $(el).attr("data-theme-value")).toArray())
            .toEqual(["light", "dark", "auto"]);
        expect(options.map((_, el) => $(el).find("span").text()).toArray())
            .toEqual(["Claro", "Oscuro", "Auto"]);
        expect($("[data-theme-value='dark']").attr("aria-label")).toBe("Cambiar tema a Oscuro");
    });

    test("then the disclosure starts closed", async () => {
        const $ = await renderSwitcher();
        const trigger = $("[data-theme-trigger]");

        expect(trigger.attr("aria-expanded")).toBe("false");
        expect(trigger.attr("aria-controls")).toBe("theme-switcher-options");
        expect($("#theme-switcher-options").attr("hidden")).not.toBeUndefined();
    });

    test("then the default selection is marked as pressed and shown as current", async () => {
        const $ = await renderSwitcher();

        expect($("[data-theme-value='auto']").attr("aria-pressed")).toBe("true");
        expect($("[data-theme-value='light']").attr("aria-pressed")).toBe("false");
        expect($("[data-theme-current='auto']").attr("hidden")).toBeUndefined();
        expect($("[data-theme-current='light']").attr("hidden")).not.toBeUndefined();
    });
});
