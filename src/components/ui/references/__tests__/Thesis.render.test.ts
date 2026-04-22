/**
 * @fileoverview Render-contract tests for {@link Thesis}.
 *
 * This suite treats `Thesis.astro` as a public rendering contract rather than a set of isolated happy-path examples. 
 * The tests verify how the component resolves required and optional metadata from props and slots, how linked metadata 
 * is exposed, and which invalid input combinations must fail fast.
 *
 * ## Contract covered
 *
 * - a meaningful title is required from either props or the `title` slot;
 * - the resolved title always renders as exactly one link to `url`;
 * - meaningful slot content overrides prop fallbacks without duplicating them;
 * - institution metadata may render as a link only when both `institution` and `institutionUrl` are meaningful;
 * - slot-backed institution content is rendered as provided and is never auto-wrapped as a link;
 * - optional metadata is omitted when absent or non-meaningful;
 * - invalid metadata combinations throw the appropriate contract error.
 *
 * ## Scope notes
 *
 * These tests focus on the observable render behavior of `Thesis.astro`. Shared DOM assertions and rendering helpers 
 * live in `reference-render-contracts.ts`.
 *
 * @see {@link MissingReferenceTitleError}
 * @see {@link ReferenceContractError}
 */
import { describe, expect, suite, test } from "vitest";
import { type AstroRender } from "../../../../test-utils/astro-render";
import { MissingReferenceTitleError, ReferenceContractError } from "../ReferenceContractError";
import Thesis from "../Thesis.astro";
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

/**
 * Props consumed by {@link Thesis} in the scenarios exercised by this suite.
 *
 * The component requires a `url` and a meaningful resolved title. Optional metadata may be provided directly as props 
 * or indirectly through slots, depending on the contract under test.
 *
 * @property title  Optional prop-backed title fallback.
 * @property url    Canonical destination used by the rendered title link.
 * @property institution    Optional thesis institution or organization.
 * @property institutionUrl Optional link target for `institution`.
 * @property author Optional author metadata.
 */
type ThesisProps = {
    title?: string;
    url: string;
    institution?: string;
    institutionUrl?: string;
    author?: string;
};

/**
 * Astro render options accepted by the shared test renderer for {@link ThesisProps}.
 *
 * In this suite, this mainly carries slot content used to exercise precedence, omission, and non-meaningful-slot cases.
 */
type RenderOptions = Parameters<AstroRender<ThesisProps>>[1];

/**
 * Partial prop overrides accepted by {@link renderThesis}.
 *
 * This differs slightly from a plain `Partial<ThesisProps>` because the helper needs to distinguish between:
 *
 * - not overriding `title`, so the default title remains in place; and
 * - explicitly setting `title` to `undefined`, so the property is removed entirely from the rendered props object.
 */
type RenderOverrides = Omit<Partial<ThesisProps>, "title"> & { title?: string | undefined };

/**
 * Stable default props used as the baseline for most test scenarios.
 *
 * Tests override only the fields relevant to the contract they are proving, which keeps each example focused and 
 * reduces fixture noise.
 */
const BASE_PROPS = {
    title: "Duel Systems in Domino City",
    url: "https://archives.example.jp/theses/duel-systems",
} satisfies ThesisProps;

/**
 * Renders {@link Thesis} with stable defaults plus scenario-specific overrides.
 *
 * This helper centralizes the suite's rendering model:
 *
 * - start from {@link BASE_PROPS};
 * - merge per-test overrides;
 * - if `title` is explicitly `undefined`, omit the property entirely rather than passing `title: undefined`;
 * - delegate actual rendering and DOM loading to {@link renderReference}.
 *
 * The explicit title omission step is important because several tests verify the component's behavior when no 
 * prop-backed title source exists at all.
 *
 * @param overrides Prop values merged over {@link BASE_PROPS}.
 * @param options Astro render options, such as slot content.
 * @returns The shared render result produced by {@link renderReference}.
 */
async function renderThesis(
    overrides: RenderOverrides = {},
    options?: RenderOptions,
) {
    const merged = { ...BASE_PROPS, ...overrides };
    const props = merged.title === undefined
        ? (({ title: _title, ...rest }) => rest)(merged)
        : merged;

    return renderReference(Thesis, props, options);
}

