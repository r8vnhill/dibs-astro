import { describe, expect, suite, test } from "vitest";
import { shouldRevealActiveEntry } from "../lesson-toc-active-section";

suite("given the previous and current active TOC section ids", () => {
    describe("when deciding whether to auto-reveal the active entry", () => {
        test.each([
            ["no previous section and none becomes active", null, null, false],
            ["no previous section and one becomes active", null, "a", true],
            ["the active section is unchanged", "a", "a", false],
            ["the active section changes to another one", "a", "b", true],
            ["the active section is cleared", "a", null, false],
        ] satisfies ReadonlyArray<[string, string | null, string | null, boolean]>)(
            "then when %s, reveal is %s",
            (_label, previousActiveId, activeId, expected) => {
                expect(shouldRevealActiveEntry(previousActiveId, activeId)).toBe(expected);
            },
        );
    });

    describe("when the active section changes across a scrolling sequence", () => {
        test("then reveal only fires on transitions, independent of intervening manual scroll", () => {
            let previousActiveId: string | null = null;
            const reveals: boolean[] = [];
            const observe = (activeId: string | null) => {
                reveals.push(shouldRevealActiveEntry(previousActiveId, activeId));
                previousActiveId = activeId;
            };

            observe("a"); // article enters A -> reveal may occur
            observe("a"); // reader scrolls the article further within A -> no re-reveal
            observe("a"); // (a manual TOC scroll here has no bearing on this decision)
            observe("b"); // article enters B -> reveal may occur
            observe("b"); // still within B -> no re-reveal
            observe("a"); // article returns to A -> reveal may occur again

            expect(reveals).toEqual([true, false, false, true, false, true]);
        });
    });
});
