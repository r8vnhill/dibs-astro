import {
    deriveExportRoute,
    derivePdfOutputPath,
    type LessonExportManifest,
    normalizeLessonRoute,
} from "@ravenhill/lesson-export-core";
import { describe, expect, test } from "vitest";
import { parseCliArgs, resolveExportTargets, selectExportEntries } from "../../lib/pdf-export/cli.mjs";

function createEntry(route: string, title: string) {
    return {
        route: normalizeLessonRoute(route),
        exportRoute: deriveExportRoute(route),
        title,
        sourceFile: `src/pages${
            route === "/notes/build-systems/" ? "/notes/build-systems/index.astro" : route.slice(0, -1)
        }.astro`,
        outputPath: derivePdfOutputPath(route),
    } satisfies LessonExportManifest["entries"][number];
}

const parserManifest: LessonExportManifest = {
    generatedAt: "2026-05-11T00:00:00.000Z",
    entries: [
        createEntry("/notes/a/", "A"),
        createEntry("/notes/software-libraries/b/", "B"),
    ],
};

function createSelectionManifestFixture(): LessonExportManifest {
    return {
        generatedAt: "2026-05-11T00:00:00.000Z",
        entries: [
            createEntry("/notes/build-systems/", "Build Systems"),
            createEntry("/notes/software-libraries/", "Software Libraries"),
            createEntry("/notes/software-libraries/testing/", "Testing"),
            createEntry("/notes/software-libraries/api-design/", "API Design"),
            createEntry("/notes/software-libraries-extra/", "Software Libraries Extra"),
        ],
    };
}

describe("given the PDF export CLI parser", () => {
    test("then all selection uses current default options", () => {
        const parsed = parseCliArgs(["--all"]);

        expect(parsed).toMatchObject({
            selection: { kind: "all" },
            outDir: "dist/exports/pdf",
            reportPath: "dist/exports/pdf/report.json",
            port: 4321,
            skipBuild: false,
            keepServer: false,
            findingPolicy: { failOn: [] },
            timeoutMs: 30_000,
            dryRun: false,
        });
        expect(parsed.baseUrl).toBeUndefined();
    });

    test("then route selection is parsed and normalized", () => {
        const parsed = parseCliArgs(["--route", "notes/a", "--dry-run"]);

        expect(parsed.selection).toEqual({ kind: "route", value: "/notes/a/" });
        expect(parsed.dryRun).toBe(true);
    });

    test("then subtree selection is parsed and normalized", () => {
        const parsed = parseCliArgs(["--subtree=/notes/software-libraries"]);

        expect(parsed.selection).toEqual({ kind: "subtree", value: "/notes/software-libraries/" });
    });

    test("then existing execution flags and path options are parsed", () => {
        const parsed = parseCliArgs([
            "--all",
            "--outDir",
            "tmp\\pdf",
            "--report=tmp\\pdf\\report.json",
            "--baseUrl",
            "http://127.0.0.1:5000/site/",
            "--port",
            "5000",
            "--skip-build",
            "--keep-server",
            "--fail-on",
            "hidden-content",
            "--timeout=45000",
        ]);

        expect(parsed).toMatchObject({
            selection: { kind: "all" },
            outDir: "tmp/pdf",
            reportPath: "tmp/pdf/report.json",
            baseUrl: "http://127.0.0.1:5000/site/",
            port: 5000,
            skipBuild: true,
            keepServer: true,
            findingPolicy: { failOn: ["hidden-content"] },
            timeoutMs: 45_000,
        });
    });

    test("then targeted finding policy is parsed and normalized", () => {
        expect(parseCliArgs(["--all", "--fail-on", "unresolved-todo"])).toMatchObject({
            findingPolicy: { failOn: ["unresolved-todo"] },
        });
        expect(parseCliArgs(["--all", "--fail-on=hidden-content"])).toMatchObject({
            findingPolicy: { failOn: ["hidden-content"] },
        });
        expect(parseCliArgs([
            "--all",
            "--fail-on",
            "hidden-content",
            "--fail-on",
            "unresolved-todo",
        ])).toMatchObject({
            findingPolicy: { failOn: ["hidden-content", "unresolved-todo"] },
        });
    });

    test("then targeted finding policy deduplicates normalized aliases", () => {
        expect(parseCliArgs([
            "--all",
            "--fail-on",
            "client-only",
            "--fail-on",
            "client-only-island",
        ])).toMatchObject({
            findingPolicy: { failOn: ["client-only-island"] },
        });
    });

    test("then invalid targeted finding policy fails fast", () => {
        expect(() => parseCliArgs(["--all", "--fail-on"])).toThrow(/Missing value for --fail-on/u);
        expect(() => parseCliArgs(["--all", "--fail-on", "unknown"])).toThrow(
            /Invalid finding kind for --fail-on: unknown/u,
        );
    });

    test("then invalid flag combinations fail fast", () => {
        expect(() => parseCliArgs(["--route", "/notes/a/", "--all"])).toThrow(
            /Exactly one of --route, --subtree, or --all must be provided/u,
        );
        expect(() => parseCliArgs(["--subtree", "/notes/a/", "--all"])).toThrow(
            /Exactly one of --route, --subtree, or --all must be provided/u,
        );
        expect(() => parseCliArgs(["--route", "/notes/a/", "--subtree", "/notes/b/"])).toThrow(
            /Exactly one of --route, --subtree, or --all must be provided/u,
        );
        expect(() => parseCliArgs(["--all"])).not.toThrow();
        expect(() => parseCliArgs([])).toThrow(/Exactly one of --route, --subtree, or --all must be provided/u);
    });

    test("then current parser rejects missing values, unknown flags, invalid numbers, and unsafe relative paths", () => {
        expect(() => parseCliArgs(["--route"])).toThrow(/Missing value for --route/u);
        expect(() => parseCliArgs(["--all", "--unknown"])).toThrow(/Unknown flag: --unknown/u);
        expect(() => parseCliArgs(["--all", "--fail-on-finding"])).toThrow(/Unknown flag: --fail-on-finding/u);
        expect(() => parseCliArgs(["--all", "--timeout", "0"])).toThrow(/Invalid numeric value for --timeout/u);
        expect(() => parseCliArgs(["--all", "--outDir", "../pdf"])).toThrow(/Path must be relative/u);
        expect(() => parseCliArgs(["--all", "--report", "C:\\tmp\\report.json"])).toThrow(/Path must be relative/u);
    });
});

