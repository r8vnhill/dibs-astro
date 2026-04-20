/**
 * @file lesson-metadata.test.ts
 *
 * Tests for the lesson metadata access layer.
 *
 * This suite validates the public API exported by `{ts} lesson-metadata.ts`:
 *
 * - {@link resolveLessonMetadata}: resolves a metadata entry by pathname/URL.
 * - {@link parseLessonMetadataDataset}: runtime-validates dataset shapes (Zod boundary).
 * - {@link getLessonMetadataDataset}: loads and caches the validated generated dataset.
 *
 * ## The tests combine:
 *
 * - **DDT** via `{ts} test.each` for dataset lookup and validation edge cases.
 * - **PBT** via `{ts} fast-check` for lookup invariants over known normalized keys.
 *
 * ## Notes on caching
 *
 * `getLessonMetadataDataset()` caches the parsed dataset for performance. This means tests must
 * reset the cache to avoid order dependence. The module provides
 * {@link __resetLessonMetadataCache} as a test-only helper to ensure repeatable behavior.
 */
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
    __resetLessonMetadataCache,
    getLessonMetadataDataset,
    type LessonMetadataDataset,
    parseLessonMetadataDataset,
    resolveLessonMetadata,
} from "../lesson-metadata";

/**
 * A representative lesson route used across resolution tests.
 *
 * Routes stored in the dataset are normalized to:
 *
 * - start with `/`
 * - end with `/`
 */
const SAMPLE_ROUTE = "/notes/scripting/first-script/";

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
            sourceFile: "src/pages/notes/scripting/first-script/index.astro",
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

describe("dataset resolution", () => {
    /**
     * Resolution should succeed across common pathname variants:
     *
     * - missing trailing slash
     * - repeated slashes
     * - full URL input
     */
    test.each([
        "/notes/scripting/first-script",
        "/notes//scripting///first-script/",
        "https://dibs.ravenhill.cl/notes/scripting/first-script",
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
