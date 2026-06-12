import { describe, expect, test } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import * as api from "../src";
import type {
    BookExportFinding,
    BookExportLessonEntry,
    BookExportPlan,
    BookExportTarget,
    PlanBookExportsOptions,
} from "../src";

describe("given the root package API", () => {
    test("then expected runtime exports are available", () => {
        expect(api.LESSON_EXPORT_CORE_PACKAGE_NAME).toBe("@ravenhill/lesson-export-core");
        expect(api.LESSON_EXPORT_CORE_VERSION).toBe(packageJson.version);
        expect(typeof api.normalizeLessonRoute).toBe("function");
        expect(typeof api.deriveExportRoute).toBe("function");
        expect(typeof api.derivePdfOutputPath).toBe("function");
        expect(typeof api.filterManifest).toBe("function");
        expect(typeof api.validateManifest).toBe("function");
        expect(Array.isArray(api.exportFindingKinds)).toBe(true);
        expect(typeof api.isExportFindingKind).toBe("function");
        expect(typeof api.normalizeExportFindingKind).toBe("function");
        expect(typeof api.countEntriesByStatus).toBe("function");
        expect(typeof api.countFindingsByKind).toBe("function");
        expect(typeof api.countFailuresByKind).toBe("function");
        expect(typeof api.buildExportSummary).toBe("function");
        expect(typeof api.hasFatalExportFindings).toBe("function");
        expect(typeof api.planBookExports).toBe("function");
    });

    test("then package metadata exposes only the root subpath", () => {
        expect(Object.keys(packageJson.exports)).toEqual(["."]);
    });

    test("then public book planning types resolve from the package root", () => {
        const finding: BookExportFinding = {
            code: "missing-input",
            severity: "warning",
            message: "Missing lesson input.",
        };
        const lesson: BookExportLessonEntry = {
            id: "bag-end",
            title: "Bag End",
            route: "/notes/bag-end/",
            pdfPath: "dist/pdf/notes/bag-end.pdf",
        };
        const target: BookExportTarget = {
            id: "full-course",
            title: "There and Back Again",
            kind: "full-course",
            outputPath: "dist/pdf/books/full-course.pdf",
            lessons: [lesson],
            findings: [finding],
        };
        const plan: BookExportPlan = {
            targets: [target],
            findings: [finding],
        };
        const options: PlanBookExportsOptions = {
            course: [],
            manifest: {
                generatedAt: "2026-06-12T00:00:00.000Z",
                entries: [],
            },
            outDir: "dist/pdf",
            availablePdfPaths: new Set(),
        };

        expect(plan.targets[0]?.lessons[0]?.id).toBe("bag-end");
        expect(api.planBookExports(options)).toEqual({ targets: [], findings: [] });
    });
});
