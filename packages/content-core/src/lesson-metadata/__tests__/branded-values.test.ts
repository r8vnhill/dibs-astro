import { describe, expect, it } from "vitest";
import {
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
} from "../branded-values";

describe("lesson metadata branded values", () => {
    describe("parseNonEmptyText", () => {
        it("returns trimmed text for meaningful input", () => {
            expect(parseNonEmptyText("  Ada Lovelace  ")).toBe("Ada Lovelace");
        });

        it.each(["", "   "])("rejects blank input %j", (value) => {
            expect(parseNonEmptyText(value)).toBeUndefined();
        });
    });

    describe("parseAbsoluteUrl", () => {
        it.each(["https://example.com", "http://example.com/profile"])("accepts %s", (value) => {
            expect(parseAbsoluteUrl(value)).toBe(value);
        });

        it.each(["", "example.com", "/relative/path", "mailto:person@example.com"])(
            "rejects %s",
            (value) => {
                expect(parseAbsoluteUrl(value)).toBeUndefined();
            },
        );
    });

    describe("parseGitCommitHash", () => {
        it.each(["abc1234", "ABC1234", "0123456789abcdef"])("accepts %s", (value) => {
            expect(parseGitCommitHash(value)).toBe(value);
        });

        it.each(["abc123", "not-a-hash", "g123456"])("rejects %s", (value) => {
            expect(parseGitCommitHash(value)).toBeUndefined();
        });
    });

    describe("parseIsoShortDateValue", () => {
        it.each(["2026-05-06", "2024-02-29"])("accepts %s", (value) => {
            expect(parseIsoShortDateValue(value)).toBe(value);
        });

        it.each(["2026-5-6", "2026/05/06", "2026-02-30", "2026-05-06T12:00:00Z"])(
            "rejects %s",
            (value) => {
                expect(parseIsoShortDateValue(value)).toBeUndefined();
            },
        );
    });

    describe("parseLessonSourceFile", () => {
        it.each(["notes/software-libraries/index.astro", "/notes/software-libraries/index"])(
            "accepts %s",
            (value) => {
                expect(parseLessonSourceFile(value)).toBe(value);
            },
        );

        it.each(["", "   ", "https://example.com/lesson", "http://example.com/lesson"])(
            "rejects %s",
            (value) => {
                expect(parseLessonSourceFile(value)).toBeUndefined();
            },
        );
    });
});
