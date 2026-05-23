import { describe, expect, test } from "vitest";
import {
    deriveExportRoute,
    derivePdfOutputPath,
    filterManifest,
    type LessonExportManifest,
    normalizeLessonRoute,
} from "../src";

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

const createManifest = () =>
    ({
        generatedAt: "2026-05-10T00:00:00.000Z",
        entries: [
            createEntry("/notes/a/", "A"),
            createEntry("/notes/software-libraries/b/", "B"),
            createEntry("/notes/software-libraries/c/", "C"),
        ],
    }) satisfies LessonExportManifest;

const routesOf = (manifest: LessonExportManifest) => manifest.entries.map((entry) => entry.route);

describe("given manifest filtering", () => {
    test("then all returns every entry in original order in a new manifest object", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "all" });

        expect(filtered).not.toBe(manifest);
        expect(filtered.entries).not.toBe(manifest.entries);
        expect(routesOf(filtered)).toEqual(routesOf(manifest));
        expect(filtered.entries).toEqual(manifest.entries);
    });

    test("then all preserves manifest metadata while copying the wrapper", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "all" });

        expect(filtered).not.toBe(manifest);
        expect(filtered.entries).not.toBe(manifest.entries);
        expect(filtered.generatedAt).toBe(manifest.generatedAt);
        expect(filtered.entries).toEqual(manifest.entries);
    });

    test("then exact route matching normalizes filter input", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "exact-route", route: "notes/a" });

        expect(routesOf(filtered)).toEqual(["/notes/a/"]);
    });

    test("then exact route matching returns an empty copied manifest when no entry matches", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "exact-route", route: "/notes/missing/" });

        expect(filtered).not.toBe(manifest);
        expect(filtered.entries).not.toBe(manifest.entries);
        expect(filtered.generatedAt).toBe(manifest.generatedAt);
        expect(filtered.entries).toEqual([]);
    });

    test("then subtree matching preserves original order", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "subtree", routePrefix: "/notes/software-libraries" });

        expect(routesOf(filtered)).toEqual([
            "/notes/software-libraries/b/",
            "/notes/software-libraries/c/",
        ]);
    });

    test("then subtree matching returns an empty copied manifest when no entry matches", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "subtree", routePrefix: "/notes/missing" });

        expect(filtered).not.toBe(manifest);
        expect(filtered.entries).not.toBe(manifest.entries);
        expect(filtered.generatedAt).toBe(manifest.generatedAt);
        expect(filtered.entries).toEqual([]);
    });

    test("then filtered entries are asserted by value instead of object identity", () => {
        const manifest = createManifest();
        const expectedEntries = [createEntry("/notes/a/", "A")];

        const filtered = filterManifest(manifest, { kind: "exact-route", route: "/notes/a/" });

        expect(filtered.entries).toEqual(expectedEntries);
    });
});
