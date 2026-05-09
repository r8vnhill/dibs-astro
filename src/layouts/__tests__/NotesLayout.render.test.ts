/**
 * @file Render-contract tests for {@link NotesLayout}.
 *
 * This suite verifies the observable HTML contract of {@link NotesLayout}. It focuses on layout composition and 
 * integration boundaries rather than visual styling.
 *
 * The protected behaviors are:
 *
 * - Rendering the `abstract` slot before the default slot.
 * - Rendering the abstract fallback when no `abstract` slot is provided.
 * - Rendering manual previous/next navigation links.
 * - Preserving support for both single-link and multi-link `previous` values.
 * - Resolving automatic navigation from the current route when no manual navigation is provided.
 * - Treating manual navigation as a complete override of automatic navigation.
 * - Rendering lesson metadata through the presentation boundary without exposing infrastructure-only fields.
 *
 * Exhaustive href-normalization behavior belongs in the pure navigation-normalization test suite. This render suite 
 * only checks that normalized links reach the final rendered anchors.
 */

import {
    maybeNavigationFrom,
    navigationFrom,
    nextLinkFrom,
    previousLinksFrom,
    queryRequired,
    type RenderedNavigationLink,
} from "$layouts/__tests__/fixtures/navigation-queries";
import { createNotesLayoutHarness } from "$layouts/__tests__/fixtures/notes-layout-harness";
import NotesLayout from "$layouts/NotesLayout.astro";
import type { NotesLayoutProps } from "$layouts/NotesLayout.props";
import { createAstroRenderer } from "$test-utils/astro-render";
import { beforeAll, describe, expect, test } from "vitest";

/**
 * Data-driven case for manual navigation rendering.
 *
 * Each case provides the navigation props passed to {@link NotesLayout} and the exact previous/next links expected in 
 * the rendered navigation region.
 */
type ManualNavigationCase = {
    name: string;
    props: Pick<NotesLayoutProps, "previous" | "next">;
    expectedPrevious: readonly RenderedNavigationLink[];
    expectedNext: RenderedNavigationLink | null;
};

/**
 * Manual-navigation rendering examples.
 *
 * These cases cover the stable shape of the manual navigation API:
 *
 * - A historical single `previous` link.
 * - Multiple `previous` links rendered in order.
 * - An optional manual `next` link rendered alongside manual previous links.
 *
 * Precedence edge cases, such as partial overrides and empty arrays, are tested separately because they exercise 
 * resolution policy rather than link shape.
 */
const manualNavigationCases = [
    {
        name: "a single previous link",
        props: {
            previous: {
                title: "Brian Cohen",
                href: "/notes/life-of-brian/brian-cohen",
            },
        },
        expectedPrevious: [
            {
                title: "Brian Cohen",
                href: "/notes/life-of-brian/brian-cohen/",
            },
        ],
        expectedNext: null,
    },
    {
        name: "multiple previous links in order with a next link",
        props: {
            previous: [
                {
                    title: "Judith",
                    href: "/notes/life-of-brian/judith",
                },
                {
                    title: "Reg",
                    href: "/notes/life-of-brian/reg",
                },
            ],
            next: {
                title: "People's Front of Judea",
                href: "/notes/life-of-brian/peoples-front-of-judea",
            },
        },
        expectedPrevious: [
            {
                title: "Judith",
                href: "/notes/life-of-brian/judith/",
            },
            {
                title: "Reg",
                href: "/notes/life-of-brian/reg/",
            },
        ],
        expectedNext: {
            title: "People's Front of Judea",
            href: "/notes/life-of-brian/peoples-front-of-judea/",
        },
    },
] as const satisfies readonly ManualNavigationCase[];

