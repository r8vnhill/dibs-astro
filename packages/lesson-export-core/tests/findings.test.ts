import { describe, expect, test } from "vitest";
import { createExportFinding, exportFindingKinds, isExportFindingKind, normalizeExportFindingKind } from "../src";

describe("given canonical export finding kinds", () => {
    test("then every canonical finding kind is accepted", () => {
        expect(exportFindingKinds.every((kind) => isExportFindingKind(kind))).toBe(true);
    });

    test("then the registry does not contain duplicate values", () => {
        expect(new Set(exportFindingKinds).size).toBe(exportFindingKinds.length);
    });

    test.each([
        "client-only",
        "unknown",
        "",
        " ",
        42,
        undefined,
        null,
    ])("then %s is not canonical", (value) => {
        expect(isExportFindingKind(value)).toBe(false);
    });

    test("then canonical values normalise to themselves", () => {
        expect(normalizeExportFindingKind("hidden-content")).toBe("hidden-content");
        expect(normalizeExportFindingKind("pdf-generation-failed")).toBe("pdf-generation-failed");
    });

    test("then the legacy client-only marker normalises to client-only-island", () => {
        expect(normalizeExportFindingKind("client-only")).toBe("client-only-island");
    });

    test.each([
        "unknown",
        "",
        " ",
        42,
        undefined,
        null,
    ])("then %s normalises to undefined", (value) => {
        expect(normalizeExportFindingKind(value)).toBeUndefined();
    });

    test("then createExportFinding accepts Phase 8 finding kinds", () => {
        expect(createExportFinding({
            kind: "unresolved-todo",
            severity: "warning",
            message: "An unresolved TODO was found in export HTML.",
        })).toEqual({
            kind: "unresolved-todo",
            severity: "warning",
            message: "An unresolved TODO was found in export HTML.",
        });
    });
});
