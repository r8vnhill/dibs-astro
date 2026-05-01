import { describe, expect, test } from "vitest";
import {
    normalizeNavigation,
    normalizePreviousNavigation,
    type NavigationLinkInput,
} from "../navigation-normalization";

const firstPrevious: NavigationLinkInput = {
    title: "PowerShell",
    href: "/notes/scripting/structured-output",
};

const secondPrevious: NavigationLinkInput = {
    title: "Nushell",
    href: "notes/scripting/structured-output/nushell",
};

describe("navigation normalization", () => {
    describe("normalizePreviousNavigation", () => {
        test("keeps a single previous link as a one-item list", () => {
            expect(normalizePreviousNavigation(firstPrevious)).toEqual([
                {
                    title: "PowerShell",
                    href: "/notes/scripting/structured-output/",
                },
            ]);
        });

        test("normalizes every previous link when previous is an array", () => {
            expect(normalizePreviousNavigation([firstPrevious, secondPrevious])).toEqual([
                {
                    title: "PowerShell",
                    href: "/notes/scripting/structured-output/",
                },
                {
                    title: "Nushell",
                    href: "/notes/scripting/structured-output/nushell/",
                },
            ]);
        });

        test("returns an empty list when previous is undefined", () => {
            expect(normalizePreviousNavigation(undefined)).toEqual([]);
        });
    });

    describe("normalizeNavigation", () => {
        test("keeps next behavior unchanged", () => {
            expect(
                normalizeNavigation(
                    { title: "Pipelines", href: "notes/scripting/pipelines" },
                    firstPrevious,
                ),
            ).toEqual({
                normalizedNext: {
                    title: "Pipelines",
                    href: "/notes/scripting/pipelines/",
                },
                normalizedPrevious: {
                    title: "PowerShell",
                    href: "/notes/scripting/structured-output/",
                },
            });
        });
    });
});
