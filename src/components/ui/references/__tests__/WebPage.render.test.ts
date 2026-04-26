import { describe, expect, suite, test } from "vitest";
import { type AstroRender } from "../../../../test-utils/astro-render";
import { MissingReferenceTitleError, ReferenceContractError } from "../ReferenceContractError";
import WebPage from "../WebPage.astro";
import {
    expectDescriptionAbsent,
    expectDescriptionPresence,
    expectInlineMetaLink,
    expectInlineMetaPlainText,
    expectLinkedTitle,
    expectMetaLabelAbsent,
    expectSlotOverridesProp,
    renderReference,
} from "./reference-render-contracts";

type WebPageProps = {
    title?: string;
    url: string;
    location?: string;
    locationUrl?: string;
    author?: string;
};

type RenderOptions = Parameters<AstroRender<WebPageProps>>[1];
type RenderOverrides = {
    title?: string | undefined;
    url?: string | undefined;
    location?: string | undefined;
    locationUrl?: string | undefined;
    author?: string | undefined;
};

const BASE_PROPS = {
    title: "Lateralus",
    url: "https://toolband.com/discography/lateralus/",
    location: "Tool",
    locationUrl: "https://toolband.com/",
    author: "Adam Jones",
} satisfies WebPageProps;

async function renderWebPage(
    overrides: RenderOverrides = {},
    options?: RenderOptions,
) {
    const merged = { ...BASE_PROPS, ...overrides };
    const props = merged.title === undefined
        ? (({ title: _title, ...rest }) => rest)(merged)
        : merged;

    return renderReference(WebPage, props, options);
}

suite.concurrent("WebPage.astro", () => {
    describe("title contract", () => {
        test("renders the title as exactly one link to the page URL", async () => {
            const { $ } = await renderWebPage();

            expectLinkedTitle($, "https://toolband.com/discography/lateralus/", "Lateralus");
        });

        test("prefers a title slot over the prop fallback without duplication", async () => {
            const { $ } = await renderWebPage(
                {
                    title: "Fallback page title",
                    url: "https://example.com/page",
                },
                {
                    slots: {
                        title: "<strong data-slot=\"title\">Rendered page title</strong>",
                    },
                },
            );

            expectLinkedTitle($, "https://example.com/page", "Rendered page title");
            expectSlotOverridesProp(
                $,
                "strong[data-slot='title']",
                "Rendered page title",
                "Fallback page title",
            );
        });
    });

    describe("location rendering", () => {
        test("renders the location as a link when locationUrl is present", async () => {
            const { $ } = await renderWebPage();

            expectInlineMetaLink($, "https://toolband.com/", "Tool");
            expect($("li").text()).toContain("Adam Jones");
        });

        test("renders plain location text when locationUrl is missing", async () => {
            const { $ } = await renderWebPage({ locationUrl: undefined });

            expectInlineMetaPlainText($, "Tool");
        });

        test("uses location slot content without auto-wrapping it", async () => {
            const { $ } = await renderWebPage(
                {},
                {
                    slots: {
                        location: "<strong data-slot=\"location\">Tool Archive</strong>",
                    },
                },
            );

            expectSlotOverridesProp($, "strong[data-slot='location']", "Tool Archive", "Tool");
        });

        test("location slot takes precedence over props", async () => {
            const { $ } = await renderWebPage(
                {
                    location: "Props Location",
                    locationUrl: "https://props.example.com",
                },
                {
                    slots: {
                        location: "<em data-slot=\"location-override\">Tool Discography</em>",
                    },
                },
            );

            expectSlotOverridesProp(
                $,
                "em[data-slot='location-override']",
                "Tool Discography",
                "Props Location",
            );
        });

        test("fails when locationUrl is provided without location", async () => {
            await expect(
                renderWebPage({
                    title: "Lateralus",
                    url: "https://example.com/page",
                    location: undefined,
                    locationUrl: "https://toolband.com/",
                }),
            ).rejects.toThrow(ReferenceContractError);
        });
    });

    describe("optional fields", () => {
        test("renders successfully when author is missing", async () => {
            const { $ } = await renderWebPage({ author: undefined });

            expectLinkedTitle($, "https://toolband.com/discography/lateralus/", "Lateralus");
            expectInlineMetaLink($, "https://toolband.com/", "Tool");
            expectMetaLabelAbsent($, "por");
        });

        test("renders successfully when location is missing", async () => {
            const { $ } = await renderWebPage({ location: undefined, locationUrl: undefined });

            expectLinkedTitle($, "https://toolband.com/discography/lateralus/", "Lateralus");
            expectMetaLabelAbsent($, "en");
        });

        test("renders the description slot when meaningful", async () => {
            const { $ } = await renderWebPage(
                {
                    title: "Reference docs",
                    url: "https://example.com/docs",
                },
                {
                    slots: {
                        description: "Useful overview for the official documentation landing page.",
                    },
                },
            );

            expectDescriptionPresence(
                $,
                "Useful overview for the official documentation landing page.",
            );
        });

        test("omits the description block when the slot is absent", async () => {
            const { $ } = await renderWebPage({
                title: "Reference docs",
                url: "https://example.com/docs",
            });

            expectDescriptionAbsent($);
        });
    });

    describe("given no meaningful title source", () => {
        test.each([
            {
                name: "throws when title prop is an empty string",
                title: "",
            },
            {
                name: "throws when title prop is whitespace-only",
                title: "   ",
            },
            {
                name: "throws when title prop is undefined and no title slot is provided",
                title: undefined,
            },
        ])("$name", async ({ title }) => {
            await expect(
                renderWebPage({ title, url: "https://example.com/page" }),
            ).rejects.toThrow(MissingReferenceTitleError);
        });
    });
});
