import { describe, expect, test } from "vitest";
import { courseStructure } from "~/data/course-structure";
import { getLessonMetadataDataset } from "~/utils/lesson-metadata";
import { buildLessonPageRegistry, getLessonPageRegistry } from "../lesson-page-registry";
import {
    assertValidPdfLessonExportManifest,
    buildPdfLessonExportEntries,
    getPdfLessonExportEntries,
    getPdfLessonExportManifest,
} from "../lesson-export-manifest";

describe("given the PDF lesson export manifest", () => {
    test("then courseStructure lessons are exported in stable order", () => {
        const manifestEntries = getPdfLessonExportEntries();

        expect(manifestEntries.length).toBeGreaterThan(0);
        expect(manifestEntries[0]?.route).toBe("/notes/");
        expect(manifestEntries.map((entry) => entry.route)).toEqual(
            [...manifestEntries].map((entry) => entry.route),
        );
    });

    test("then exported entries derive routes and output paths through the package API", () => {
        const entry = getPdfLessonExportEntries().find((candidate) => candidate.route === "/notes/installation/");

        expect(entry).toMatchObject({
            route: "/notes/installation/",
            exportRoute: "/exports/pdf/notes/installation/",
            outputPath: "notes/installation/index.pdf",
            sourceFile: "src/pages/notes/installation.astro",
        });
    });

    test("then missing generated metadata is preserved as a warning", () => {
        const registry = getLessonPageRegistry();
        const dataset = {
            ...getLessonMetadataDataset(),
            entries: Object.fromEntries(
                Object.entries(getLessonMetadataDataset().entries).filter(([route]) => route !== "/notes/installation/"),
            ),
        };

        const entries = buildPdfLessonExportEntries(courseStructure, dataset, registry);
        const installation = entries.find((entry) => entry.route === "/notes/installation/");

        expect(installation?.findings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    kind: "missing-generated-metadata",
                    severity: "warning",
                }),
            ]),
        );
    });

    test("then a valid manifest passes assertion checks", () => {
        expect(() => assertValidPdfLessonExportManifest(getPdfLessonExportManifest())).not.toThrow();
    });

    test("then invalid manifests fail with errors only", () => {
        expect(() => assertValidPdfLessonExportManifest({
            generatedAt: "not-a-date",
            entries: [],
        })).toThrow(/PDF lesson export manifest is invalid/u);
    });

    test("then skipped non-note lessons never enter the manifest", () => {
        const registry = buildLessonPageRegistry({
            "../../pages/notes/foo.astro": { default: {} },
        });

        const entries = buildPdfLessonExportEntries(
            [
                {
                    kind: "link",
                    id: "external",
                    title: "External",
                    href: "/docs/external/",
                },
                {
                    kind: "link",
                    id: "internal",
                    title: "Internal",
                    href: "/notes/foo/",
                },
            ],
            getLessonMetadataDataset(),
            registry,
        );

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            route: "/notes/foo/",
            exportRoute: "/exports/pdf/notes/foo/",
            outputPath: "notes/foo/index.pdf",
        });
    });
});
