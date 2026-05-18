import { describe, expect, test } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import * as api from "../src";

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
    });

    test("then package metadata exposes only the root subpath", () => {
        expect(Object.keys(packageJson.exports)).toEqual(["."]);
    });
});
