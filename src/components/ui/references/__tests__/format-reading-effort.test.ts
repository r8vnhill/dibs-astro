import { describe, expect, suite, test } from "vitest";
import type { ResolvedReadingEffort } from "~/lib/readings/reading-effort";
import { formatReadingEffort } from "../format-reading-effort";

suite("given a resolved reading effort", () => {
    describe("when formatted for the Spanish UI", () => {
        test.each<{ name: string; effort: ResolvedReadingEffort; expected: string }>([
            { name: "duration below one hour", effort: { kind: "duration", minutes: 5 }, expected: "~ 5m" },
            { name: "duration just under one hour", effort: { kind: "duration", minutes: 59 }, expected: "~ 59m" },
            { name: "duration at exactly one hour", effort: { kind: "duration", minutes: 60 }, expected: "~ 1h" },
            { name: "duration one hour and one minute", effort: { kind: "duration", minutes: 61 }, expected: "~ 1h1m" },
            {
                name: "duration one hour fifteen minutes",
                effort: { kind: "duration", minutes: 75 },
                expected: "~ 1h15m",
            },
            { name: "duration at multiple exact hours", effort: { kind: "duration", minutes: 120 }, expected: "~ 2h" },
            { name: "a single page", effort: { kind: "pages", pages: 1 }, expected: "1 página" },
            { name: "multiple pages", effort: { kind: "pages", pages: 12 }, expected: "12 páginas" },
            {
                name: "an estimated reading time",
                effort: { kind: "estimated-reading-time", minutes: 8 },
                expected: "≈ 8 min",
            },
            { name: "unavailable evidence", effort: { kind: "unavailable" }, expected: "No disponible" },
        ])("then $name renders $expected", ({ effort, expected }) => {
            expect(formatReadingEffort(effort)).toBe(expected);
        });
    });
});
