import fc from "fast-check";
import {
    DEFAULT_LOCALE,
    UNKNOWN_DATE_LABEL,
    formatLessonDate,
    getLessonMetadataDataset,
    normalizeLessonPathname,
    parseLessonMetadataDataset,
    resolveLessonMetadata,
    type LessonMetadataDataset,
} from "../lesson-metadata";

const dataset: LessonMetadataDataset = {
    generatedAt: "2026-02-16T00:00:00.000Z",
    totalLessons: 2,
    changesLimit: 5,
    entries: {
        "/notes/": {
            sourceFile: "src/pages/notes/index.astro",
            authors: [{ name: "Proyecto DIBS" }],
            lastModified: "2026-01-01",
            changes: [],
        },
        "/notes/software-libraries/scripting/first-script/": {
            sourceFile: "src/pages/notes/software-libraries/scripting/first-script/index.astro",
            authors: [{ name: "Proyecto DIBS" }],
            lastModified: "2026-02-11",
            changes: [
                {
                    hash: "abc1234",
                    date: "2026-02-11",
                    author: "r8vnhill",
                    subject: "feat: update lesson",
                },
            ],
        },
    },
};

describe("normalizeLessonPathname", () => {
    test.each([
        ["notes/a", "/notes/a/"],
        ["/notes//a//", "/notes/a/"],
        [" ", "/"],
        ["", "/"],
        ["https://dibs.ravenhill.cl/notes/a", "/notes/a/"],
    ])("normalizes %s to %s", (input, expected) => {
        expect(normalizeLessonPathname(input)).toBe(expected);
    });

    test("is idempotent and stable", () => {
        const pathnameArb = fc.string();
        fc.assert(
            fc.property(pathnameArb, (pathname) => {
                const once = normalizeLessonPathname(pathname);
                const twice = normalizeLessonPathname(once);
                expect(twice).toBe(once);
                expect(once.startsWith("/")).toBe(true);
                expect(once.endsWith("/")).toBe(true);
                expect(once.includes("//")).toBe(false);
            }),
        );
    });
});

describe("formatLessonDate", () => {
    test("returns placeholder for undefined", () => {
        expect(formatLessonDate(undefined)).toBe(UNKNOWN_DATE_LABEL);
    });

    test("formats ISO short date in default locale", () => {
        const formatted = formatLessonDate("2026-02-16", DEFAULT_LOCALE);
        expect(formatted).toContain("2026");
    });

    test("returns raw date when format is invalid", () => {
        expect(formatLessonDate("invalid")).toBe("invalid");
    });
});

describe("dataset resolution", () => {
    test("resolves metadata for matching path", () => {
        const resolved = resolveLessonMetadata(
            "/notes/software-libraries/scripting/first-script",
            dataset,
        );
        expect(resolved?.lastModified).toBe("2026-02-11");
    });

    test("returns undefined for unknown paths", () => {
        const resolved = resolveLessonMetadata("/notes/unknown/", dataset);
        expect(resolved).toBeUndefined();
    });

    test("parses valid dataset at runtime", () => {
        expect(parseLessonMetadataDataset(dataset)).toEqual(dataset);
    });

    test("provides cached runtime dataset", () => {
        const first = getLessonMetadataDataset();
        const second = getLessonMetadataDataset();
        expect(first).toBe(second);
    });
});
