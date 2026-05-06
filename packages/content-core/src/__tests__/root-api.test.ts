import { describe, expect, test } from "vitest";
import * as contentCore from "@ravenhill/content-core";
import {
    AdjacentLessons,
    LessonHref,
    LessonMetadataService,
    LessonSequenceService,
    LessonTrail,
    NavigationService,
    formatLessonDate,
    normalizeLessonMetadataPathname,
} from "@ravenhill/content-core";

describe("content-core root API", () => {
    test("exports the stabilized value surface from the package root", () => {
        expect(AdjacentLessons).toBe(contentCore.AdjacentLessons);
        expect(LessonHref).toBe(contentCore.LessonHref);
        expect(LessonMetadataService).toBe(contentCore.LessonMetadataService);
        expect(LessonSequenceService).toBe(contentCore.LessonSequenceService);
        expect(LessonTrail).toBe(contentCore.LessonTrail);
        expect(NavigationService).toBe(contentCore.NavigationService);
        expect(formatLessonDate).toBe(contentCore.formatLessonDate);
        expect(normalizeLessonMetadataPathname).toBe(contentCore.normalizeLessonMetadataPathname);
    });

    test("does not expose temporary Phase 1 service names at runtime", () => {
        expect("NavigationServiceImpl" in contentCore).toBe(false);
        expect("LessonMetadataServiceImpl" in contentCore).toBe(false);
    });
});
