import { describe, expect, test } from "vitest";
import {
    buildExportSummary,
    countEntriesByStatus,
    countFailuresByKind,
    countFindingsByKind,
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

    test("then findings are grouped by normalised kind", () => {
        expect(countFindingsByKind([
            {
                status: "exported",
                findings: [
                    { kind: "hidden-content" },
                    { kind: "client-only" },
                    { kind: "client-only-island" },
                ],
            },
        ])).toEqual({
            "hidden-content": 1,
            "client-only-island": 2,
        });
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

    test("then a mixed report summary contains additive Phase 8 counts", () => {
        const entries: readonly LessonExportReportEntryLike[] = [
            { status: "exported" },
            {
                status: "exported",
                findings: [{ kind: "hidden-content" }],
            },
            {
                status: "failed",
                error: { kind: "pdf-generation-failed" },
                findings: [{ kind: "unknown" }],
            },
            {
                status: "skipped",
                findings: [{ kind: "client-only" }],
            },
        ];

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
        expect(entries).toEqual([
            { status: "exported" },
            {
                status: "exported",
                findings: [{ kind: "hidden-content" }],
            },
            {
                status: "failed",
                error: { kind: "pdf-generation-failed" },
                findings: [{ kind: "unknown" }],
            },
            {
                status: "skipped",
                findings: [{ kind: "client-only" }],
            },
        ]);
    });
});
