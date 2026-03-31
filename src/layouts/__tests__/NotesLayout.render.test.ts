/**
 * @file NotesLayout.render.test.ts
 *
 * Render-level contract tests for {@link NotesLayout}.
 *
 * This suite protects the layout's lesson-navigation behavior after the introduction of multi-link
 * `previous` support. The important boundary here is not visual styling, but how the layout
 * resolves and renders navigation data from two sources:
 *
 * - manual props passed by a page frontmatter-like caller;
 * - automatic previous/next links derived from the real course structure through `Astro.url`.
 *
 * ## What this suite protects
 *
 * - The named `abstract` slot and its fallback placeholder.
 * - Separation between abstract content and the main default slot.
 * - Backward compatibility for the historical `previous` single-link contract.
 * - Rendering order for `previous` arrays.
 * - Precedence rules: manual `previous` overrides auto navigation completely.
 * - URL normalization in rendered anchors.
 *
 * ## Why render tests instead of pure helper tests?
 *
 * `navigation.ts` already covers normalization in isolation. This suite verifies the integration
 * point where `NotesLayout`:
 *
 * - reads `Astro.url.pathname`,
 * - resolves auto navigation,
 * - folds manual overrides into the final UI,
 * - emits actual `<a rel="prev|next">` links.
 *
 * The tests intentionally use real course routes for the auto-navigation scenario so the layout is
 * exercised against the same source of truth that production uses.
 */
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, test } from "vitest";
import { createAstroRenderer, type AstroRender } from "../../test-utils/astro-render";
import NotesLayout from "../NotesLayout.astro";
import type { NavigationLinkInput } from "~/utils";

interface LayoutProps {
    title: string;
    description?: string;
    previous?: NavigationLinkInput | readonly NavigationLinkInput[];
    next?: NavigationLinkInput;
}

const parseHtml = (html: string): Document => new JSDOM(html).window.document;

let renderLayout: AstroRender<LayoutProps>;

