import { describe, expect, test } from "vitest";
import { filterManifest, type LessonExportManifest } from "../src";

const manifest: LessonExportManifest = {
    generatedAt: "2026-05-10T00:00:00.000Z",
    entries: [
        {
            route: "/notes/a/",
            exportRoute: "/exports/pdf/notes/a/",
            title: "A",
            sourceFile: "src/pages/notes/a.astro",
            outputPath: "notes/a.pdf",
        },
        {
            route: "/notes/software-libraries/b/",
            exportRoute: "/exports/pdf/notes/software-libraries/b/",
            title: "B",
            sourceFile: "src/pages/notes/software-libraries/b.astro",
            outputPath: "notes/software-libraries/b.pdf",
        },
        {
            route: "/notes/software-libraries/c/",
            exportRoute: "/exports/pdf/notes/software-libraries/c/",
            title: "C",
            sourceFile: "src/pages/notes/software-libraries/c.astro",
            outputPath: "notes/software-libraries/c.pdf",
        },
    ],
};

describe("given manifest filtering", () => {
    test("then all returns every entry in original order in a new manifest object", () => {
        const filtered = filterManifest(manifest, { kind: "all" });

        expect(filtered).not.toBe(manifest);
        expect(filtered.entries).not.toBe(manifest.entries);
        expect(filtered.entries.map((entry) => entry.route)).toEqual([
            "/notes/a/",
            "/notes/software-libraries/b/",
            "/notes/software-libraries/c/",
        ]);
        expect(filtered.entries[0]).toBe(manifest.entries[0]);
    });

    test("then exact route matching normalizes filter input", () => {
        const filtered = filterManifest(manifest, { kind: "exact-route", route: "notes/a" });

        expect(filtered.entries.map((entry) => entry.route)).toEqual(["/notes/a/"]);
    });

    test("then subtree matching preserves original order", () => {
        const filtered = filterManifest(manifest, { kind: "subtree", routePrefix: "/notes/software-libraries" });

        expect(filtered.entries.map((entry) => entry.route)).toEqual([
            "/notes/software-libraries/b/",
            "/notes/software-libraries/c/",
        ]);
    });
});
