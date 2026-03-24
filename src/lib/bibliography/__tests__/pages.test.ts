import { describe, expect, it } from "vitest";
import {
    formatPageReference,
    isValidPageNumber,
    normalizePageReference,
    type PageReference,
    pageReferenceFromBounds,
} from "../pages";

describe("pages utilities", () => {
    it("validates positive integers only", () => {
        expect(isValidPageNumber(1)).toBe(true);
        expect(isValidPageNumber(99)).toBe(true);
        expect(isValidPageNumber(0)).toBe(false);
        expect(isValidPageNumber(-1)).toBe(false);
        expect(isValidPageNumber(1.5)).toBe(false);
        expect(isValidPageNumber(Number.NaN)).toBe(false);
    });

    it("normalizes a single valid page", () => {
        expect(normalizePageReference({ start: 7 })).toEqual({ start: 7 });
    });

    it("normalizes an ordered range", () => {
        expect(normalizePageReference({ start: 7, end: 12 })).toEqual({ start: 7, end: 12 });
    });

    it("normalizes a reversed range", () => {
        expect(normalizePageReference({ start: 12, end: 7 })).toEqual({ start: 7, end: 12 });
    });

    it("keeps a missing end as a single-page reference", () => {
        expect(normalizePageReference({ start: 9, end: undefined })).toEqual({ start: 9 });
    });

    it("rejects invalid values", () => {
        const invalidReferences: Array<PageReference | undefined> = [
            undefined,
            { start: 0 },
            { start: -1 },
            { start: 3.5 },
            { start: Number.NaN },
            { start: 8, end: 0 },
            { start: 8, end: -4 },
            { start: 8, end: 4.2 },
            { start: 8, end: Number.NaN },
        ];

        for (const reference of invalidReferences) {
            expect(normalizePageReference(reference)).toBeNull();
        }
    });

    it("formats a single page", () => {
        expect(formatPageReference({ start: 7 })).toBe("p. 7");
    });

    it("formats an ordered range", () => {
        expect(formatPageReference({ start: 7, end: 12 })).toBe("pp. 7-12");
    });

    it("formats a reversed range as ordered output", () => {
        expect(formatPageReference({ start: 12, end: 7 })).toBe("pp. 7-12");
    });

    it("builds references from pageStart/pageEnd bounds", () => {
        expect(pageReferenceFromBounds(5)).toEqual({ start: 5 });
        expect(pageReferenceFromBounds(5, 8)).toEqual({ start: 5, end: 8 });
        expect(pageReferenceFromBounds(undefined, 8)).toBeUndefined();
    });

    it("returns null for invalid references", () => {
        expect(formatPageReference({ start: 0 })).toBeNull();
    });
});
