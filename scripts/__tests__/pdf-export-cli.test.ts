import { describe, expect, test } from "vitest";
import { deriveExportRoute, derivePdfOutputPath, normalizeLessonRoute, type LessonExportManifest } from "@ravenhill/lesson-export-core";
import { parseCliArgs, resolveExportTargets, selectExportEntries } from "../lib/pdf-export-cli.mjs";

const manifest: LessonExportManifest = {
    generatedAt: "2026-05-11T00:00:00.000Z",
    entries: [
        {
            route: normalizeLessonRoute("/notes/a/"),
            exportRoute: deriveExportRoute("/notes/a/"),
            title: "A",
            sourceFile: "src/pages/notes/a.astro",
            outputPath: derivePdfOutputPath("/notes/a/"),
        },
        {
            route: normalizeLessonRoute("/notes/software-libraries/b/"),
            exportRoute: deriveExportRoute("/notes/software-libraries/b/"),
            title: "B",
            sourceFile: "src/pages/notes/software-libraries/b.astro",
            outputPath: derivePdfOutputPath("/notes/software-libraries/b/"),
        },
    ],
};

describe("given the PDF export CLI parser", () => {
    test("then route selection is parsed and normalized", () => {
        const parsed = parseCliArgs(["--route", "notes/a", "--dry-run"]);

        expect(parsed.selection).toEqual({ kind: "route", value: "/notes/a/" });
        expect(parsed.dryRun).toBe(true);
    });

    test("then invalid flag combinations fail fast", () => {
        expect(() => parseCliArgs(["--route", "/notes/a/", "--all"])).toThrow(/Exactly one of --route, --subtree, or --all must be provided/u);
        expect(() => parseCliArgs(["--all"])).not.toThrow();
        expect(() => parseCliArgs([])).toThrow(/Exactly one of --route, --subtree, or --all must be provided/u);
    });
});

describe("given a lesson export manifest", () => {
    test("then route selection returns one matching entry", () => {
        const selected = selectExportEntries(manifest, { kind: "route", value: "/notes/a/" });

        expect(selected).toHaveLength(1);
        expect(selected[0]?.route).toBe("/notes/a/");
    });

    test("then subtree selection preserves manifest order", () => {
        const selected = selectExportEntries(manifest, { kind: "subtree", value: "/notes/software-libraries/" });

        expect(selected.map((entry) => entry.route)).toEqual(["/notes/software-libraries/b/"]);
    });

    test("then output targets derive from the requested export root", () => {
        const targets = resolveExportTargets(manifest.entries, "dist/exports/pdf");

        expect(targets[0]?.outputPath).toBe("dist/exports/pdf/notes/a/index.pdf");
    });
});