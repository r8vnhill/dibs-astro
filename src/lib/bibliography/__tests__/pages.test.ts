import fc from "fast-check";
import {
    formatPageReference,
    isValidPageNumber,
    normalizePageReference,
    type PageReference,
    pageReferenceFromBounds,
} from "../pages";

/**
 * Contract tests for the bibliography page-reference helpers in `pages.ts`.
 *
 * The suite documents and protects the public behavior of four small utilities:
 *
 * - `isValidPageNumber`, which accepts only positive finite integers;
 * - `pageReferenceFromBounds`, which builds a reference shape from raw bounds;
 * - `normalizePageReference`, which validates and canonicalizes page references;
 * - `formatPageReference`, which renders references using bibliography-friendly labels.
 *
 * The tests deliberately combine three complementary styles:
 *
 * - example-based tests for canonical and user-visible cases;
 * - data-driven tests with `test.each` for compact edge-case coverage;
 * - property-based tests with `fast-check` for invariants that should hold across many inputs.
 *
 * A small but intentional asymmetry is part of the contract:
 *
 * - `pageReferenceFromBounds` returns `undefined` when no usable start bound is provided;
 * - `normalizePageReference` and `formatPageReference` return `null` for invalid references.
 *
 * Equal bounds are also locked down explicitly. Normalization preserves the `{ start, end }`
 * shape when both values are the same, while formatting still renders that case as a single-page
 * citation.
 */
