import { describe, expect, test } from "vitest";
import {
    buildExportSummary,
    countEntriesByStatus,
    countFailuresByKind,
    countFindingsByKind,
    hasFatalExportFindings,
    type LessonExportReportEntryLike,
} from "../src";

describe("given export report entries", () => {
    test("then status counts include zero defaults", () => {
        expect(countEntriesByStatus([])).toEqual({
            exported: 0,
            failed: 0,
            skipped: 0,
        });
    });

    test("then status counts include exported, failed, and skipped entries", () => {
        expect(countEntriesByStatus([
            { status: "exported" },
            { status: "failed" },
            { status: "skipped" },
            { status: "exported" },
        ])).toEqual({
            exported: 2,
            failed: 1,
            skipped: 1,
        });
    });

    test("then empty report summaries keep the full zero-value contract", () => {
        expect(buildExportSummary([])).toEqual({
            selected: 0,
            exported: 0,
            failed: 0,
            skipped: 0,
            findings: 0,
            findingsByKind: {},
            failuresByKind: {},
        });
    });

    test("then findings are grouped by normalised kind and legacy code aliases", () => {
        expect(countFindingsByKind([
            {
                status: "exported",
                findings: [
                    { kind: "hidden-content" },
                    { code: "client-only" },
                    { kind: "client-only-island" },
                ],
            },
        ])).toEqual({
            "hidden-content": 1,
            "client-only-island": 2,
        });
    });

    test("then fatal policy can remain disabled", () => {
        expect(hasFatalExportFindings([
            {
                status: "exported",
                findings: [{ code: "hidden-content" }],
            },
        ], [])).toBe(false);
    });

    test("then fatal policy can treat any finding as blocking", () => {
        expect(hasFatalExportFindings([
            {
                status: "exported",
                findings: [{ code: "hidden-content" }],
            },
        ], "any")).toBe(true);
        expect(hasFatalExportFindings([
            {
                status: "exported",
                findings: [{ code: "unknown" }],
            },
        ], "any")).toBe(true);
        expect(hasFatalExportFindings([{ status: "exported" }], "any")).toBe(false);
    });

    test("then fatal policy matches normalized targeted kinds", () => {
        expect(hasFatalExportFindings([
            {
                status: "exported",
                findings: [{ code: "client-only" }],
            },
        ], ["client-only-island"])).toBe(true);
        expect(hasFatalExportFindings([
            {
                status: "exported",
                findings: [{ code: "client-only" }],
            },
        ], ["client-only"])).toBe(true);
        expect(hasFatalExportFindings([
            {
                status: "exported",
                findings: [{ code: "hidden-content" }],
            },
        ], ["some-targeted-kind"])).toBe(false);
    });

    test("then unknown and malformed finding kinds are ignored", () => {
        expect(countFindingsByKind([
            {
                status: "exported",
                findings: [
                    { kind: "unknown" },
                    { kind: "" },
                    { kind: 42 },
                ],
            },
        ])).toEqual({});
    });

    test("then failures are grouped by recognised error kind", () => {
        expect(countFailuresByKind([
            { status: "failed", error: { kind: "pdf-generation-failed" } },
            { status: "failed", error: { kind: "pdf-generation-failed" } },
            { status: "failed", error: { kind: "unknown" } },
            { status: "failed" },
        ])).toEqual({
            "pdf-generation-failed": 2,
        });
    });

    test("then a mixed report summary contains additive counts without mutating entries", () => {
        const entries: readonly LessonExportReportEntryLike[] = Object.freeze([
            Object.freeze({ status: "exported" }),
            Object.freeze({
                status: "exported",
                findings: Object.freeze([Object.freeze({ code: "hidden-content" })]),
            }),
            Object.freeze({
                status: "failed",
                error: Object.freeze({ kind: "pdf-generation-failed" }),
                findings: Object.freeze([Object.freeze({ code: "unknown" })]),
            }),
            Object.freeze({
                status: "skipped",
                findings: Object.freeze([Object.freeze({ code: "client-only" })]),
            }),
        ]);
        const snapshot = JSON.stringify(entries);

        expect(buildExportSummary(entries)).toEqual({
            selected: 4,
            exported: 2,
            failed: 1,
            skipped: 1,
            findings: 2,
            findingsByKind: {
                "hidden-content": 1,
                "client-only-island": 1,
            },
            failuresByKind: {
                "pdf-generation-failed": 1,
            },
        });
        expect(JSON.stringify(entries)).toBe(snapshot);
    });
});
