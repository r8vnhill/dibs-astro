import { describe, expect, suite, test } from "vitest";
import { estimateMinutesFromWordCount } from "../estimate-minutes-from-word-count";

suite("given a word count", () => {
    describe("when minutes are estimated at the default reading speed", () => {
        test.each([
            [0, 0],
            [1, 1],
            [249, 1],
            [250, 1],
            [251, 2],
            [500, 2],
            [501, 3],
        ])("then %i words estimate %i minute(s)", (words, minutes) => {
            expect(estimateMinutesFromWordCount(words)).toBe(minutes);
        });
    });

    describe("when a custom reading speed is supplied", () => {
        test("then it estimates minutes against that speed instead of the default", () => {
            expect(estimateMinutesFromWordCount(101, 100)).toBe(2);
        });
    });
});
