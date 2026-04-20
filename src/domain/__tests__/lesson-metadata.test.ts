import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
    DEFAULT_LESSON_METADATA_LOCALE,
    formatLessonDate,
    normalizeLessonMetadataPathname,
    parseIsoShortDate,
    resolveLessonDateDisplay,
    UNKNOWN_LESSON_DATE_LABEL,
} from "../lesson-metadata";

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
            ["/", "/"],
            ["////", "/"],
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
            const hostArb = fc.stringMatching(/^[a-z0-9-]{1,12}(\.[a-z0-9-]{1,12})+$/);
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

        test.each([undefined, "", "invalid", "2026/02/16"])(
            "returns undefined for invalid input: %j",
            (value) => {
                expect(parseIsoShortDate(value)).toBeUndefined();
            },
        );
    });

    describe("lesson date display policy", () => {
        test("returns a semantic missing result for undefined", () => {
            expect(resolveLessonDateDisplay(undefined)).toEqual({ kind: "missing" });
        });

        test("returns a formatted result for valid ISO dates", () => {
            expect(resolveLessonDateDisplay("2026-02-16", "en-GB")).toEqual({
                kind: "formatted",
                value: "16 February 2026",
            });
        });

        test("returns a passthrough result for invalid date strings", () => {
            expect(resolveLessonDateDisplay("invalid")).toEqual({
                kind: "passthrough",
                value: "invalid",
            });
        });

        test("preserves the current unknown-date fallback label", () => {
            expect(formatLessonDate(undefined)).toBe(UNKNOWN_LESSON_DATE_LABEL);
        });

        test("formats ISO short date in default locale with stable properties", () => {
            const formatted = formatLessonDate("2026-02-16", DEFAULT_LESSON_METADATA_LOCALE);
            expect(formatted.length).toBeGreaterThan(0);
            expect(formatted).toContain("2026");
        });

        test("formats ISO short date with deterministic en-GB output", () => {
            expect(formatLessonDate("2026-02-16", "en-GB")).toBe("16 February 2026");
        });

        test("returns raw date when format is invalid", () => {
            expect(formatLessonDate("invalid")).toBe("invalid");
        });
    });
});
