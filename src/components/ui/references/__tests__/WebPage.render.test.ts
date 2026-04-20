import { describe, expect, suite, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import WebPage from "../WebPage.astro";

// ## Utility types ##

/**
 * Minimal prop contract accepted by {@link WebPage} in this test suite.
 *
 * The component always needs a `url`, while the remaining fields are optional metadata that may
 * be supplied either through props or, in some cases, through slots. The tests deliberately model
 * that looser boundary because part of the component contract is deciding which metadata is
 * required, which metadata is optional, and which source takes precedence when more than one is
 * available.
 */
type WebPageProps = {
    /**
     * Human-readable title for the referenced page.
     *
     * This value is optional at the type level because the component accepts multiple title
     * sources, but the rendered entry is still expected to fail when no meaningful title can be
     * resolved.
     */
    title?: string;

    /**
     * Canonical or navigable URL for the referenced page.
     */
    url: string;

    /**
     * Human-readable source, site, or publication name.
     */
    location?: string;

    /**
     * Optional URL associated with {@link WebPageProps.location}.
     *
     * When present, the location is expected to render as a link unless slot content overrides that
     * portion of the template.
     */
    locationUrl?: string;

    /**
     * Optional author or owning organization displayed alongside the reference metadata.
     */
    author?: string;
};

/**
 * Partial override shape used by the test helpers.
 *
 * Unlike a plain `Partial<WebPageProps>`, this alias intentionally preserves explicit `undefined`
 * values. That matters because several tests exercise absence semantics directly and must be able
 * to say "this field is intentionally missing" rather than silently falling back to a default.
 */
type WebPagePropOverrides = Partial<
    {
        [K in keyof WebPageProps]: WebPageProps[K] | undefined;
    }
>;

// ## Literal defaults ##

const DEFAULTS: WebPageProps = {
    title: "Lateralus",
    url: "https://toolband.com/discography/lateralus/",
    location: "Tool",
    locationUrl: "https://toolband.com/",
    author: "Adam Jones",
} as const;
const EXAMPLE_PAGE_URL = "https://example.com/page";
const LOCATION_LINK_HREF = `href="${DEFAULTS.locationUrl!}"`;
const MISSING_TITLE_ERROR = /title/i;
const LOCATION_SLOT_HTML = "<strong data-slot=\"location\">Tool Archive</strong>";
const LOCATION_SLOT_TEXT = "Tool Archive";
const LOCATION_OVERRIDE_SLOT_HTML = "<em data-slot=\"location-override\">Tool Discography</em>";
const LOCATION_OVERRIDE_SLOT_TEXT = "Tool Discography";
const LOCATION_OVERRIDE_SLOT_MARKER = "data-slot=\"location-override\"";

// ## Test helpers ##

/**
 * Builds {@link WebPageProps} from a stable baseline fixture.
 *
 * The defaults describe a representative documentation entry and keep the individual tests focused
 * on the one piece of metadata they are trying to vary. Explicit `undefined` overrides are
 * preserved on purpose so validation and fallback paths remain observable.
 *
 * @param overrides
 *   Field-level replacements for the baseline fixture.
 * @returns
 *   A complete prop object ready to be passed to the renderer helper.
 */
function makeProps(
    overrides: WebPagePropOverrides = {},
): WebPageProps {
    return { ...DEFAULTS, ...overrides } as WebPageProps;
}

/**
 * Renders {@link WebPage} with isolated state for a single assertion.
 *
 * A fresh renderer per invocation keeps slot resolution, prop merging, and validation local to the
 * current test case. That isolation is useful here because the suite checks multiple precedence and
 * optionality branches that should not leak state into one another.
 *
 * @param props
 *   Prop overrides applied on top of the shared baseline fixture.
 * @param options
 *   Optional Astro renderer configuration, such as named slots.
 * @returns
 *   The rendered HTML fragment produced by {@link WebPage}.
 */
async function renderWebPage(
    props: WebPagePropOverrides = {},
    options?: Parameters<AstroRender<WebPageProps>>[1],
): Promise<string> {
    const render = await createAstroRenderer<WebPageProps>(WebPage);
    return render(makeProps(props), options);
}

// ## Test suite ##

/**
 * Contract coverage for `WebPage.astro`.
 *
 * This suite exercises the component as a rendered reference entry rather than as an implementation
 * detail. The most important behaviors under test are:
 *
 * - prop-backed metadata renders when present;
 * - slot content can override specific metadata regions without extra wrapping;
 * - invalid or empty title sources are rejected;
 * - optional metadata can disappear without breaking the rendered output.
 */
suite("WebPage.astro", () => {
    /**
     * Location rendering rules when the component receives location metadata through props.
     *
     * These cases verify the fallback behavior used when no location slot is provided.
     */
    describe("given a location URL", () => {
        test("renders the location as a link", async () => {
            const html = await renderWebPage();

            expect(html).toContain(DEFAULTS.location!);
            expect(html).toContain(LOCATION_LINK_HREF);
            expect(html).toContain(DEFAULTS.location!);
            expect(html).toContain(DEFAULTS.author!);
        });

        test("renders plain location text when locationUrl is missing", async () => {
            const html = await renderWebPage({ locationUrl: undefined });

            expect(html).toContain(DEFAULTS.location!);
            expect(html).not.toContain(LOCATION_LINK_HREF);
        });
    });

    /**
     * Precedence rules for the named `location` slot.
     *
     * Slot content should replace the prop-driven location presentation entirely, preserving the
     * caller's markup instead of wrapping or duplicating it.
     */
    describe("given a location slot", () => {
        test("uses the slot content without auto-wrapping it", async () => {
            const html = await renderWebPage(
                {},
                {
                    slots: {
                        location: LOCATION_SLOT_HTML,
                    },
                },
            );

            expect(html).toContain("data-slot=\"location\"");
            expect(html).toContain(LOCATION_SLOT_TEXT);
        });

        test("location slot takes precedence over props", async () => {
            const html = await renderWebPage(
                {
                    location: "Props Location",
                    locationUrl: "https://props.example.com",
                },
                {
                    slots: {
                        location: LOCATION_OVERRIDE_SLOT_HTML,
                    },
                },
            );

            expect(html).toContain(LOCATION_OVERRIDE_SLOT_MARKER);
            expect(html).toContain(LOCATION_OVERRIDE_SLOT_TEXT);
            expect(html).not.toContain("Props Location");
        });
    });

    /**
     * Validation rules for title resolution.
     *
     * A reference entry without a meaningful title is considered invalid, even though `title` is
     * optional at the raw prop boundary.
     */
    describe("given no meaningful title source", () => {
        test.each(["", "   "])("throws when title is %s", async (title) => {
            await expect(
                renderWebPage({ title, url: EXAMPLE_PAGE_URL }),
            ).rejects.toThrow(MISSING_TITLE_ERROR);
        });

        test("throws when title is undefined and no title slot provided", async () => {
            await expect(
                renderWebPage({ title: undefined, url: EXAMPLE_PAGE_URL }),
            ).rejects.toThrow(MISSING_TITLE_ERROR);
        });
    });

    /**
     * Resilience checks for optional metadata.
     *
     * These tests do not attempt to validate the exact markup shape of every missing-field case.
     * Instead, they verify the higher-level contract that optional metadata may be absent without
     * preventing the component from rendering a valid entry.
     */
    describe("optional fields", () => {
        test("renders successfully when author is missing", async () => {
            const html = await renderWebPage({ author: undefined });

            expect(html).toContain(DEFAULTS.title!);
            expect(html).toContain(DEFAULTS.location!);
            expect(html).toBeTruthy();
        });

        test("renders successfully when location is missing", async () => {
            const html = await renderWebPage({ location: undefined, locationUrl: undefined });

            expect(html).toContain(DEFAULTS.title!);
            expect(html).toBeTruthy();
        });
    });
});
