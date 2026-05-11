import { describe, expect, test } from "vitest";
import {
    detectDuplicateExportRoutes,
    detectDuplicateOutputPaths,
    detectDuplicateRoutes,
    detectUnsafeOutputPaths,
    type LessonExportEntry,
    validateManifest,
} from "../src";

const validEntry: LessonExportEntry = {
    route: "/notes/software-libraries/foo/",
    exportRoute: "/exports/pdf/notes/software-libraries/foo/",
    title: "Foo",
    sourceFile: "src/pages/notes/software-libraries/foo.astro",
    outputPath: "notes/software-libraries/foo.pdf",
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
                    route: "/tutorials/foo/",
                    title: " ",
                    sourceFile: "",
                    outputPath: "../notes/foo.pdf",
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
            { ...validEntry, route: "notes/software-libraries/foo" },
        ]);

        expect(findings).toHaveLength(2);
        expect(findings.every((finding) => finding.kind === "duplicate-route")).toBe(true);
        expect(findings.every((finding) => finding.value === "/notes/software-libraries/foo/")).toBe(true);
    });

    test("then duplicate export routes are reported separately", () => {
        const findings = detectDuplicateExportRoutes([
            validEntry,
            { ...validEntry, route: "/notes/software-libraries/bar/" },
        ]);

        expect(findings).toHaveLength(2);
        expect(findings.every((finding) => finding.kind === "duplicate-export-route")).toBe(true);
    });

    test("then duplicate output paths are reported separately", () => {
        const findings = detectDuplicateOutputPaths([
            validEntry,
            { ...validEntry, route: "/notes/software-libraries/bar/" },
        ]);

        expect(findings).toHaveLength(2);
        expect(findings.every((finding) => finding.kind === "duplicate-output-path")).toBe(true);
    });

    test("then unsafe output paths are reported", () => {
        const findings = detectUnsafeOutputPaths([
            { ...validEntry, outputPath: "notes/foo.html" },
        ]);

        expect(findings).toHaveLength(1);
        expect(findings[0]?.kind).toBe("unsafe-output-path");
    });
});
