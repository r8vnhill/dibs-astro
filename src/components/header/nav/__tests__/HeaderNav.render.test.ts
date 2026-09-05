import { load } from "cheerio";
import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "~/test-utils/astro-render";
import HeaderNav from "../HeaderNav.astro";

const items = [
    { id: "home", href: "/", label: "Inicio" },
    { id: "notes", href: "/notes/", label: "Apuntes" },
    { id: "lessons", href: "/lessons/", label: "Clases" },
    { id: "syllabus", href: "/syllabus/", label: "Temario" },
    { id: "assignments", href: "/assignments/", label: "Tareas" },
];

type HeaderNavTestProps = {
    items: typeof items;
};

async function renderHeaderNav() {
    const render = await createAstroRenderer<HeaderNavTestProps>(HeaderNav);
    const html = await render({ items });
    return load(html);
}

suite("given the DIBS header navigation", () => {
    test("then it renders both responsive representations from the supplied item order", async () => {
        const $ = await renderHeaderNav();
        const expectedLabels = items.map((item) => item.label);

        expect($(".desktop-nav-list a").map((_, link) => $(link).text()).get()).toEqual(expectedLabels);
        expect($(".mobile-nav-list a").map((_, link) => $(link).text()).get()).toEqual(expectedLabels);
        expect($(".desktop-nav-list a").map((_, link) => $(link).attr("href")).get()).toEqual(
            items.map((item) => item.href),
        );
    });

    test("then it starts with an accessible closed mobile control", async () => {
        const $ = await renderHeaderNav();
        const toggle = $("[data-nav-toggle]");
        const panel = $("[data-nav-panel]");

        expect(toggle.attr("aria-label")).toBe("Abrir menú de navegación");
        expect(toggle.attr("aria-expanded")).toBe("false");
        expect(panel.attr("aria-hidden")).toBe("true");
        expect(panel.attr("popover")).toBe("auto");
        expect($("nav")).toHaveLength(0);
        expect($("[data-menu-icon]").attr("aria-hidden")).toBe("true");
        expect($("[data-close-icon]").attr("aria-hidden")).toBe("true");
    });

    test("then it preserves trailing-slash internal links without emitting a framework island", async () => {
        const $ = await renderHeaderNav();

        expect($(".mobile-nav-list a[href='/notes/']")).toHaveLength(1);
        expect($(".mobile-nav-list a[href='/lessons/']")).toHaveLength(1);
        expect($("astro-island")).toHaveLength(0);
    });
});