describe("given a lesson export manifest", () => {
    test("then the selection fixture contains already exportable PDF entries", () => {
        const manifest = createSelectionManifestFixture();

        expect(manifest.entries.length).toBeGreaterThan(0);
        for (const entry of manifest.entries) {
            expect(entry.route).toMatch(/^\/notes\//u);
            expect(entry.exportRoute).toMatch(/^\/exports\/pdf\/notes\//u);
            expect(entry.outputPath).toMatch(/\.pdf$/u);
        }
    });

    test("then valid all selection returns every entry from an already exportable manifest in manifest order", () => {
        const manifest = createSelectionManifestFixture();
        const originalManifest = structuredClone(manifest);

        const selected = selectExportEntries(manifest, { kind: "all" });

        expect(selected.map((entry) => entry.route)).toEqual([
            "/notes/build-systems/",
            "/notes/software-libraries/",
            "/notes/software-libraries/testing/",
            "/notes/software-libraries/api-design/",
            "/notes/software-libraries-extra/",
        ]);
        expect(selected).not.toBe(manifest.entries);
        expect(manifest).toEqual(originalManifest);
    });

    test("then route selection returns one matching entry", () => {
        const manifest = createSelectionManifestFixture();

        const selected = selectExportEntries(manifest, {
            kind: "route",
            value: "/notes/software-libraries/testing/",
        });

        expect(selected).toHaveLength(1);
        expect(selected).not.toBe(manifest.entries);
        expect(selected[0]?.route).toBe("/notes/software-libraries/testing/");
        expect(manifest.entries.map((entry) => entry.route)).toEqual([
            "/notes/build-systems/",
            "/notes/software-libraries/",
            "/notes/software-libraries/testing/",
            "/notes/software-libraries/api-design/",
            "/notes/software-libraries-extra/",
        ]);
    });

    test("then subtree selection preserves manifest order", () => {
        const manifest = createSelectionManifestFixture();

        const selected = selectExportEntries(manifest, {
            kind: "subtree",
            value: "/notes/software-libraries/",
        });

        expect(selected.map((entry) => entry.route)).toEqual([
            "/notes/software-libraries/",
            "/notes/software-libraries/testing/",
            "/notes/software-libraries/api-design/",
        ]);
        expect(selected.map((entry) => entry.route)).not.toContain("/notes/software-libraries-extra/");
        expect(selected).not.toBe(manifest.entries);
    });

    test("then all selection preserves current manifest order", () => {
        const selected = selectExportEntries(parserManifest, { kind: "all" });

        expect(selected.map((entry) => entry.route)).toEqual([
            "/notes/a/",
            "/notes/software-libraries/b/",
        ]);
    });

    test("then missing route and subtree selections fail with current messages", () => {
        const manifest = createSelectionManifestFixture();

        expect(() => selectExportEntries(manifest, { kind: "route", value: "/notes/missing/" })).toThrow(
            /No export entry found for \/notes\/missing\//u,
        );
        expect(() => selectExportEntries(manifest, { kind: "subtree", value: "/notes/missing/" })).toThrow(
            /No export entries found under \/notes\/missing\//u,
        );
    });

    test("then similarly named siblings do not rescue missing subtree requests", () => {
        const manifest = createSelectionManifestFixture();

        expect(() =>
            selectExportEntries(manifest, {
                kind: "subtree",
                value: "/notes/software-libraries-ex/",
            })
        ).toThrow(/\/notes\/software-libraries-ex\//u);
    });

    test("then failed selection does not mutate the manifest", () => {
        const manifest = createSelectionManifestFixture();
        const originalManifest = structuredClone(manifest);

        expect(() =>
            selectExportEntries(manifest, {
                kind: "route",
                value: "/notes/missing/",
            })
        ).toThrow(/\/notes\/missing\//u);

        expect(manifest).toEqual(originalManifest);
    });

    test("then output targets derive from the requested export root", () => {
        const targets = resolveExportTargets(parserManifest.entries, "dist/exports/pdf");

        expect(targets[0]?.outputPath).toBe("dist/exports/pdf/notes/a/index.pdf");
        expect(targets[1]?.outputPath).toBe("dist/exports/pdf/notes/software-libraries/b.pdf");
    });

    test("then unit index routes keep the current index.pdf mapping", () => {
        const targets = resolveExportTargets([
            {
                route: normalizeLessonRoute("/notes/software-libraries/"),
                exportRoute: deriveExportRoute("/notes/software-libraries/"),
                title: "Software Libraries",
                sourceFile: "src/pages/notes/software-libraries/index.astro",
                outputPath: derivePdfOutputPath("/notes/software-libraries/"),
            },
        ], "dist/exports/pdf");

        expect(targets[0]?.outputPath).toBe("dist/exports/pdf/notes/software-libraries/index.pdf");
    });
});
