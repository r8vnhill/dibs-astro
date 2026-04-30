import { describe, expect, suite, test } from "vitest";

import type { BookNormalizationInput } from "../normalize/normalize-reference-types";
import { normalizeBookReference, normalizeReference } from "../normalize/normalize-reference.mjs";
import { parsePageReference } from "../pages";

const completePages = parsePageReference(10, 24);
if (!completePages) {
    throw new Error("Expected test page range to be valid.");
}

const completeBookInput = {
    kind: "Book",
    id: "ref:book",
    rawType: "Book",
    title: "Readable API chapters",
    description: "A focused chapter about readable API design.",
    authors: [{
        firstName: "Ada",
        lastName: "Lovelace",
    }],
    datePublished: "2024-01-15",
    keywords: ["api", "design"],
    publisherName: "Example Press",
    publisherUrl: "https://press.example/",
    sourceLabel: "normalizer test",
    bookTitle: "Readable Systems",
    bookId: "work:readable-systems",
    pages: completePages,
} satisfies BookNormalizationInput;

suite("given Book normalization input", () => {
    describe("when normalizing through the shared Book normalizer", () => {
        test("then it returns the current NormalizedBookReference shape", () => {
            expect(normalizeBookReference(completeBookInput)).toEqual({
                id: "ref:book",
                type: "Book",
                rawType: "Book",
                title: "Readable API chapters",
                chapter: "Readable API chapters",
                bookTitle: "Readable Systems",
                bookId: "work:readable-systems",
                pages: {
                    start: 10,
                    end: 24,
                },
                description: "A focused chapter about readable API design.",
                authors: [{
                    firstName: "Ada",
                    lastName: "Lovelace",
                }],
                datePublished: "2024-01-15",
                keywords: ["api", "design"],
                publisherName: "Example Press",
                publisherUrl: "https://press.example/",
                sourceLabel: "normalizer test",
            });
        });

        test("then the generic dispatcher supports Book input", () => {
            expect(normalizeReference(completeBookInput)).toEqual(
                normalizeBookReference(completeBookInput),
            );
        });
    });

    describe("when optional Book metadata is present", () => {
        test("then catalog book IDs and page ranges are preserved", () => {
            const reference = normalizeBookReference(completeBookInput);

            expect(reference).toMatchObject({
                bookId: "work:readable-systems",
                pages: {
                    start: 10,
                    end: 24,
                },
            });
        });

        test("then chapter is derived from title", () => {
            const reference = normalizeBookReference(completeBookInput);

            expect(reference.chapter).toBe(reference.title);
        });
    });

    describe("when optional Book metadata is missing", () => {
        test("then optional fields are omitted without changing required arrays", () => {
            const reference = normalizeBookReference({
                kind: "Book",
                id: "ref:minimal-book",
                rawType: "Book",
                title: "Minimal Chapter",
                bookTitle: "Minimal Book",
            });

            expect(reference).toEqual({
                id: "ref:minimal-book",
                type: "Book",
                rawType: "Book",
                title: "Minimal Chapter",
                chapter: "Minimal Chapter",
                bookTitle: "Minimal Book",
                authors: [],
                keywords: [],
            });
            expect(reference).not.toHaveProperty("description");
            expect(reference).not.toHaveProperty("bookId");
            expect(reference).not.toHaveProperty("pages");
            expect(reference).not.toHaveProperty("publisherName");
            expect(reference).not.toHaveProperty("publisherUrl");
        });
    });

    describe("when an unsupported kind reaches the generic dispatcher", () => {
        test("then it fails with a stable message", () => {
            expect(() =>
                normalizeReference({
                    kind: "WebPage",
                    id: "ref:web",
                    rawType: "WebPage",
                    title: "Unsupported",
                } as never)
            ).toThrow("Unsupported reference normalization kind: WebPage");
        });
    });
});
