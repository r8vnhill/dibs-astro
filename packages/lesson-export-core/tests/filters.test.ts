/**
 * @file Contract tests for manifest filtering.
 *
 * These tests pin the public projection behavior of `filterManifest`:
 *
 * - filter inputs are normalized before matching;
 * - returned manifests preserve manifest-level metadata;
 * - returned manifests and entry arrays are copied;
 * - subtree filters match descendants, not the subtree root itself;
 * - similarly named sibling prefixes are excluded.
 */
import { describe, expect, test } from "vitest";
import {
    deriveExportRoute,
    derivePdfOutputPath,
    filterManifest,
    type LessonExportManifest,
    normalizeLessonRoute,
} from "../src";

/**
 * Builds a manifest entry through the public route helpers.
 *
 * Keeping fixture construction on the same public helpers used by production code prevents tests from depending on 
 * hand-written canonical paths.
 */
const createEntry = (
    route: string,
    title: string,
    sourceFile = `src/pages${route.slice(0, -1)}.astro`,
) => ({
    route: normalizeLessonRoute(route),
    exportRoute: deriveExportRoute(route),
    title,
    sourceFile,
    outputPath: derivePdfOutputPath(route),
});

/**
 * Creates a fresh manifest fixture for each test.
 *
 * The fixture intentionally includes one unrelated lesson and two lessons in the same subtree so tests can assert 
 * exact-route and subtree projections without sharing mutable state across cases.
 */
const createManifest = () =>
    ({
        generatedAt: "2026-05-10T00:00:00.000Z",
        entries: [
            createEntry("/notes/a/", "A"),
            createEntry("/notes/software-libraries/b/", "B"),
            createEntry("/notes/software-libraries/c/", "C"),
        ],
    }) satisfies LessonExportManifest;

/**
 * Returns manifest routes in entry order.
 *
 * Most assertions care about the public route projection rather than the full manifest entry shape, so this keeps 
 * tests focused on observable behavior.
 */
const routesOf = (manifest: LessonExportManifest) => manifest.entries.map((entry) => entry.route);

/**
 * Asserts the common manifest projection contract.
 *
 * Filtering must preserve manifest-level metadata while returning fresh wrapper objects so consumers can treat the 
 * result as an independent projection.
 */
const expectCopiedManifest = (
    filtered: LessonExportManifest,
    manifest: LessonExportManifest,
): void => {
    expect(filtered).not.toBe(manifest);
    expect(filtered.entries).not.toBe(manifest.entries);
    expect(filtered.generatedAt).toBe(manifest.generatedAt);
};

describe("given manifest filtering", () => {
    test("then all returns every entry in original order in a new manifest object", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "all" });

        expectCopiedManifest(filtered, manifest);
        expect(routesOf(filtered)).toEqual(routesOf(manifest));
        expect(filtered.entries).toEqual(manifest.entries);
    });

    test("then all preserves manifest metadata while copying the wrapper", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "all" });

        expectCopiedManifest(filtered, manifest);
        expect(filtered.entries).toEqual(manifest.entries);
    });

    test.each([
        { label: "bare path", route: "notes/a" },
        { label: "leading slash", route: "/notes/a" },
        { label: "trailing slash", route: "notes/a/" },
        { label: "leading and trailing slash", route: "/notes/a/" },
    ])("then exact route matching normalizes a $label", ({ route }) => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, {
            kind: "exact-route",
            route,
        });

        expect(routesOf(filtered)).toEqual(["/notes/a/"]);
    });

    test("then exact route matching returns an empty copied manifest when no entry matches", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, {
            kind: "exact-route",
            route: "/notes/missing/",
        });

        expectCopiedManifest(filtered, manifest);
        expect(filtered.entries).toEqual([]);
    });

    test.each([
        { label: "bare path", routePrefix: "notes/software-libraries" },
        { label: "leading slash", routePrefix: "/notes/software-libraries" },
        { label: "trailing slash", routePrefix: "notes/software-libraries/" },
        {
            label: "leading and trailing slash",
            routePrefix: "/notes/software-libraries/",
        },
    ])("then subtree matching normalizes a $label prefix", ({ routePrefix }) => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, {
            kind: "subtree",
            routePrefix,
        });

        expect(routesOf(filtered)).toEqual([
            "/notes/software-libraries/b/",
            "/notes/software-libraries/c/",
        ]);
    });

    test("then subtree matching excludes the exact subtree root", () => {
        const manifest = {
            ...createManifest(),
            entries: [
                createEntry("/notes/software-libraries/", "Ozzmosis"),
                createEntry(
                    "/notes/software-libraries/diary-of-a-madman/",
                    "Diary of a Madman",
                ),
                createEntry(
                    "/notes/software-libraries/no-more-tears/",
                    "No More Tears",
                ),
            ],
        } satisfies LessonExportManifest;

        const filtered = filterManifest(manifest, {
            kind: "subtree",
            routePrefix: "/notes/software-libraries",
        });

        expect(routesOf(filtered)).toEqual([
            "/notes/software-libraries/diary-of-a-madman/",
            "/notes/software-libraries/no-more-tears/",
        ]);
    });

    test("then subtree matching returns empty entries when only the subtree root matches", () => {
        const manifest = {
            ...createManifest(),
            entries: [createEntry("/notes/software-libraries/", "Ozzmosis")],
        } satisfies LessonExportManifest;

        const filtered = filterManifest(manifest, {
            kind: "subtree",
            routePrefix: "/notes/software-libraries",
        });

        expect(routesOf(filtered)).toEqual([]);
    });

    test("then subtree matching excludes similarly named sibling prefixes", () => {
        const manifest = {
            ...createManifest(),
            entries: [
                createEntry(
                    "/notes/software-libraries/diary-of-a-madman/",
                    "Diary of a Madman",
                ),
                createEntry(
                    "/notes/software-libraries-advanced/bark-at-the-moon/",
                    "Bark at the Moon",
                ),
            ],
        } satisfies LessonExportManifest;

        const filtered = filterManifest(manifest, {
            kind: "subtree",
            routePrefix: "/notes/software-libraries",
        });

        expect(routesOf(filtered)).toEqual([
            "/notes/software-libraries/diary-of-a-madman/",
        ]);
    });

    test("then subtree matching returns an empty copied manifest when no entry matches", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, {
            kind: "subtree",
            routePrefix: "/notes/missing",
        });

        expectCopiedManifest(filtered, manifest);
        expect(filtered.entries).toEqual([]);
    });

    test("then filtered entries are asserted by value instead of object identity", () => {
        const manifest = createManifest();
        const expectedEntries = [createEntry("/notes/a/", "A")];

        const filtered = filterManifest(manifest, {
            kind: "exact-route",
            route: "/notes/a/",
        });

        expect(filtered.entries).toEqual(expectedEntries);
    });
});