describe.concurrent("NotesLayout.astro render", () => {
    /**
     * The layout includes React-backed children, so tests reuse the shared Astro renderer helper
     * that bootstraps the required container renderers.
     */
    beforeEach(async () => {
        renderLayout = await createAstroRenderer<LayoutProps>(NotesLayout);
    });

    test("renders named abstract slot content before the main body", async () => {
        const html = await renderLayout(
            {
                title: "Leccion de prueba",
            },
            {
                request: new Request("https://dibs.ravenhill.cl/notes/example/"),
                slots: {
                    abstract: "<p>Resumen breve</p>",
                    default: "<p>Contenido principal</p>",
                },
            },
        );

        expect(html).toContain("Resumen breve");
        expect(html).toContain("Contenido principal");
        expect(html.indexOf("Resumen breve")).toBeLessThan(html.indexOf("Contenido principal"));
    });

    test("renders the abstract fallback placeholder when the abstract slot is missing", async () => {
        const html = await renderLayout(
            {
                title: "Leccion de prueba",
            },
            {
                request: new Request("https://dibs.ravenhill.cl/notes/example/"),
                slots: { default: "<p>Contenido principal</p>" },
            },
        );

        expect(html).toContain('component-url="~/components/utils/ToDo"');
        expect(html).toContain('client="only"');
        expect(html).toContain("Contenido principal");
    });

    test("renders one previous button when previous is a single link", async () => {
        const html = await renderLayout(
            {
                title: "Leccion de prueba",
                previous: {
                    title: "PowerShell",
                    href: "/notes/software-libraries/scripting/structured-output",
                },
            },
            {
                request: new Request("https://dibs.ravenhill.cl/notes/example/"),
                slots: {
                    abstract: "<p>Resumen breve</p>",
                    default: "<p>Contenido</p>",
                },
            },
        );

        const doc = parseHtml(html);
        const nav = doc.querySelector('nav[aria-label="Siguiente o anterior lección"]');
        const previousLinks = [...(nav?.querySelectorAll('a[rel="prev"]') ?? [])];

        expect(previousLinks).toHaveLength(1);
        expect(previousLinks[0]?.textContent).toContain("PowerShell");
        expect(previousLinks[0]?.getAttribute("href")).toBe(
            "/notes/software-libraries/scripting/structured-output/",
        );
    });

    test("renders multiple previous buttons in order when previous is an array", async () => {
        const html = await renderLayout(
            {
                title: "Leccion de prueba",
                previous: [
                    {
                        title: "PowerShell",
                        href: "/notes/software-libraries/scripting/structured-output",
                    },
                    {
                        title: "Nushell",
                        href: "/notes/software-libraries/scripting/structured-output/nushell",
                    },
                ],
                next: {
                    title: "Pipelines",
                    href: "/notes/software-libraries/scripting/pipelines",
                },
            },
            {
                request: new Request("https://dibs.ravenhill.cl/notes/example/"),
                slots: {
                    abstract: "<p>Resumen breve</p>",
                    default: "<p>Contenido</p>",
                },
            },
        );

        const doc = parseHtml(html);
        const nav = doc.querySelector('nav[aria-label="Siguiente o anterior lección"]');
        const previousLinks = [...(nav?.querySelectorAll('a[rel="prev"]') ?? [])];
        const nextLink = nav?.querySelector('a[rel="next"]');

        expect(previousLinks).toHaveLength(2);
        expect(previousLinks.map((link) => link.textContent?.replace(/\s+/g, " ").trim())).toEqual([
            "PowerShell",
            "Nushell",
        ]);
        expect(previousLinks.map((link) => link.getAttribute("href"))).toEqual([
            "/notes/software-libraries/scripting/structured-output/",
            "/notes/software-libraries/scripting/structured-output/nushell/",
        ]);
        expect(nextLink?.textContent).toContain("Pipelines");
    });

    test("uses auto navigation previous when there is no manual override", async () => {
        const html = await renderLayout(
            {
                title: "Ensayo seguro (-WhatIf/-Confirm)",
            },
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/software-libraries/scripting/should-process/",
                ),
                slots: {
                    abstract: "<p>Resumen breve</p>",
                    default: "<p>Contenido</p>",
                },
            },
        );

        const doc = parseHtml(html);
        const nav = doc.querySelector('nav[aria-label="Siguiente o anterior lección"]');
        const previousLinks = [...(nav?.querySelectorAll('a[rel="prev"]') ?? [])];

        // This route is part of the real course structure, so the expected previous link comes
        // from production navigation data rather than from a test double.
        expect(previousLinks).toHaveLength(1);
        expect(previousLinks[0]?.textContent).toContain("Salida estructurada");
        expect(previousLinks[0]?.getAttribute("href")).toBe(
            "/notes/software-libraries/scripting/structured-output/",
        );
    });

    test("manual previous array takes precedence over auto navigation", async () => {
        const html = await renderLayout(
            {
                title: "Ensayo seguro (-WhatIf/-Confirm)",
                previous: [
                    { title: "PowerShell", href: "/notes/software-libraries/scripting/structured-output" },
                    { title: "Nushell", href: "/notes/software-libraries/scripting/structured-output/nushell" },
                ],
            },
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/software-libraries/scripting/should-process/",
                ),
                slots: {
                    abstract: "<p>Resumen breve</p>",
                    default: "<p>Contenido</p>",
                },
            },
        );

        const doc = parseHtml(html);
        const nav = doc.querySelector('nav[aria-label="Siguiente o anterior lección"]');
        const previousLinks = [...(nav?.querySelectorAll('a[rel="prev"]') ?? [])];

        expect(previousLinks.map((link) => link.textContent?.replace(/\s+/g, " ").trim())).toEqual([
            "PowerShell",
            "Nushell",
        ]);
    });
});
