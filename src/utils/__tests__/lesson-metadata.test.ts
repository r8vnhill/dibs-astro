/**
 * @file lesson-metadata.test.ts
 *
 * Tests for the generated lesson metadata infrastructure boundary.
 *
 * This suite validates strict dataset parsing, immutable cached data, repository-scoped caching,
 * and the compatibility lookup/date/path helpers exported by `lesson-metadata.ts`.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    createLessonMetadataRepository,
    formatLessonDate,
    getLessonMetadataDataset,
    type LessonMetadataDataset,
    LessonMetadataDatasetError,
    normalizeLessonPathname,
    parseIsoShortDate,
    parseLessonMetadataDataset,
    resolveLessonMetadata,
    UNKNOWN_DATE_LABEL,
} from "../lesson-metadata";

const SAMPLE_ROUTE = "/notes/scripting/first-script/";

const makeDataset = (): LessonMetadataDataset => ({
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
        [SAMPLE_ROUTE]: {
            sourceFile: "src/pages/notes/scripting/first-script/index.astro",
            authors: [{ name: "Proyecto DIBS", url: "https://dibs.ravenhill.cl" }],
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
});

const expectDatasetError = (source: unknown): void => {
    try {
        parseLessonMetadataDataset(source);
        throw new Error("Expected parseLessonMetadataDataset to fail.");
    } catch (error) {
        expect(error).toBeInstanceOf(LessonMetadataDatasetError);
        expect((error as Error).cause).toBeDefined();
    }
};

describe("parseLessonMetadataDataset", () => {
    it("accepts a valid generated dataset and returns equivalent data", () => {
        const dataset = makeDataset();

        expect(parseLessonMetadataDataset(dataset)).toEqual(dataset);
    });

    it.each([
        [
            "extra dataset key",
            () => ({ ...makeDataset(), unexpected: true }),
        ],
        [
            "entries is not a record",
            () => ({ ...makeDataset(), entries: [] }),
        ],
        [
            "extra entry key",
            () => {
                const dataset = makeDataset();
                return {
                    ...dataset,
                    entries: {
                        ...dataset.entries,
                        "/notes/": { ...dataset.entries["/notes/"], unexpected: true },
                    },
                };
            },
        ],
        [
            "extra author key",
            () => {
                const dataset = makeDataset();
                return {
                    ...dataset,
                    entries: {
                        ...dataset.entries,
                        "/notes/": {
                            ...dataset.entries["/notes/"],
                            authors: [{ name: "Proyecto DIBS", unexpected: true }],
                        },
                    },
                };
            },
        ],
        [
            "extra change key",
            () => {
                const dataset = makeDataset();
                return {
                    ...dataset,
                    entries: {
                        ...dataset.entries,
                        [SAMPLE_ROUTE]: {
                            ...dataset.entries[SAMPLE_ROUTE],
                            changes: [
                                {
                                    ...dataset.entries[SAMPLE_ROUTE]!.changes[0]!,
                                    unexpected: true,
                                },
                            ],
                        },
                    },
                };
            },
        ],
        [
            "route key is not normalized",
            () => {
                const dataset = makeDataset();
                const { [SAMPLE_ROUTE]: sample, ...entries } = dataset.entries;
                return {
                    ...dataset,
                    entries: {
                        ...entries,
                        "notes/scripting/first-script": sample,
                    },
                };
            },
        ],
        ["generatedAt is not an ISO timestamp", () => ({ ...makeDataset(), generatedAt: "today" })],
        [
            "lastModified is not a real ISO short date",
            () => {
                const dataset = makeDataset();
                return {
                    ...dataset,
                    entries: {
                        ...dataset.entries,
                        "/notes/": { ...dataset.entries["/notes/"], lastModified: "2026-02-31" },
                    },
                };
            },
        ],
        [
            "change date is not a real ISO short date",
            () => {
                const dataset = makeDataset();
                return {
                    ...dataset,
                    entries: {
                        ...dataset.entries,
                        [SAMPLE_ROUTE]: {
                            ...dataset.entries[SAMPLE_ROUTE],
                            changes: [
                                { ...dataset.entries[SAMPLE_ROUTE]!.changes[0]!, date: "2026-13-01" },
                            ],
                        },
                    },
                };
            },
        ],
        ["totalLessons is negative", () => ({ ...makeDataset(), totalLessons: -1 })],
        ["totalLessons is not an integer", () => ({ ...makeDataset(), totalLessons: 1.5 })],
        ["changesLimit is negative", () => ({ ...makeDataset(), changesLimit: -1 })],
        ["changesLimit is not an integer", () => ({ ...makeDataset(), changesLimit: 1.5 })],
        [
            "author URL is invalid",
            () => {
                const dataset = makeDataset();
                return {
                    ...dataset,
                    entries: {
                        ...dataset.entries,
                        "/notes/": {
                            ...dataset.entries["/notes/"],
                            authors: [{ name: "Proyecto DIBS", url: "not a url" }],
                        },
                    },
                };
            },
        ],
        ["totalLessons does not match entry count", () => ({ ...makeDataset(), totalLessons: 99 })],
        ["changes exceed changesLimit", () => ({ ...makeDataset(), changesLimit: 0 })],
    ])("rejects generated datasets when %s", (_caseName, buildSource) => {
        expectDatasetError(buildSource());
    });

    it("returns deeply frozen metadata", () => {
        const dataset = parseLessonMetadataDataset(makeDataset());
        const sampleEntry = dataset.entries[SAMPLE_ROUTE]!;

        expect(Object.isFrozen(dataset)).toBe(true);
        expect(Object.isFrozen(dataset.entries)).toBe(true);
        expect(Object.isFrozen(sampleEntry)).toBe(true);
        expect(Object.isFrozen(sampleEntry.authors)).toBe(true);
        expect(Object.isFrozen(sampleEntry.authors[0])).toBe(true);
        expect(Object.isFrozen(sampleEntry.changes)).toBe(true);
        expect(Object.isFrozen(sampleEntry.changes[0])).toBe(true);
        expect(() => Object.assign(dataset.entries, { "/fake/": sampleEntry })).toThrow(TypeError);
    });
});

describe("createLessonMetadataRepository", () => {
    it("caches parsed metadata per repository instance", () => {
        const repository = createLessonMetadataRepository(makeDataset());

        const first = repository.dataset();
        const second = repository.dataset();

        expect(first).toBe(second);
    });

    it("keeps cache instances separate between repositories", () => {
        const firstRepository = createLessonMetadataRepository(makeDataset());
        const secondRepository = createLessonMetadataRepository(makeDataset());

        expect(firstRepository.dataset()).not.toBe(secondRepository.dataset());
    });

    it("resolves metadata by normalized pathname", () => {
        const repository = createLessonMetadataRepository(makeDataset());

        const resolved = repository.resolve("https://dibs.ravenhill.cl/notes/scripting/first-script");

        expect(resolved?.lastModified).toBe("2026-02-11");
    });

    it("defers validation until metadata is requested", () => {
        const repository = createLessonMetadataRepository({ invalid: true });

        expect(() => repository.dataset()).toThrow(LessonMetadataDatasetError);
    });
});

describe("resolveLessonMetadata", () => {
    it.each([
        "/notes/scripting/first-script",
        "/notes//scripting///first-script/",
        "https://dibs.ravenhill.cl/notes/scripting/first-script?from=search#intro",
    ])("resolves metadata for matching path variants: %s", (input) => {
        const dataset = parseLessonMetadataDataset(makeDataset());

        const resolved = resolveLessonMetadata(input, dataset);

        expect(resolved?.lastModified).toBe("2026-02-11");
    });

    it("returns undefined for unknown paths", () => {
        const dataset = parseLessonMetadataDataset(makeDataset());

        expect(resolveLessonMetadata("/notes/unknown/", dataset)).toBeUndefined();
    });

    it("uses the default generated dataset when no source is provided", () => {
        const dataset = getLessonMetadataDataset();

        expect(dataset.totalLessons).toBe(Object.keys(dataset.entries).length);
        expect(resolveLessonMetadata("/notes/")).toBe(dataset.entries["/notes/"]);
    });

    it("lookup agrees with direct dataset access after normalization", () => {
        const dataset = parseLessonMetadataDataset(makeDataset());
        const knownRoutes = Object.keys(dataset.entries);

        fc.assert(
            fc.property(fc.constantFrom(...knownRoutes), (route) => {
                const base = route.endsWith("/") ? route.slice(0, -1) : route;
                const variants = [
                    base,
                    `${route}/`,
                    `https://dibs.ravenhill.cl${base}`,
                    `https://dibs.ravenhill.cl${base}?from=search`,
                    `https://dibs.ravenhill.cl${base}#section`,
                ];

                for (const variant of variants) {
                    const normalized = normalizeLessonPathname(variant);
                    expect(resolveLessonMetadata(variant, dataset)).toBe(dataset.entries[normalized]);
                }
            }),
        );
    });
});

describe("compatibility helpers", () => {
    it.each([
        ["notes/foo", "/notes/foo/"],
        ["/notes/foo?x=1", "/notes/foo/"],
        ["/notes/foo#section", "/notes/foo/"],
        ["https://example.com/notes/foo?x=1#section", "/notes/foo/"],
    ])("normalizes %s to %s", (input, expected) => {
        expect(normalizeLessonPathname(input)).toBe(expected);
    });

    it("keeps path normalization idempotent", () => {
        fc.assert(
            fc.property(fc.constantFrom("notes/foo", "/notes//foo/", "/notes/foo?x=1#section"), (input) => {
                const normalized = normalizeLessonPathname(input);
                expect(normalizeLessonPathname(normalized)).toBe(normalized);
            }),
        );
    });

    it("preserves domain date formatting behaviour", () => {
        expect(formatLessonDate(undefined)).toBe(UNKNOWN_DATE_LABEL);
        expect(formatLessonDate("invalid")).toBe("invalid");
        expect(formatLessonDate("2026-02-16", "en-GB")).toBe("16 February 2026");
        expect(parseIsoShortDate("2026-02-16")?.toISOString()).toBe("2026-02-16T00:00:00.000Z");
        expect(parseIsoShortDate("2026-02-31")).toBeUndefined();
    });
});