describe("pages utilities", () => {
    /**
     * Validation tests for the primitive page-number guard.
     *
     * These cases define the numeric domain accepted by the bibliography layer. Only positive,
     * finite integers count as valid page numbers; zero, negative values, fractional values,
     * `NaN`, and infinities are all rejected.
     */
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

    /**
     * Construction tests for the raw page-reference builder.
     *
     * This helper is intentionally lightweight. It preserves the caller-provided shape when a start
     * bound exists and leaves semantic validation to `normalizePageReference`. That separation
     * keeps construction simple while allowing the normalizer to remain the single source of truth
     * for canonical ordering and validity.
     */
    describe("pageReferenceFromBounds", () => {
        test.each([
            {
                name: "single-page bounds",
                start: 5,
                end: undefined,
                expected: { start: 5 },
            },
            {
                name: "ordered bounds",
                start: 5,
                end: 8,
                expected: { start: 5, end: 8 },
            },
            {
                name: "equal bounds",
                start: 7,
                end: 7,
                expected: { start: 7, end: 7 },
            },
        ])("builds $name", ({ start, end, expected }) => {
            expect(pageReferenceFromBounds(start, end)).toEqual(expected);
        });

        /**
         * Missing starts are treated as missing constructor input rather than malformed references.
         * Returning `undefined` here allows callers to represent “no page reference was supplied”
         * without pretending that an invalid reference object was constructed.
         */
        test("returns undefined when the input shape is missing a start bound", () => {
            expect(pageReferenceFromBounds(undefined, 8)).toBeUndefined();
            expect(pageReferenceFromBounds(undefined, undefined)).toBeUndefined();
        });

        /**
         * The builder and normalizer are tested together here to make their boundary explicit:
         * the builder may preserve reversed bounds, but the normalizer must always reduce them to
         * a stable canonical representation.
         */
        test.each([
            {
                name: "constructed single page",
                start: 9,
                end: undefined,
                expected: { start: 9 },
            },
            {
                name: "constructed ordered range",
                start: 9,
                end: 12,
                expected: { start: 9, end: 12 },
            },
            {
                name: "constructed reversed range",
                start: 12,
                end: 9,
                expected: { start: 9, end: 12 },
            },
            {
                name: "constructed equal bounds",
                start: 7,
                end: 7,
                expected: { start: 7, end: 7 },
            },
        ])("normalizes $name to a stable result", ({ start, end, expected }) => {
            const built = pageReferenceFromBounds(start, end);
            expect(normalizePageReference(built)).toEqual(expected);
        });
    });

    /**
     * Canonicalization and validation tests for page references.
     *
     * `normalizePageReference` is the central semantic helper in the module. It is responsible for
     * rejecting invalid inputs, preserving valid single-page references, and canonicalizing ranges
     * so that downstream formatting logic can work with a stable representation.
     */
    describe("normalizePageReference", () => {
        test.each([
            {
                name: "single valid page",
                input: { start: 7 },
                expected: { start: 7 },
            },
            {
                name: "ordered range",
                input: { start: 7, end: 12 },
                expected: { start: 7, end: 12 },
            },
            {
                name: "reversed range",
                input: { start: 12, end: 7 },
                expected: { start: 7, end: 12 },
            },
            {
                name: "equal bounds",
                input: { start: 7, end: 7 },
                expected: { start: 7, end: 7 },
            },
            {
                name: "missing end",
                input: { start: 9 },
                expected: { start: 9 },
            },
        ])("normalizes $name", ({ input, expected }) => {
            expect(normalizePageReference(input)).toEqual(expected);
        });

        /**
         * These example-based invalid cases complement the property tests below by pinning down the
         * exact failure behavior for the most representative malformed inputs.
         */
        test.each([
            { name: "missing input", input: undefined },
            { name: "zero start", input: { start: 0 } },
            { name: "negative zero start", input: { start: -0 } },
            { name: "negative start", input: { start: -1 } },
            { name: "fractional start", input: { start: 3.5 } },
            { name: "NaN start", input: { start: Number.NaN } },
            { name: "positive infinity start", input: { start: Number.POSITIVE_INFINITY } },
            { name: "negative infinity start", input: { start: Number.NEGATIVE_INFINITY } },
            { name: "zero end", input: { start: 8, end: 0 } },
            { name: "negative end", input: { start: 8, end: -4 } },
            { name: "fractional end", input: { start: 8, end: 4.2 } },
            { name: "NaN end", input: { start: 8, end: Number.NaN } },
            { name: "positive infinity end", input: { start: 8, end: Number.POSITIVE_INFINITY } },
            { name: "negative infinity end", input: { start: 8, end: Number.NEGATIVE_INFINITY } },
        ])("returns null for $name", ({ input }) => {
            expect(normalizePageReference(input as PageReference | undefined)).toBeNull();
        });

        /**
         * Once a valid reference has been normalized, running the normalizer again should not
         * change its shape. This protects callers that normalize defensively at multiple
         * boundaries.
         */
        test("is idempotent for normalized valid references", () => {
            const validReferences: PageReference[] = [
                { start: 7 },
                { start: 7, end: 12 },
                { start: 7, end: 7 },
                { start: 12, end: 7 },
            ];

            for (const reference of validReferences) {
                const normalized = normalizePageReference(reference);
                expect(normalized).not.toBeNull();
                expect(normalizePageReference(normalized ?? undefined)).toEqual(normalized);
            }
        });

        /**
         * Property-based check: any two arbitrary positive bounds should normalize to an ordered
         * range where `start <= end`. This is the fundamental ordering invariant for the module.
         */
        test("preserves ordering invariants for arbitrary positive bounds", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10_000 }),
                    fc.integer({ min: 1, max: 10_000 }),
                    (start, end) => {
                        const normalized = normalizePageReference({ start, end });

                        expect(normalized).not.toBeNull();
                        expect(normalized?.start).toBeLessThanOrEqual(
                            normalized?.end ?? normalized?.start ?? 0,
                        );
                    },
                ),
            );
        });

        /**
         * Property-based check: normalization must remain idempotent across a broad set of
         * arbitrary positive inputs, not only the small set of hand-written examples above.
         */
        test("is idempotent for arbitrary positive bounds", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10_000 }),
                    fc.integer({ min: 1, max: 10_000 }),
                    (start, end) => {
                        const normalized = normalizePageReference({ start, end });

                        expect(normalized).not.toBeNull();
                        expect(normalizePageReference(normalized ?? undefined)).toEqual(normalized);
                    },
                ),
            );
        });
    });

    /**
     * Rendering tests for user-visible page-reference formatting.
     *
     * These checks protect the textual contract exposed to bibliography consumers. They verify both
     * canonical output strings and higher-level invariants such as formatting stability after
     * normalization and insensitivity to reversed range input.
     */
    describe("formatPageReference", () => {
        test.each([
            {
                name: "single page",
                input: { start: 7 },
                expected: "p. 7",
            },
            {
                name: "equal bounds",
                input: { start: 7, end: 7 },
                expected: "p. 7",
            },
            {
                name: "ordered range",
                input: { start: 7, end: 12 },
                expected: "pp. 7-12",
            },
            {
                name: "reversed range",
                input: { start: 12, end: 7 },
                expected: "pp. 7-12",
            },
        ])("formats $name", ({ input, expected }) => {
            expect(formatPageReference(input)).toBe(expected);
        });

        /**
         * Formatting does not attempt to recover from invalid references. Instead, it mirrors the
         * validation contract of the normalizer by returning `null`.
         */
        test.each([
            { name: "missing input", input: undefined },
            { name: "invalid start", input: { start: 0 } },
            { name: "invalid end", input: { start: 8, end: 0 } },
        ])("returns null for $name", ({ input }) => {
            expect(formatPageReference(input as PageReference | undefined)).toBeNull();
        });

        /**
         * Formatting should be stable whether callers provide already-normalized input or rely on
         * the formatter to observe the same semantics indirectly through normalization.
         */
        test("matches formatting after normalization for valid references", () => {
            const validReferences: PageReference[] = [
                { start: 7 },
                { start: 7, end: 12 },
                { start: 12, end: 7 },
                { start: 7, end: 7 },
            ];

            for (const reference of validReferences) {
                expect(formatPageReference(reference)).toBe(
                    formatPageReference(normalizePageReference(reference) ?? undefined),
                );
            }
        });

        /**
         * Property-based check: formatting must be insensitive to the order in which valid positive
         * bounds are supplied.
         */
        test("is invariant under reversed bounds for arbitrary positive ranges", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10_000 }),
                    fc.integer({ min: 1, max: 10_000 }),
                    (start, end) => {
                        expect(formatPageReference({ start, end })).toBe(
                            formatPageReference({ start: end, end: start }),
                        );
                    },
                ),
            );
        });

        /**
         * Property-based check: every valid normalized reference must be renderable to a concrete
         * bibliography string.
         */
        test("formats any normalized valid reference to a non-null string", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10_000 }),
                    fc.integer({ min: 1, max: 10_000 }),
                    (start, end) => {
                        const normalized = normalizePageReference({ start, end });

                        expect(normalized).not.toBeNull();
                        expect(formatPageReference(normalized ?? undefined)).not.toBeNull();
                    },
                ),
            );
        });

        /**
         * Property-based check: a single valid page should already be in canonical form and should
         * always format using the singular `p.` label.
         */
        test("keeps single-page references stable for arbitrary positive pages", () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 10_000 }), (page) => {
                    const reference = { start: page };

                    expect(normalizePageReference(reference)).toEqual(reference);
                    expect(formatPageReference(reference)).toBe(`p. ${page}`);
                }),
            );
        });
    });
});
