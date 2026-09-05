import { load } from "cheerio";
import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "~/test-utils/astro-render";
import Header from "../Header.astro";

const themeLabels = {
    current: "Current theme",
    change: "Change theme",
    light: "Light",
    dark: "Dark",
    auto: "Automatic",
};

type HeaderTestProps = {
    title: string;
    themeLabels: typeof themeLabels;
};

async function renderHeader(locals: App.Locals = {}): Promise<ReturnType<typeof load>> {
    const render = await createAstroRenderer<HeaderTestProps>(Header);
    const html = await render({ title: "DIBS", themeLabels }, { locals });
    return load(html);
}

suite("given the DIBS header adapter", () => {
    test("then it exposes one named primary navigation landmark in structural order", async () => {
        const $ = await renderHeader();
        const children = $("header > div").children().toArray();

        expect($("header")).toHaveLength(1);
        expect($("header nav")).toHaveLength(1);
        expect($("header nav").attr("aria-label")).toBe("Navegación principal");
        expect(children.map((child) => child.tagName)).toEqual(["div", "nav", "div"]);
        expect($("header nav astro-island")).toHaveLength(0);
        expect($("header nav .desktop-nav-list a")).toHaveLength(5);
        expect($("header nav .mobile-nav-list a")).toHaveLength(5);
    });

    test("then PDF export keeps the DIBS export marker on the package header", async () => {
        const $ = await renderHeader({ lessonRenderMode: "pdf" });

        expect($("header").attr("data-export-hidden")).toBe("true");
    });
});
