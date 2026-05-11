import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { ExportRoute, LessonRoute } from "../src";
import { deriveExportRoute, normalizeExportRoutePrefix, normalizeLessonRoute } from "../src";

describe("given lesson route normalization", () => {
    test.each([
        ["notes/foo", "/notes/foo/"],
        ["/notes/foo", "/notes/foo/"],
        ["/notes/foo/", "/notes/foo/"],
        ["/notes//foo///", "/notes/foo/"],
        ["/notes/foo/index", "/notes/foo/"],
        ["/notes/foo/index/", "/notes/foo/"],
        ["  notes/software-libraries/artifacts-taxonomy  ", "/notes/software-libraries/artifacts-taxonomy/"],
        ["/custom/export-target", "/custom/export-target/"],
    ])("then %s normalizes to %s", (input, expected) => {
        expect(normalizeLessonRoute(input)).toBe(expected);
    });

    test.each([
        "",
        "   ",
        "/notes/foo?x=1",
        "/notes/foo#section",
        "/notes/../foo",
        "/notes/./foo",
        "https://example.com/notes/foo",
        "file:///notes/foo",
        "/notes/foo\nbar",
        "/notes/foo\tbar",
    ])("then %s is rejected", (input) => {
        expect(() => normalizeLessonRoute(input)).toThrow();
    });

    test.each([
        ["/notes/foo%3Fbar", "/notes/foo%3Fbar/"],
        ["/notes/foo%23bar", "/notes/foo%23bar/"],
    ])("then %s allows encoded query or fragment markers", (input, expected) => {
        expect(normalizeLessonRoute(input)).toBe(expected);
    });

    test("then accepted routes always start and end with a slash", () => {
        const segment = fc.stringMatching(/^[A-Za-z0-9_-]{1,24}$/);

        fc.assert(
            fc.property(fc.array(segment, { minLength: 1, maxLength: 5 }), (segments) => {
                const normalized = normalizeLessonRoute(segments.join("/"));

                expect(normalized.startsWith("/")).toBe(true);
                expect(normalized.endsWith("/")).toBe(true);
            }),
        );
    });

    test("then accepted routes are idempotent", () => {
        const route = normalizeLessonRoute("notes/foo/index");

        expect(normalizeLessonRoute(route)).toBe(route);
    });
});

describe("given export route derivation", () => {
    test("then it uses the default export prefix", () => {
        expect(deriveExportRoute("/notes/software-libraries/foo/")).toBe(
            "/exports/pdf/notes/software-libraries/foo/",
        );
    });

    test("then it accepts a normalized custom prefix", () => {
        expect(deriveExportRoute("/notes/foo/", { prefix: "exports/print" })).toBe(
            "/exports/print/notes/foo/",
        );
    });

    test("then it preserves canonicalized non-notes routes for generic route-shaped input", () => {
        expect(deriveExportRoute("/custom/foo/", { prefix: "/exports/pdf" })).toBe(
            "/exports/pdf/custom/foo/",
        );
    });

    test.each([
        ["/exports/pdf", "/exports/pdf"],
        ["exports/pdf", "/exports/pdf"],
        ["/exports//pdf///", "/exports/pdf"],
    ])("then export prefix %s normalizes to %s", (input, expected) => {
        expect(normalizeExportRoutePrefix(input)).toBe(expected);
    });

    test.each([
        "",
        "/",
        "/exports/../pdf",
        "/exports/./pdf",
        "/exports/pdf?x=1",
        "/exports/pdf#frag",
        "https://example.com/export",
    ])(
        "then unsafe prefix %s is rejected",
        (prefix) => {
            expect(() => normalizeExportRoutePrefix(prefix)).toThrow();
        },
    );

    test("then normalized export prefixes are idempotent", () => {
        const prefix = normalizeExportRoutePrefix("/exports//pdf///");

        expect(normalizeExportRoutePrefix(prefix)).toBe(prefix);
    });
});

describe("given branded route types", () => {
    test("then public constructors produce branded values", () => {
        const lessonRoute: LessonRoute = normalizeLessonRoute("/notes/foo/");
        const exportRoute: ExportRoute = deriveExportRoute(lessonRoute);

        expect(lessonRoute).toBe("/notes/foo/");
        expect(exportRoute).toBe("/exports/pdf/notes/foo/");
    });
});
