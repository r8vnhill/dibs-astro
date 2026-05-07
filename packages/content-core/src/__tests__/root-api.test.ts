import {
    AdjacentLessons,
    CONTENT_CORE_PACKAGE_NAME,
    CONTENT_CORE_VERSION,
    formatDate,
    formatLessonDate,
    LessonHref,
    LessonMetadataService,
    LessonSequenceService,
    LessonTrail,
    NavigationService,
    normalizeLessonMetadataPathname,
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDate,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
    resolveLessonDateDisplay,
} from "@ravenhill/content-core";
import { describe, expect, test } from "vitest";

describe("content-core root API values", () => {
    test("exposes package identity values", () => {
        expect(CONTENT_CORE_PACKAGE_NAME).toBe("@ravenhill/content-core");
        expect(CONTENT_CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/u);
    });

    test("exposes navigation value symbols", () => {
        expect(AdjacentLessons).toBeDefined();
        expect(LessonHref).toBeDefined();
        expect(LessonSequenceService).toBeDefined();
        expect(LessonTrail).toBeDefined();
        expect(NavigationService).toBeDefined();
    });

    test("exposes lesson-metadata value symbols and helpers", () => {
        expect(LessonMetadataService).toBeDefined();
        expect(formatDate).toBeTypeOf("function");
        expect(formatLessonDate).toBeTypeOf("function");
        expect(normalizeLessonMetadataPathname).toBeTypeOf("function");
        expect(parseAbsoluteUrl).toBeTypeOf("function");
        expect(parseGitCommitHash).toBeTypeOf("function");
        expect(parseIsoShortDate).toBeTypeOf("function");
        expect(parseIsoShortDateValue).toBeTypeOf("function");
        expect(parseLessonSourceFile).toBeTypeOf("function");
        expect(parseNonEmptyText).toBeTypeOf("function");
        expect(resolveLessonDateDisplay).toBeTypeOf("function");
    });
});