suite.concurrent("Thesis.astro render", () => {
    describe("title contract", () => {
        test("renders a prop-backed title as exactly one link to url", async () => {
            const { $ } = await renderThesis({
                title: "Strategic Deck Construction by Yugi Mutou",
                url: "https://archives.example.jp/theses/yugi-mutou-deck-construction",
            });

            expectLinkedTitle(
                $,
                "https://archives.example.jp/theses/yugi-mutou-deck-construction",
                "Strategic Deck Construction by Yugi Mutou",
            );
        });

        test("renders a slot-backed title as exactly one link to url", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Legacy Study of Sugoroku Mutou",
                    url: "https://archives.example.jp/theses/millennium-puzzle",
                },
                {
                    slots: {
                        title:
                            `<strong data-slot="title">Yugi Mutou and the Millennium Puzzle</strong>`,
                    },
                },
            );

            expectLinkedTitle(
                $,
                "https://archives.example.jp/theses/millennium-puzzle",
                "Yugi Mutou and the Millennium Puzzle",
            );
            expectSlotOverridesProp(
                $,
                "strong[data-slot='title']",
                "Yugi Mutou and the Millennium Puzzle",
                "Legacy Study of Sugoroku Mutou",
            );
        });
    });

    describe("institution contract", () => {
        test("renders a linked institution only when institution and institutionUrl are both meaningful", async () => {
            const { $ } = await renderThesis({
                title: "Kaiba Corp Duel Disk Engineering",
                url: "https://archives.example.jp/theses/duel-disk-engineering",
                institution: "Kaiba Corporation",
                institutionUrl: "https://kaibacorp.example.jp/",
                author: "Anzu Mazaki",
            });

            expectInlineMetaLink($, "https://kaibacorp.example.jp/", "Kaiba Corporation");
            expect($("li").text()).toContain("Anzu Mazaki");
        });

        test("renders plain institution text when institutionUrl is absent", async () => {
            const { $ } = await renderThesis({
                title: "Festival Logistics in Domino High School",
                url: "https://archives.example.jp/theses/domino-high-festival",
                institution: "Domino High School",
            });

            expectInlineMetaPlainText($, "Domino High School");
        });

        test("fails when institutionUrl is provided without institution", async () => {
            await expect(
                renderThesis({
                    title: "Pegasus J. Crawford and Holographic Duel Arenas",
                    url: "https://archives.example.jp/theses/holographic-duel-arenas",
                    institutionUrl: "https://industrialillusions.example.jp/",
                }),
            ).rejects.toThrow(ReferenceContractError);
        });

        test("respects the institution slot without wrapping it automatically or leaking prop fallbacks", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Battle City Infrastructure Report",
                    url: "https://archives.example.jp/theses/battle-city-infrastructure",
                    institution: "Kaiba Corporation",
                    institutionUrl: "https://kaibacorp.example.jp/",
                },
                {
                    slots: {
                        institution: `<em data-slot="institution">Seto Kaiba Duel Systems Lab</em>`,
                    },
                },
            );
            const slotInstitution = $("em[data-slot='institution']");

            expectSlotOverridesProp(
                $,
                "em[data-slot='institution']",
                "Seto Kaiba Duel Systems Lab",
                "Kaiba Corporation",
            );
            expect(slotInstitution.closest("a")).toHaveLength(0);
            expect($("a[href='https://kaibacorp.example.jp/']")).toHaveLength(0);
        });
    });

    describe("optional metadata omission", () => {
        test.each([
            {
                name: "omits the institution fragment when institution is absent",
                overrides: {
                    title: "Yugi Mutou and Cooperative Duel Strategy",
                    url: "https://archives.example.jp/theses/cooperative-duel-strategy",
                },
                missingLabel: "en",
            },
            {
                name: "omits the author fragment when author is absent",
                overrides: {
                    title: "Ryou Bakura and Occult Symbolism in Domino City",
                    url: "https://archives.example.jp/theses/occult-symbolism",
                    institution: "Domino High School",
                },
                missingLabel: "por",
            },
        ])("$name", async ({ overrides, missingLabel }) => {
            const { $ } = await renderThesis(overrides);

            expectMetaLabelAbsent($, missingLabel);
        });

        test("omits the description block when description slot is absent or non-meaningful", async () => {
            const withoutDescription = await renderThesis({
                title: "Mai Kujaku and Competitive Performance Psychology",
                url: "https://archives.example.jp/theses/performance-psychology",
            });
            const emptyDescription = await renderThesis(
                {
                    title: "Mai Kujaku and Competitive Performance Psychology",
                    url: "https://archives.example.jp/theses/performance-psychology",
                },
                {
                    slots: {
                        description: "<!-- empty -->",
                    },
                },
            );

            expectDescriptionAbsent(withoutDescription.$);
            expectDescriptionAbsent(emptyDescription.$);
        });

        test("renders author and description when meaningful", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Tournament Dynamics in Battle City",
                    url: "https://archives.example.jp/theses/battle-city-dynamics",
                    institution: "Kaiba Corporation",
                    author: "Katsuya Jonouchi",
                },
                {
                    slots: {
                        description:
                            `<span data-slot="description">A field study centred on Seto Kaiba's city-wide tournament design.</span>`,
                    },
                },
            );

            expect($("li").text()).toContain("Kaiba Corporation");
            expect($("li").text()).toContain("Katsuya Jonouchi");
            expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "por"))
                .toHaveLength(1);
            expectDescriptionPresence(
                $,
                "A field study centred on Seto Kaiba's city-wide tournament design.",
            );
        });
    });

    describe("slot precedence and non-duplication", () => {
        test.each([
            {
                name:
                    "prefers the title slot over the prop fallback without duplicating the fallback text",
                overrides: {
                    title: "Katsuya Jonouchi and Duelist Resilience",
                    url: "https://archives.example.jp/theses/duelist-resilience",
                },
                slots: {
                    title: "<strong data-slot=\"title\">Katsuya Jonouchi in Battle City</strong>",
                },
                slotSelector: "strong[data-slot='title']",
                slotText: "Katsuya Jonouchi in Battle City",
                fallbackText: "Katsuya Jonouchi and Duelist Resilience",
                expectedHref: "https://archives.example.jp/theses/duelist-resilience",
            },
            {
                name:
                    "prefers the author slot over the prop fallback without duplicating the fallback text",
                overrides: {
                    title: "Domino City Friendship Networks",
                    url: "https://archives.example.jp/theses/friendship-networks",
                    author: "Hiroto Honda",
                },
                slots: {
                    author: "<em data-slot=\"author\">Ryou Bakura</em>",
                },
                slotSelector: "em[data-slot='author']",
                slotText: "Ryou Bakura",
                fallbackText: "Hiroto Honda",
            },
        ])("$name", async ({
            overrides,
            slots,
            slotSelector,
            slotText,
            fallbackText,
            expectedHref,
        }) => {
            const { $ } = await renderThesis(overrides, { slots });

            if (expectedHref !== undefined) {
                expectLinkedTitle($, expectedHref, slotText);
            }

            expectSlotOverridesProp($, slotSelector, slotText, fallbackText);
        });

        test(
            "allows combined slot overrides without leaking fallback metadata or breaking the single title link contract",
            async () => {
                const { $ } = await renderThesis(
                    {
                        title: "Foundations of Duel Monsters Tournament Design",
                        url: "https://archives.example.jp/theses/tournament-design",
                        institution: "Kaiba Corporation",
                        institutionUrl: "https://kaibacorp.example.jp/",
                        author: "Anzu Mazaki",
                    },
                    {
                        slots: {
                            title: `<strong data-slot="title">Seto Kaiba and Battle City</strong>`,
                            institution:
                                `<em data-slot="institution">Industrial Illusions Research Archive</em>`,
                            author: `<span data-slot="author">Pegasus J. Crawford</span>`,
                        },
                    },
                );

                expectLinkedTitle(
                    $,
                    "https://archives.example.jp/theses/tournament-design",
                    "Seto Kaiba and Battle City",
                );
                expectSlotOverridesProp(
                    $,
                    "strong[data-slot='title']",
                    "Seto Kaiba and Battle City",
                    "Foundations of Duel Monsters Tournament Design",
                );
                expectSlotOverridesProp(
                    $,
                    "em[data-slot='institution']",
                    "Industrial Illusions Research Archive",
                    "Kaiba Corporation",
                );
                expectSlotOverridesProp(
                    $,
                    "span[data-slot='author']",
                    "Pegasus J. Crawford",
                    "Anzu Mazaki",
                );
                expect($("a[href='https://kaibacorp.example.jp/']")).toHaveLength(0);
            },
        );
    });

    describe("failure modes", () => {
        test.each([
            {
                name: "throws MissingReferenceTitleError when no meaningful title source exists",
                overrides: {
                    title: undefined,
                    url: "https://archives.example.jp/theses/untitled-yugi-study",
                },
            },
            {
                name: "throws MissingReferenceTitleError for a whitespace-only prop title",
                overrides: {
                    title: "   ",
                    url: "https://archives.example.jp/theses/blank-title",
                },
            },
            {
                name:
                    "throws MissingReferenceTitleError when the title slot is non-meaningful and no usable prop fallback exists",
                overrides: {
                    title: undefined,
                    url: "https://archives.example.jp/theses/empty-slot-study",
                },
                slots: {
                    title: "<!-- empty -->",
                },
            },
            {
                name:
                    "throws MissingReferenceTitleError when both prop and slot title sources are non-meaningful",
                overrides: {
                    title: "   ",
                    url: "https://archives.example.jp/theses/meaningless-title-sources",
                },
                slots: {
                    title: "   ",
                },
            },
        ])("$name", async ({ overrides, slots }) => {
            await expect(
                renderThesis(overrides, slots === undefined ? undefined : { slots }),
            ).rejects.toThrow(MissingReferenceTitleError);
        });
    });
});
