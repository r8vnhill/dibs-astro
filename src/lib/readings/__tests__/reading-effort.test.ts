import { describe, expect, suite, test } from "vitest";
import type { NormalizedReference } from "~/lib/bibliography";
import type { LessonReadingGuide } from "../lesson-readings-contract";
import { resolveReadingEffort } from "../reading-effort";

const guideWithEffort = (effort: LessonReadingGuide["effort"]): LessonReadingGuide => ({
    difficulty: "Intermedia",
    ...(effort !== undefined ? { effort } : {}),
    whatToRead: "what",
    why: "why",
    focus: "focus",
    guidingQuestion: "question",
});

suite("given a reading's effort evidence", () => {
    describe("when resolved by priority", () => {
        test.each<{
            name: string;
            referenceType: NormalizedReference["type"];
            effort: LessonReadingGuide["effort"];
            expected: ReturnType<typeof resolveReadingEffort>;
        }>([
            {
                name: "a video with duration, pages, and words prefers duration",
                referenceType: "VideoObject",
                effort: { durationMinutes: 8, pageCount: 4, wordCount: 900 },
                expected: { kind: "duration", minutes: 8 },
            },
            {
                name: "a video with only pages and words prefers pages",
                referenceType: "VideoObject",
                effort: { pageCount: 4, wordCount: 900 },
                expected: { kind: "pages", pages: 4 },
            },
            {
                name: "a video with only words falls back to estimated reading time",
                referenceType: "VideoObject",
                effort: { wordCount: 500 },
                expected: { kind: "estimated-reading-time", minutes: 2 },
            },
            {
                name: "an article with pages and words prefers pages",
                referenceType: "ScholarlyArticle",
                effort: { pageCount: 4, wordCount: 900 },
                expected: { kind: "pages", pages: 4 },
            },
            {
                name: "an article with only words falls back to estimated reading time",
                referenceType: "ScholarlyArticle",
                effort: { wordCount: 750 },
                expected: { kind: "estimated-reading-time", minutes: 3 },
            },
            {
                name: "a book with no evidence is unavailable",
                referenceType: "Book",
                effort: undefined,
                expected: { kind: "unavailable" },
            },
        ])("then $name", ({ referenceType, effort, expected }) => {
            expect(resolveReadingEffort(guideWithEffort(effort), referenceType)).toEqual(expected);
        });

        test("then durationMinutes on a non-video reference is not treated as duration evidence", () => {
            const result = resolveReadingEffort(
                guideWithEffort({ durationMinutes: 8, pageCount: 4 }),
                "Book",
            );

            expect(result).toEqual({ kind: "pages", pages: 4 });
        });
    });

    describe("when lower-priority evidence is added alongside higher-priority evidence", () => {
        test("then adding word count to an existing page count still resolves to pages", () => {
            const withPagesOnly = resolveReadingEffort(guideWithEffort({ pageCount: 10 }), "Book");
            const withPagesAndWords = resolveReadingEffort(
                guideWithEffort({ pageCount: 10, wordCount: 5_000 }),
                "Book",
            );

            expect(withPagesAndWords).toEqual(withPagesOnly);
        });

        test("then adding pages and words to a video's duration still resolves to that duration", () => {
            const durationOnly = resolveReadingEffort(guideWithEffort({ durationMinutes: 8 }), "VideoObject");
            const durationWithMore = resolveReadingEffort(
                guideWithEffort({ durationMinutes: 8, pageCount: 4, wordCount: 900 }),
                "VideoObject",
            );

            expect(durationWithMore).toEqual(durationOnly);
        });
    });
});
