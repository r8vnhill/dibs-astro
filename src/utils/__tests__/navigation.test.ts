/**
 * @file navigation.test.ts
 *
 * Unit tests for the navigation normalization helpers in `src/utils/navigation.ts`.
 *
 * This suite protects the data-shaping contract that `NotesLayout` consumes before any rendering
 * happens. In particular, it locks in the small but important change that `previous` can now be a
 * single link or a list of links while `next` remains singular.
 *
 * ## What belongs here
 *
 * - Pure normalization behavior
 * - URL canonicalization (leading/trailing slash handling)
 * - Shape conversion (`previous` -> normalized list)
 *
 * ## What does not belong here
 *
 * Render concerns such as button count, DOM order, or auto-navigation precedence. Those are
 * covered by `src/layouts/__tests__/NotesLayout.render.test.ts`.
 */
import { describe, expect, test } from "vitest";
import {
    normalizeNavigation,
    normalizePreviousNavigation,
    type NavigationLinkInput,
} from "../navigation";

const firstPrevious: NavigationLinkInput = {
    title: "PowerShell",
    href: "/notes/software-libraries/scripting/structured-output",
};

const secondPrevious: NavigationLinkInput = {
    title: "Nushell",
    href: "notes/software-libraries/scripting/structured-output/nushell",
};

describe("navigation utils", () => {
    describe("normalizePreviousNavigation", () => {
        /**
         * Historical callers still pass a single object, so the helper must preserve that input as
         * a one-item list instead of forcing every caller to branch on shape.
         */
        test("keeps a single previous link as a one-item list", () => {
            expect(normalizePreviousNavigation(firstPrevious)).toEqual([
                {
                    title: "PowerShell",
                    href: "/notes/software-libraries/scripting/structured-output/",
                },
            ]);
        });

        test("normalizes every previous link when previous is an array", () => {
            expect(normalizePreviousNavigation([firstPrevious, secondPrevious])).toEqual([
                {
                    title: "PowerShell",
                    href: "/notes/software-libraries/scripting/structured-output/",
                },
                {
                    title: "Nushell",
                    href: "/notes/software-libraries/scripting/structured-output/nushell/",
                },
            ]);
        });

        test("returns an empty list when previous is undefined", () => {
            expect(normalizePreviousNavigation(undefined)).toEqual([]);
        });
    });

    describe("normalizeNavigation", () => {
        /**
         * `next` intentionally keeps the old single-link contract, so this assertion guards that
         * the multi-previous refactor did not widen or change unrelated behavior.
         */
        test("keeps next behavior unchanged", () => {
            expect(
                normalizeNavigation(
                    { title: "Pipelines", href: "notes/software-libraries/scripting/pipelines" },
                    firstPrevious,
                ),
            ).toEqual({
                normalizedNext: {
                    title: "Pipelines",
                    href: "/notes/software-libraries/scripting/pipelines/",
                },
                normalizedPrevious: {
                    title: "PowerShell",
                    href: "/notes/software-libraries/scripting/structured-output/",
                },
            });
        });
    });
});
