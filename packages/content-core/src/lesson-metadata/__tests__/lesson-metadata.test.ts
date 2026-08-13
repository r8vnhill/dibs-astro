import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { normalizeLessonMetadataPathname, parseIsoShortDate, resolveLessonDate } from "../index";

describe("lesson-metadata domain", () => {
    describe("normalizeLessonMetadataPathname", () => {
        test.each([
            ["notes/a", "/notes/a/"],
            ["/notes//a//", "/notes/a/"],
            [" ", "/"],
            ["", "/"],
            ["https://dibs.ravenhill.cl/notes/a", "/notes/a/"],
            ["http://dibs.ravenhill.cl/notes/a", "/notes/a/"],
            ["HTTPS://dibs.ravenhill.cl/notes/a", "/notes/a/"],
            ["https://dibs.ravenhill.cl/notes/a?from=search", "/notes/a/"],
            ["https://dibs.ravenhill.cl/notes/a#section", "/notes/a/"],
            ["https://dibs.ravenhill.cl/notes/a?from=search#section", "/notes/a/"],
            ["/notes/a?from=search", "/notes/a/"],
            ["/notes/a#section", "/notes/a/"],
            ["/", "/"],
            ["////", "/"],
            ["A:", "/A:/"],
        ])("normalizes %s to %s", (input, expected) => {
            expect(normalizeLessonMetadataPathname(input)).toBe(expected);
        });

        test("is idempotent and stable", () => {
            fc.assert(
                fc.property(fc.string(), (pathname) => {
                    const once = normalizeLessonMetadataPathname(pathname);
                    const twice = normalizeLessonMetadataPathname(once);

                    expect(twice).toBe(once);
                    expect(once.startsWith("/")).toBe(true);
                    expect(once.endsWith("/")).toBe(true);
                    expect(once.includes("//")).toBe(false);
                }),
            );
        });

        test("strips origin for generated http/https urls", () => {
            const hostArb = fc.stringMatching(/^[a-z0-9-]{1,12}\.[a-z]{2,12}$/);
            const tailArb = fc.stringMatching(/^[a-z0-9/-]{1,40}$/);
            const protocolArb = fc.constantFrom("http", "https", "HTTP", "HTTPS");

            fc.assert(
                fc.property(hostArb, tailArb, protocolArb, (host, tail, protocol) => {
                    const withOrigin = `${protocol}://${host}/${tail}`;
                    const normalized = normalizeLessonMetadataPathname(withOrigin);

                    expect(normalized.startsWith("/")).toBe(true);
                    expect(normalized.includes(host)).toBe(false);
                }),
            );
        });
    });

    describe("parseIsoShortDate", () => {
        test("parses a valid ISO short date in UTC", () => {
            expect(parseIsoShortDate("2026-02-16")?.toISOString()).toBe("2026-02-16T00:00:00.000Z");
        });

        test("parses a valid leap day in UTC", () => {
            expect(parseIsoShortDate("2024-02-29")?.toISOString()).toBe("2024-02-29T00:00:00.000Z");
        });

        test.each([
            undefined,
            "",
            "   ",
            "invalid",
            "not-a-date",
            "2026/02/16",
            "2024-1-01",
            "2024-01-1",
            "2024-02-31",
            "2023-02-29",
            "2024-13-01",
            "2024-00-01",
            "2024-01-00",
        ])(
            "returns undefined for invalid input: %j",
            (value) => {
                expect(parseIsoShortDate(value)).toBeUndefined();
            },
        );

        test("property: parses generated real UTC dates back to the same ISO prefix", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1970, max: 2099 }),
                    fc.integer({ min: 0, max: 11 }),
                    fc.integer({ min: 1, max: 28 }),
                    (year, monthIndex, day) => {
                        const expected = new Date(Date.UTC(year, monthIndex, day))
                            .toISOString()
                            .slice(0, 10);

                        expect(parseIsoShortDate(expected)?.toISOString().slice(0, 10)).toBe(
                            expected,
                        );
                    },
                ),
            );
        });
    });

    describe("lesson date semantics", () => {
        test("returns a semantic missing result for undefined", () => {
            expect(resolveLessonDate(undefined)).toEqual({ kind: "missing" });
        });

        test.each(["", "   "])("returns a semantic missing result for blank input %j", (value) => {
            expect(resolveLessonDate(value)).toEqual({ kind: "missing" });
        });

        test("returns a known UTC date for valid ISO dates", () => {
            expect(resolveLessonDate("2026-02-16")).toEqual({
                kind: "known",
                value: new Date("2026-02-16T00:00:00.000Z"),
            });
        });

        test("returns a trimmed passthrough result for invalid date strings", () => {
            expect(resolveLessonDate("  invalid-date  ")).toEqual({
                kind: "passthrough",
                value: "invalid-date",
            });
        });
    });
});
