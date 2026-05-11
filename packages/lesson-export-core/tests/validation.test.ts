import { describe, expect, test } from "vitest";
import {
    deriveExportRoute,
    derivePdfOutputPath,
    detectDuplicateExportRoutes,
    detectDuplicateOutputPaths,
    detectDuplicateRoutes,
    detectUnsafeOutputPaths,
    type LessonExportEntry,
    normalizeLessonRoute,
    validateManifest,
} from "../src";

const validEntry: LessonExportEntry = {
    route: normalizeLessonRoute("/notes/software-libraries/foo/"),
    exportRoute: deriveExportRoute("/notes/software-libraries/foo/"),
    title: "Foo",
    sourceFile: "src/pages/notes/software-libraries/foo.astro",
    outputPath: derivePdfOutputPath("/notes/software-libraries/foo/"),
    lastModified: "2026-05-10T00:00:00.000Z",
    authors: ["Persona Autora"],
};

describe("given manifest validation", () => {
    test("then a valid manifest has no findings", () => {
        const result = validateManifest({
            generatedAt: "2026-05-10T00:00:00.000Z",
            entries: [validEntry],
        });

        expect(result.valid).toBe(true);
        expect(result.findings).toEqual([]);
    });

    test("then all manifest findings are returned together", () => {
        const result = validateManifest({
            generatedAt: "not-a-date",
            entries: [
                {
                    ...validEntry,
                    route: normalizeLessonRoute("/tutorials/foo/"),
                    title: " ",
                    sourceFile: "",
                    outputPath: "../notes/foo.pdf" as unknown as LessonExportEntry["outputPath"],
                    lastModified: "not-a-date",
                },
            ],
        });

        expect(result.valid).toBe(false);
        expect(result.findings.map((finding) => finding.kind)).toEqual([
            "invalid-generated-at",
            "missing-title",
            "missing-source-file",
            "unsupported-route",
            "invalid-last-modified",
            "unsafe-output-path",
        ]);
    });

    test("then duplicate route findings use normalized route values", () => {
        const findings = detectDuplicateRoutes([
            validEntry,
            { ...validEntry, route: normalizeLessonRoute("notes/software-libraries/foo") },
        ]);

        expect(findings).toHaveLength(2);
        expect(findings.every((finding) => finding.kind === "duplicate-route")).toBe(true);
        expect(findings.every((finding) => finding.value === "/notes/software-libraries/foo/")).toBe(true);
    });

    test("then generic route normalization stays separate from supported lesson route validation", () => {
        const route = normalizeLessonRoute("/custom/foo/");
        const result = validateManifest({
            generatedAt: "2026-05-10T00:00:00.000Z",
            entries: [
                {
                    route,
                    exportRoute: deriveExportRoute(route),
                    title: "Custom route",
                    sourceFile: "src/pages/custom/foo.astro",
                    outputPath: derivePdfOutputPath(route),
                },
            ],
        });

        expect(result.findings).toContainEqual(
            expect.objectContaining({
                kind: "unsupported-route",
                field: "route",
                value: "/custom/foo/",
            }),
        );
    });

    test("then duplicate export routes are reported separately", () => {
        const findings = detectDuplicateExportRoutes([
            validEntry,
            { ...validEntry, route: normalizeLessonRoute("/notes/software-libraries/bar/") },
        ]);

        expect(findings).toHaveLength(2);
        expect(findings.every((finding) => finding.kind === "duplicate-export-route")).toBe(true);
    });

    test("then duplicate output paths are reported separately", () => {
        const findings = detectDuplicateOutputPaths([
            validEntry,
            { ...validEntry, route: normalizeLessonRoute("/notes/software-libraries/bar/") },
        ]);

        expect(findings).toHaveLength(2);
        expect(findings.every((finding) => finding.kind === "duplicate-output-path")).toBe(true);
    });

    test("then unsafe output paths are reported", () => {
        const findings = detectUnsafeOutputPaths([
            { ...validEntry, outputPath: "notes/foo.html" as unknown as LessonExportEntry["outputPath"] },
        ]);

        expect(findings).toHaveLength(1);
        expect(findings[0]?.kind).toBe("unsafe-output-path");
    });
});
