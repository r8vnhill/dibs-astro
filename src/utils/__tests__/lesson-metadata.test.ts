/**
 * @file lesson-metadata.test.ts
 *
 * Tests for the lesson metadata access layer.
 *
 * This suite validates the public API exported by `{ts} lesson-metadata.ts`:
 *
 * - {@link normalizeLessonPathname}: canonicalizes pathnames/URLs to dataset route keys.
 * - {@link formatLessonDate}: formats ISO short dates for UI display.
 * - {@link resolveLessonMetadata}: resolves a metadata entry by pathname/URL.
 * - {@link parseLessonMetadataDataset}: runtime-validates dataset shapes (Zod boundary).
 * - {@link getLessonMetadataDataset}: loads and caches the validated generated dataset.
 *
 * ## The tests combine:
 *
 * - **DDT** via `{ts} test.each` for known examples and edge cases.
 * - **PBT** via `{ts} fast-check` for invariants that should hold across many inputs.
 *
 * ## Notes on caching
 *
 * `getLessonMetadataDataset()` caches the parsed dataset for performance. This means tests must
 * reset the cache to avoid order dependence. The module provides
 * {@link __resetLessonMetadataCache} as a test-only helper to ensure repeatable behavior.
 */
import fc from "fast-check";
import {
    __resetLessonMetadataCache,
    DEFAULT_LOCALE,
    formatLessonDate,
    getLessonMetadataDataset,
    type LessonMetadataDataset,
    normalizeLessonPathname,
    parseLessonMetadataDataset,
    resolveLessonMetadata,
    UNKNOWN_DATE_LABEL,
} from "../lesson-metadata";

/**
 * A representative lesson route used across resolution tests.
 *
 * Routes stored in the dataset are normalized to:
 *
 * - start with `/`
 * - end with `/`
 */
const SAMPLE_ROUTE = "/notes/software-libraries/scripting/first-script/";

/**
 * Creates a small in-memory dataset fixture.
 *
 * The fixture intentionally includes:
 *
 * - A root section entry (`/notes/`) with no changes.
 * - A sample lesson entry with one git change and `lastModified`.
 *
 * Keeping this local fixture avoids coupling most tests to the real generated JSON artifact.
 */
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
});

const dataset = makeDataset();

describe.concurrent("normalizeLessonPathname", () => {
    /**
     * Data-driven examples for normalization behavior.
     *
     * The normalizer accepts both:
     *
     * - raw path strings (`notes/a`, `/notes/a/`)
     * - full URLs (`https://dibs.../notes/a`)
     *
     * and always returns a canonical route ending in `/`.
     */
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
        expect(normalizeLessonPathname(input)).toBe(expected);
    });

    /**
     * Property: normalization is idempotent and enforces route invariants.
     *
     * ## Invariants:
     *
     * - `normalize(normalize(x)) === normalize(x)`
     * - output starts with `/`
     * - output ends with `/`
     * - output has no repeated slashes (`//`)
     */
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

    /**
     * Property: full URLs have their origin stripped.
     *
     * This ensures callers can pass `window.location.href`-like inputs without leaking hostnames
     * into lookup keys.
     */
    test("strips origin for generated http/https urls", () => {
        const hostArb = fc.stringMatching(/^[a-z0-9-]{1,12}(\.[a-z0-9-]{1,12})+$/);
        const tailArb = fc.stringMatching(/^[a-z0-9/-]{1,40}$/);
        const protocolArb = fc.constantFrom("http", "https", "HTTP", "HTTPS");

        fc.assert(
            fc.property(hostArb, tailArb, protocolArb, (host, tail, protocol) => {
                const withOrigin = `${protocol}://${host}/${tail}`;
                const normalized = normalizeLessonPathname(withOrigin);

                expect(normalized.startsWith("/")).toBe(true);
                expect(normalized.includes(host)).toBe(false);
            }),
        );
    });
});

