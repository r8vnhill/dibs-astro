import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
    formatPageReference,
    isPageReference,
    isRecord,
    isValidPageNumber,
    parsePageReference,
    parsePageReferenceInput,
    resolvePageFormat,
} from "../pages-core.mjs";

const validPageNumber = () => fc.integer({ min: 1, max: 10_000 });

describe("pages core runtime", () => {
    describe("given untrusted primitive values", () => {
        test.each([
            { value: 1, expected: true },
            { value: 99, expected: true },
            { value: 0, expected: false },
            { value: -1, expected: false },
            { value: 1.5, expected: false },
            { value: Number.NaN, expected: false },
            { value: Number.POSITIVE_INFINITY, expected: false },
            { value: Number.MAX_SAFE_INTEGER + 1, expected: false },
            { value: "1", expected: false },
            { value: null, expected: false },
        ])("then page-number validation returns $expected for $value", ({ value, expected }) => {
            expect(isValidPageNumber(value)).toBe(expected);
        });

        test.each([
            { value: {}, expected: true },
            { value: { start: 1 }, expected: true },
            { value: [], expected: false },
            { value: null, expected: false },
            { value: "value", expected: false },
        ])("then record validation returns $expected for $value", ({ value, expected }) => {
            expect(isRecord(value)).toBe(expected);
        });
    });

    describe("given raw page-reference bounds", () => {
        test.each([
            { name: "missing bounds", start: undefined, end: undefined, expected: undefined },
            { name: "single page", start: 1, end: undefined, expected: { start: 1 } },
            { name: "ordered range", start: 1, end: 3, expected: { start: 1, end: 3 } },
            { name: "reversed range", start: 3, end: 1, expected: { start: 1, end: 3 } },
            { name: "equal bounds", start: 1, end: 1, expected: { start: 1, end: 1 } },
            { name: "zero start", start: 0, end: 1, expected: undefined },
            { name: "string end", start: 1, end: "2", expected: undefined },
        ])("then parsing handles $name", ({ start, end, expected }) => {
            expect(parsePageReference(start, end)).toEqual(expected);
        });

        test("then arbitrary valid bounds are ordered", () => {
            fc.assert(
                fc.property(validPageNumber(), validPageNumber(), (start, end) => {
                    expect(parsePageReference(start, end)).toEqual({
                        start: Math.min(start, end),
                        end: Math.max(start, end),
                    });
                }),
            );
        });

        test("then every parsed range satisfies the runtime guard", () => {
            fc.assert(
                fc.property(validPageNumber(), validPageNumber(), (start, end) => {
                    expect(isPageReference(parsePageReference(start, end))).toBe(true);
                }),
            );
        });
    });

    describe("given untrusted page-reference input", () => {
        test.each([
            undefined,
            null,
            true,
            false,
            1,
            "1",
            Symbol("page"),
            () => ({ start: 1 }),
            [],
            [1, 2],
            {},
            { end: 2 },
            { start: 0 },
            { start: -1 },
            { start: 1.5 },
            { start: Number.MAX_SAFE_INTEGER + 1 },
            { start: 1, end: "2" },
        ])("then parsing rejects invalid input %#", (input) => {
            expect(parsePageReferenceInput(input)).toBeUndefined();
        });

        test.each([
            { input: { start: 1 }, expected: { start: 1 } },
            { input: { start: 1, end: 3 }, expected: { start: 1, end: 3 } },
            { input: { start: 3, end: 1 }, expected: { start: 1, end: 3 } },
        ])("then parsing normalizes valid input %#", ({ input, expected }) => {
            expect(parsePageReferenceInput(input)).toEqual(expected);
        });

        test("then normalized references parse idempotently", () => {
            fc.assert(
                fc.property(validPageNumber(), validPageNumber(), (start, end) => {
                    const parsed = parsePageReference(start, end);

                    expect(parsePageReferenceInput(parsed)).toEqual(parsed);
                }),
            );
        });
    });

    describe("given runtime page-reference values", () => {
        test("then the guard validates only normalized references", () => {
            expect(isPageReference({ start: 1 })).toBe(true);
            expect(isPageReference({ start: 1, end: 3 })).toBe(true);
            expect(isPageReference({ start: 3, end: 1 })).toBe(false);
            expect(isPageReference([1, 3])).toBe(false);
        });
    });

    describe("given formatter options", () => {
        test("then partial options fall back to defaults", () => {
            expect(formatPageReference({ start: 1, end: 3 }, { singleLabel: "page" })).toBe(
                "pp. 1–3",
            );
            expect(formatPageReference({ start: 1 }, { rangeLabel: "pages" })).toBe("p. 1");
            expect(resolvePageFormat("not-options")).toEqual({
                singleLabel: "p.",
                rangeLabel: "pp.",
                separator: "–",
            });
        });

        test("then formatting remains presentation-only", () => {
            expect(formatPageReference({ start: 3, end: 1 })).toBe("pp. 3–1");
            expect(formatPageReference(undefined)).toBeUndefined();
        });

        test("then valid references always format to a non-empty string", () => {
            fc.assert(
                fc.property(validPageNumber(), validPageNumber(), (start, end) => {
                    const pages = parsePageReference(start, end);
                    const formatted = formatPageReference(pages);

                    expect(formatted).toEqual(expect.any(String));
                    expect(formatted?.length).toBeGreaterThan(0);
                }),
            );
        });
    });
});