describe("NotesLayout.astro render", () => {
    let renderNotes: ReturnType<typeof createNotesLayoutHarness>["renderNotes"];
    let parseHtml: ReturnType<typeof createNotesLayoutHarness>["parseHtml"];

    /**
     * Builds the Astro renderer once for the suite.
     *
     * The renderer is immutable after creation, and the suite is intentionally not concurrent. Reusing it avoids 
     * repeated setup while keeping shared state stable.
     */
    beforeAll(async () => {
        const renderLayout = await createAstroRenderer<NotesLayoutProps>(NotesLayout);
        const harness = createNotesLayoutHarness(renderLayout);

        renderNotes = harness.renderNotes;
        parseHtml = harness.parseHtml;
    });

    describe("abstract slot", () => {
        test("renders abstract content before the default body", async () => {
            const html = await renderNotes(
                { title: "Brian's very confusing day" },
                {
                    slots: {
                        abstract: "<p>A short summary about mistaken identity.</p>",
                        default: "<p>The main lesson follows Brian through escalating confusion.</p>",
                    },
                },
            );

            expect(html).toContain("A short summary about mistaken identity.");
            expect(html).toContain(
                "The main lesson follows Brian through escalating confusion.",
            );
            expect(
                html.indexOf("A short summary about mistaken identity."),
            ).toBeLessThan(
                html.indexOf(
                    "The main lesson follows Brian through escalating confusion.",
                ),
            );
        });

        test("renders the abstract fallback when the abstract slot is absent", async () => {
            const html = await renderNotes(
                { title: "Brian's very confusing day" },
                {
                    slots: {
                        default: "<p>The main lesson follows Brian through escalating confusion.</p>",
                    },
                },
            );

            const doc = parseHtml(html);

            expect(
                doc.querySelector("[data-testid='abstract-fallback']"),
            ).not.toBeNull();
            expect(html).toContain(
                "The main lesson follows Brian through escalating confusion.",
            );
        });
    });

    describe("manual navigation", () => {
        test.each(manualNavigationCases)(
            "renders $name",
            async ({ props, expectedPrevious, expectedNext }) => {
                const html = await renderNotes({
                    title: "Brian's very confusing day",
                    ...props,
                });

                const doc = parseHtml(html);
                const nav = navigationFrom(doc);

                expect(previousLinksFrom(nav)).toEqual(expectedPrevious);
                expect(nextLinkFrom(nav)).toEqual(expectedNext);
            },
        );
    });

    describe("automatic navigation", () => {
        test("resolves links from the current production route", async () => {
            const html = await renderNotes(
                { title: "Diseñar la API desde el dominio" },
                { pathname: "/notes/software-libraries/api-design/fundamentals/" },
            );

            const doc = parseHtml(html);
            const nav = navigationFrom(doc);

            // This route is part of the production course graph, so the expected links come
            // from real navigation data rather than synthetic fixtures.
            const previousLinks = previousLinksFrom(nav);
            const nextLink = nextLinkFrom(nav);

            expect(previousLinks).toHaveLength(1);
            expect(previousLinks[0]?.title).toContain(
                "La biblioteca como artefacto de software",
            );
            expect(previousLinks[0]?.href).toBe("/notes/software-libraries/what-is/");

            expect(nextLink).not.toBeNull();
            expect(nextLink?.title).toContain(
                "Evolucionar una API sin romper compatibilidad",
            );
            expect(nextLink?.href).toBe(
                "/notes/software-libraries/api-design/evolution/",
            );
        });

        test("omits navigation for an unknown route without manual links", async () => {
            const html = await renderNotes(
                { title: "The unknown prophet" },
                { pathname: "/notes/life-of-brian/unknown-prophet/" },
            );

            const doc = parseHtml(html);

            expect(maybeNavigationFrom(doc)).toBeNull();
        });
    });

    describe("manual override precedence", () => {
        test("manual previous and next replace automatic navigation", async () => {
            const html = await renderNotes(
                {
                    title: "The sandal and the gourd",
                    previous: {
                        title: "The sandal",
                        href: "/notes/life-of-brian/the-sandal",
                    },
                    next: {
                        title: "The gourd",
                        href: "/notes/life-of-brian/the-gourd",
                    },
                },
                {
                    pathname: "/notes/software-libraries/api-design/fundamentals/",
                },
            );

            const doc = parseHtml(html);
            const nav = navigationFrom(doc);

            expect(previousLinksFrom(nav)).toEqual([
                { title: "The sandal", href: "/notes/life-of-brian/the-sandal/" },
            ]);
            expect(nextLinkFrom(nav)).toEqual({
                title: "The gourd",
                href: "/notes/life-of-brian/the-gourd/",
            });
        });

        test("manual previous alone disables automatic next navigation", async () => {
            const html = await renderNotes(
                {
                    title: "The sandal and the gourd",
                    previous: {
                        title: "The sandal",
                        href: "/notes/life-of-brian/the-sandal",
                    },
                },
                {
                    pathname: "/notes/software-libraries/api-design/fundamentals/",
                },
            );

            const doc = parseHtml(html);
            const nav = navigationFrom(doc);

            // Any manual navigation prop disables automatic navigation for both directions.
            expect(previousLinksFrom(nav)).toEqual([
                { title: "The sandal", href: "/notes/life-of-brian/the-sandal/" },
            ]);
            expect(nextLinkFrom(nav)).toBeNull();
        });

        test("manual next alone disables automatic previous navigation", async () => {
            const html = await renderNotes(
                {
                    title: "The sandal and the gourd",
                    next: {
                        title: "The gourd",
                        href: "/notes/life-of-brian/the-gourd",
                    },
                },
                {
                    pathname: "/notes/software-libraries/api-design/fundamentals/",
                },
            );

            const doc = parseHtml(html);
            const nav = navigationFrom(doc);

            expect(previousLinksFrom(nav)).toEqual([]);
            expect(nextLinkFrom(nav)).toEqual({
                title: "The gourd",
                href: "/notes/life-of-brian/the-gourd/",
            });
        });

        test("empty manual previous disables automatic previous navigation", async () => {
            const html = await renderNotes(
                {
                    title: "The empty shoe rack",
                    previous: [],
                },
                {
                    pathname: "/notes/software-libraries/api-design/fundamentals/",
                },
            );

            const doc = parseHtml(html);
            const nav = navigationFrom(doc);

            // An empty array is an explicit manual override, not an absent value.
            expect(previousLinksFrom(nav)).toHaveLength(0);
        });
    });

    describe("lesson metadata", () => {
        test("renders presentation metadata without infrastructure fields", async () => {
            const html = await renderNotes(
                { title: "Introducción a PowerShell" },
                { pathname: "/notes/scripting/" },
            );

            const doc = parseHtml(html);
            const metadataPanel = queryRequired<HTMLElement>(
                doc,
                "[data-testid='lesson-metadata-panel']",
            );

            expect(
                doc.querySelector("[data-testid='panel-title']")?.textContent,
            ).toContain("Metadatos de la lección");
            expect(
                doc.querySelector("[data-testid='authors-value']")?.textContent?.trim(),
            ).toBeTruthy();
            expect(
                doc.querySelector("[data-testid='last-updated-value']")?.textContent?.trim(),
            ).toBeTruthy();

            expect(metadataPanel.textContent).not.toContain("sourceFile");
        });
    });
});
