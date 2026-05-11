import fc from "fast-check";
import { describe, expect, test } from "vitest";
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
    ])("then %s normalizes to %s", (input, expected) => {
        expect(normalizeLessonRoute(input)).toBe(expected);
    });

    test.each(["", "   ", "/notes/foo?x=1", "/notes/foo#section"])("then %s is rejected", (input) => {
        expect(() => normalizeLessonRoute(input)).toThrow();
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

    test.each(["", "/", "/exports/../pdf", "/exports/pdf?x=1", "/exports/pdf#frag"])(
        "then unsafe prefix %s is rejected",
        (prefix) => {
            expect(() => normalizeExportRoutePrefix(prefix)).toThrow();
        },
    );
});
