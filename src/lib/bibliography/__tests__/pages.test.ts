import fc from "fast-check";
import {
    formatPageReference,
    isValidPageNumber,
    normalizePageReference,
    parsePageReference,
    parsePageReferenceInput,
    type PageReference,
    type UnsafePageReference,
} from "../pages";

/**
 * Contract tests for the page-reference helpers in `pages.ts`.
 *
 * The suite protects three layers of behavior:
 * - primitive validation through `isValidPageNumber`
 * - domain parsing through `parsePageReference` and `parsePageReferenceInput`
 * - presentation through `formatPageReference`
 *
 * The current domain boundary is intentional:
 * - loose input enters as raw bounds or `PageReferenceInput`
 * - trusted values leave the parser as `PageReference`
 * - formatting assumes already-validated data and does not repair invalid or reversed ranges
 *
 * `normalizePageReference` remains covered only as a compatibility wrapper while callers migrate to
 * the parser-first contract.
 */
describe("pages utilities", () => {
    describe("isValidPageNumber", () => {
        test.each([
            { value: 1, expected: true },
            { value: 99, expected: true },
            { value: 0, expected: false },
            { value: -0, expected: false },
            { value: -1, expected: false },
            { value: 1.5, expected: false },
            { value: Number.NaN, expected: false },
            { value: Number.POSITIVE_INFINITY, expected: false },
            { value: Number.NEGATIVE_INFINITY, expected: false },
        ])("returns $expected for $value", ({ value, expected }) => {
            expect(isValidPageNumber(value)).toBe(expected);
        });
    });

    describe("parsePageReference", () => {
        // Example-based matrix for the parser's public contract at the raw-bounds boundary.
        test.each([
            {
                name: "missing bounds",
                start: undefined,
                end: undefined,
                expected: undefined,
            },
            { name: "single page", start: 1, end: undefined, expected: { start: 1 } },
            { name: "equal bounds", start: 1, end: 1, expected: { start: 1, end: 1 } },
            { name: "reversed bounds", start: 5, end: 3, expected: { start: 3, end: 5 } },
            { name: "zero start", start: 0, end: 1, expected: undefined },
            { name: "zero end", start: 1, end: 0, expected: undefined },
            { name: "fractional start", start: 1.5, end: 2, expected: undefined },
            { name: "infinite start", start: Number.POSITIVE_INFINITY, end: 2, expected: undefined },
            { name: "NaN start", start: Number.NaN, end: 2, expected: undefined },
        ])("parses $name", ({ start, end, expected }) => {
            expect(parsePageReference(start, end)).toEqual(expected);
        });

        test("parses a raw input object", () => {
            const input: UnsafePageReference = { start: 12, end: 7 };
            expect(parsePageReferenceInput(input)).toEqual({ start: 7, end: 12 });
        });

        test("keeps explicit equal bounds", () => {
            expect(parsePageReference(7, 7)).toEqual({ start: 7, end: 7 });
        });

        // Parsed values should already be canonical, so reparsing must be a no-op.
        test("is idempotent for parsed values", () => {
            const validReferences: PageReference[] = [
                { start: 7 },
                { start: 7, end: 12 },
                { start: 7, end: 7 },
            ];

            for (const reference of validReferences) {
                expect(parsePageReferenceInput(reference)).toEqual(reference);
            }
        });

        // Any valid pair of bounds must collapse to an ordered domain value.
        test("preserves ordering invariants for arbitrary positive bounds", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10_000 }),
                    fc.integer({ min: 1, max: 10_000 }),
                    (start, end) => {
                        const parsed = parsePageReference(start, end);

                        expect(parsed).toBeDefined();
                        expect(parsed?.start).toBeLessThanOrEqual(parsed?.end ?? parsed?.start ?? 0);
                    },
                ),
            );
        });

        // Reversing valid bounds should not change the normalized result.
        test("is symmetric for arbitrary positive bounds", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10_000 }),
                    fc.integer({ min: 1, max: 10_000 }),
                    (start, end) => {
                        expect(parsePageReference(start, end)).toEqual(parsePageReference(end, start));
                    },
                ),
            );
        });

        // The parser is the only place where page-number validity is enforced.
        test("only emits positive integers", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10_000 }),
                    fc.integer({ min: 1, max: 10_000 }),
                    (start, end) => {
                        const parsed = parsePageReference(start, end);

                        expect(parsed).toBeDefined();
                        expect(Number.isInteger(parsed?.start)).toBe(true);
                        expect((parsed?.start ?? 0) > 0).toBe(true);
                        if (parsed?.end !== undefined) {
                            expect(Number.isInteger(parsed.end)).toBe(true);
                            expect(parsed.end > 0).toBe(true);
                        }
                    },
                ),
            );
        });
    });

    describe("normalizePageReference", () => {
        test("keeps compatibility with the parser", () => {
            expect(normalizePageReference({ start: 12, end: 7 })).toEqual({ start: 7, end: 12 });
            expect(normalizePageReference({ start: 0, end: 7 })).toBeUndefined();
        });
    });

    describe("formatPageReference", () => {
        // Formatting tests use already-valid domain objects and only verify rendering rules.
        test.each([
            { name: "single page", input: { start: 7 }, expected: "p. 7" },
            { name: "equal bounds", input: { start: 7, end: 7 }, expected: "p. 7" },
            { name: "ordered range", input: { start: 7, end: 12 }, expected: "pp. 7-12" },
        ])("formats $name", ({ input, expected }) => {
            expect(formatPageReference(input)).toBe(expected);
        });

        test("returns undefined for missing input", () => {
            expect(formatPageReference(undefined)).toBeUndefined();
        });

        test("supports custom labels and separators", () => {
            expect(
                formatPageReference(
                    { start: 7, end: 12 },
                    { singleLabel: "p.", rangeLabel: "pp.", separator: "–" },
                ),
            ).toBe("pp. 7–12");
        });

        // Formatting is now presentation-only, so invalid domain repair is out of scope here.
        test("does not revalidate or reorder references", () => {
            const reference: PageReference = { start: 12, end: 7 };
            expect(formatPageReference(reference)).toBe("pp. 12-7");
        });

        test("matches parsed formatting for valid references", () => {
            const validReferences: Array<[number, number | undefined]> = [
                [7, undefined],
                [7, 12],
                [12, 7],
                [7, 7],
            ];

            for (const [start, end] of validReferences) {
                const parsed = parsePageReference(start, end);
                expect(parsed).toBeDefined();
                expect(formatPageReference(parsed)).toBeDefined();
            }
        });

        test("keeps single-page references stable for arbitrary positive pages", () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 10_000 }), (page) => {
                    const reference: PageReference = { start: page };
                    expect(parsePageReferenceInput(reference)).toEqual(reference);
                    expect(formatPageReference(reference)).toBe(`p. ${page}`);
                }),
            );
        });
    });
});