describe.concurrent("formatLessonDate", () => {
    /**
     * Missing dates are mapped to a stable placeholder label.
     */
    test("returns placeholder for undefined", () => {
        expect(formatLessonDate(undefined)).toBe(UNKNOWN_DATE_LABEL);
    });

    /**
     * Default-locale formatting is validated with stable properties rather than exact string
     * matches, because month names can vary with runtime ICU data.
     */
    test("formats ISO short date in default locale with stable properties", () => {
        const formatted = formatLessonDate("2026-02-16", DEFAULT_LOCALE);
        expect(formatted.length).toBeGreaterThan(0);
        expect(formatted).toContain("2026");
    });

    /**
     * English formatting can be asserted exactly to ensure the formatting pipeline is
     * deterministic when the locale is controlled.
     *
     * If CI environments ever lack full ICU, consider loosening this assertion to stable
     * properties (as done for the default locale test).
     */
    test("formats ISO short date with deterministic en-GB output", () => {
        expect(formatLessonDate("2026-02-16", "en-GB")).toBe("16 February 2026");
    });

    /**
     * Invalid date strings are returned as-is.
     *
     * This preserves debuggability (the caller can see the original value) and avoids masking data
     * issues with misleading placeholders.
     */
    test("returns raw date when format is invalid", () => {
        expect(formatLessonDate("invalid")).toBe("invalid");
    });
});

describe.concurrent("dataset resolution", () => {
    /**
     * Resolution should succeed across common pathname variants:
     *
     * - missing trailing slash
     * - repeated slashes
     * - full URL input
     */
    test.each([
        "/notes/software-libraries/scripting/first-script",
        "/notes//software-libraries///scripting/first-script/",
        "https://dibs.ravenhill.cl/notes/software-libraries/scripting/first-script",
    ])("resolves metadata for matching path variants: %s", (input) => {
        const resolved = resolveLessonMetadata(input, dataset);
        expect(resolved?.lastModified).toBe("2026-02-11");
    });

    /**
     * Unknown routes should resolve to `undefined`.
     */
    test("returns undefined for unknown paths", () => {
        const resolved = resolveLessonMetadata("/notes/unknown/", dataset);
        expect(resolved).toBeUndefined();
    });

    /**
     * Runtime validation should accept a valid dataset fixture unchanged.
     *
     * This verifies the Zod boundary aligns with the TypeScript type.
     */
    test("parses valid dataset at runtime", () => {
        expect(parseLessonMetadataDataset(dataset)).toEqual(dataset);
    });

    /**
     * Runtime validation should fail for common schema violations.
     *
     * These tests ensure:
     *
     * - callers get actionable errors when the generated artifact shape drifts
     * - the Zod boundary is actually enforcing constraints (not just pass-through)
     */
    test.each([
        [{ ...dataset, entries: [] }, /Invalid input: expected record, received array/i],
        [
            {
                ...dataset,
                entries: {
                    "/notes/": { ...dataset.entries["/notes/"], sourceFile: undefined },
                },
            },
            /Invalid input: expected string, received undefined/i,
        ],
        [
            {
                ...dataset,
                entries: {
                    "/notes/": { ...dataset.entries["/notes/"], authors: "bad" },
                },
            },
            /Invalid input: expected array, received string/i,
        ],
    ])("fails for invalid dataset shape", (invalidDataset, expectedError) => {
        expect(() => parseLessonMetadataDataset(invalidDataset)).toThrow(expectedError);
    });

    /**
     * The dataset loader caches the validated dataset instance for performance.
     *
     * This test resets the module cache, then asserts that repeated calls return the exact same
     * object reference.
     */
    test("provides cached runtime dataset", () => {
        __resetLessonMetadataCache();

        const first = getLessonMetadataDataset();
        const second = getLessonMetadataDataset();

        expect(first).toBe(second);
    });

    /**
     * Property: known dataset keys resolve to the same entry across path variants.
     *
     * For each known route key in the fixture, we build a small set of equivalent path
     * representations and assert that all of them resolve to the same entry object reference.
     */
    test("lookup invariant: known keys resolve to same entry across path variants", () => {
        const knownRoutes = Object.keys(dataset.entries);

        fc.assert(
            fc.property(fc.constantFrom(...knownRoutes), (route) => {
                const base = route.endsWith("/") ? route.slice(0, -1) : route;

                const variants = [
                    base,
                    `${route}/`,
                    route.replaceAll("/", "//"),
                    `https://dibs.ravenhill.cl${base}`,
                ];

                for (const variant of variants) {
                    const resolved = resolveLessonMetadata(variant, dataset);
                    expect(resolved).toBe(dataset.entries[route]);
                }
            }),
        );
    });
});
