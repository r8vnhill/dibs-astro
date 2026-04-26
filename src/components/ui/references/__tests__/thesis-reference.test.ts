import { describe, expect, test } from "vitest";
import { MissingReferenceTitleError, ReferenceContractError } from "../ReferenceContractError";
import { resolveThesisReference, type ThesisReferenceProps, type ThesisReferenceSlots } from "../thesis-reference";

const emptySlot = { kind: "empty", html: "" } as const;
const meaningfulSlot = (html: string) => ({ kind: "meaningful", html }) as const;

const BASE_PROPS = {
    title: "Duel Systems in Domino City",
    url: "https://archives.example.jp/theses/duel-systems",
} satisfies ThesisReferenceProps;

const BASE_SLOTS = {
    title: emptySlot,
    institution: emptySlot,
    author: emptySlot,
    description: emptySlot,
} satisfies ThesisReferenceSlots;

function resolveThesis(
    props: Partial<ThesisReferenceProps> = {},
    slots: Partial<ThesisReferenceSlots> = {},
) {
    return resolveThesisReference(
        { ...BASE_PROPS, ...props },
        { ...BASE_SLOTS, ...slots },
    );
}

describe("resolveThesisReference", () => {
    test("resolves title from a meaningful slot before the title prop", () => {
        const reference = resolveThesis(
            { title: "Prop-backed title" },
            { title: meaningfulSlot("<strong>Slot-backed title</strong>") },
        );

        expect(reference.title).toEqual({
            kind: "slot",
            html: "<strong>Slot-backed title</strong>",
        });
    });

    test("falls back to the title prop when the title slot is not meaningful", () => {
        const reference = resolveThesis(
            { title: "Prop-backed title" },
            { title: emptySlot },
        );

        expect(reference.title).toEqual({ kind: "text", text: "Prop-backed title" });
    });

    test("uses institutionUrl only for prop-backed institution text", () => {
        const reference = resolveThesis({
            institution: "Kaiba Corporation",
            institutionUrl: "https://kaibacorp.example.jp/",
        });

        expect(reference.institution).toEqual({
            kind: "link",
            text: "Kaiba Corporation",
            href: "https://kaibacorp.example.jp/",
        });
    });

    test("keeps slot-backed institution content unwrapped", () => {
        const reference = resolveThesis(
            { institutionUrl: "https://kaibacorp.example.jp/" },
            { institution: meaningfulSlot("<a href=\"https://kaibacorp.example.jp/\">KC Lab</a>") },
        );

        expect(reference.institution).toEqual({
            kind: "slot",
            html: "<a href=\"https://kaibacorp.example.jp/\">KC Lab</a>",
        });
    });

    test("rejects institutionUrl when no meaningful institution label exists", () => {
        expect(() =>
            resolveThesis({
                institutionUrl: "https://industrialillusions.example.jp/",
            })
        ).toThrow(ReferenceContractError);
    });

    test("rejects institutionUrl when the institution prop is blank and the slot is not meaningful", () => {
        expect(() =>
            resolveThesis({
                institution: "   ",
                institutionUrl: "https://industrialillusions.example.jp/",
            })
        ).toThrow(ReferenceContractError);
    });

    test.each(["", "   "])("rejects blank URL value %j", (url) => {
        expect(() => resolveThesis({ url })).toThrow(ReferenceContractError);
    });

    test("normalizes the required URL", () => {
        const reference = resolveThesis({ url: " https://archives.example.jp/theses/yugi " });

        expect(reference.url).toBe("https://archives.example.jp/theses/yugi");
    });

    test("rejects missing title sources", () => {
        expect(() => resolveThesis({ title: "   " }, { title: emptySlot })).toThrow(
            MissingReferenceTitleError,
        );
    });

    test("preserves the description slot as optional block content", () => {
        const description = meaningfulSlot("<span>A thesis description.</span>");
        const reference = resolveThesis({}, { description });

        expect(reference.description).toBe(description);
    });
});
