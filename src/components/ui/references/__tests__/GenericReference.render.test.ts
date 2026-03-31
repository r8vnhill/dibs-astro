import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import GenericReference from "../GenericReference.astro";
import { MissingReferenceTitleError } from "../ReferenceContractError";

type GenericReferenceProps = {
    title?: string;
    url?: string;
    location?: string;
    author?: string;
    typeLabel?: string;
};

let renderReference: AstroRender<GenericReferenceProps>;

describe.concurrent("GenericReference.astro render", () => {
    beforeEach(async () => {
        renderReference = await createAstroRenderer<GenericReferenceProps>(GenericReference);
    });

    describe("DDT: title source and url mode", () => {
        test.each([
            {
                name: "renders prop title as a link when url is present",
                props: { title: "Reference title", url: "https://example.com/reference" },
                slots: undefined,
                expected: "Reference title",
                linked: true,
            },
            {
                name: "renders slot title as a link when url is present",
                props: { title: "Fallback title", url: "https://example.com/reference" },
                slots: { title: "Slot title" },
                expected: "Slot title",
                linked: true,
            },
            {
                name: "renders prop title as plain text when url is absent",
                props: { title: "Reference title" },
                slots: undefined,
                expected: "Reference title",
                linked: false,
            },
            {
                name: "renders slot title as plain text when url is absent",
                props: { title: "Fallback title" },
                slots: { title: "Slot title" },
                expected: "Slot title",
                linked: false,
            },
        ])("$name", async ({ props, slots, expected, linked }) => {
            const html = await renderReference(props, slots ? { slots } : undefined);

            expect(html).toContain(expected);

            if (linked) {
                expect(html).toContain(`href="${props.url}"`);
            } else {
                expect(html).not.toContain("<a");
            }
        });
    });

    describe("DDT: metadata rendering", () => {
        test.each([
            {
                name: "omits metadata when neither location nor author exists",
                props: { title: "Reference title" },
                slots: undefined,
                expectIn: false,
                expectBy: false,
            },
            {
                name: "renders location only",
                props: { title: "Reference title", location: "Docs site" },
                slots: undefined,
                expectIn: true,
                expectBy: false,
            },
            {
                name: "renders author only",
                props: { title: "Reference title", author: "Quien escribe" },
                slots: undefined,
                expectIn: false,
                expectBy: true,
            },
            {
                name: "renders both location and author",
                props: {
                    title: "Reference title",
                    location: "Docs site",
                    author: "Quien escribe",
                },
                slots: undefined,
                expectIn: true,
                expectBy: true,
            },
        ])("$name", async ({ props, slots, expectIn, expectBy }) => {
            const html = await renderReference(props, slots ? { slots } : undefined);

            expect(html.includes(">en<")).toBe(expectIn);
            expect(html.includes(">por<")).toBe(expectBy);
        });
    });

    test("prefers meaningful slot content over prop metadata", async () => {
        const html = await renderReference(
            {
                title: "Fallback title",
                location: "Fallback location",
                author: "Fallback author",
            },
            {
                slots: {
                    title: "Slot title",
                    location: "Slot location",
                    author: "Slot author",
                },
            },
        );

        expect(html).toContain("Slot title");
        expect(html).toContain("Slot location");
        expect(html).toContain("Slot author");
        expect(html).not.toContain("Fallback title");
        expect(html).not.toContain("Fallback location");
        expect(html).not.toContain("Fallback author");
    });

    test("falls back to props when slots are empty or comments only", async () => {
        const html = await renderReference(
            {
                title: "Fallback title",
                location: "Fallback location",
                author: "Fallback author",
            },
            {
                slots: {
                    title: "<!-- empty -->",
                    location: "   ",
                    author: "<!-- also empty -->",
                },
            },
        );

        expect(html).toContain("Fallback title");
        expect(html).toContain("Fallback location");
        expect(html).toContain("Fallback author");
    });

    test("renders description only when a meaningful slot exists", async () => {
        const withDescription = await renderReference(
            {
                title: "Reference title",
            },
            {
                slots: {
                    description: "Useful description",
                },
            },
        );
        const withoutDescription = await renderReference(
            {
                title: "Reference title",
            },
            {
                slots: {
                    description: "<!-- empty -->",
                },
            },
        );

        expect(withDescription).toContain("Useful description");
        expect(withoutDescription).not.toContain("Useful description");
    });

    test("renders the configured type label", async () => {
        const html = await renderReference({
            title: "Reference title",
            typeLabel: "Documento",
        });

        expect(html).toContain("Documento:");
    });

    test("fails fast when title is missing from both props and slots", async () => {
        await expect(
            renderReference(
                {},
                {
                    slots: {
                        title: "<!-- empty -->",
                    },
                },
            ),
        ).rejects.toThrow(MissingReferenceTitleError);
    });
});
