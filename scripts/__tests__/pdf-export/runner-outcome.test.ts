import path from "node:path";

import { describe, expect, test } from "vitest";

import { runPdfExport } from "../../lib/pdf-export/runner.mjs";
import {
    createBrowserDouble,
    createDependencies,
    createPageDouble,
    createRealExportOptions,
    createReport,
    type EventLog,
    finalFailureMessage,
    type ReportInput,
    resolvedTargets,
} from "./runner-test-support";

describe("given the PDF export runner final outcome decision", () => {
    test.each([
        {
            name: "clean export",
            hasFatalFindings: false,
            failedPdfCount: 0,
            expectedMessage: undefined,
        },
        {
            name: "generation failures only",
            hasFatalFindings: false,
            failedPdfCount: 2,
            expectedMessage: finalFailureMessage({ generationFailureCount: 2 }),
        },
        {
            name: "fatal findings only",
            hasFatalFindings: true,
            failedPdfCount: 0,
            expectedMessage: finalFailureMessage({ hasFatalFindings: true }),
        },
        {
            name: "fatal findings and generation failures",
            hasFatalFindings: true,
            failedPdfCount: 2,
            expectedMessage: finalFailureMessage({
                hasFatalFindings: true,
                generationFailureCount: 2,
            }),
        },
    ])("then $name is handled after writing the report", async ({
        hasFatalFindings,
        failedPdfCount,
        expectedMessage,
    }) => {
        const dependencies = createDependencies();
        dependencies.hasFatalExportFindings.mockReturnValue(hasFatalFindings);
        const events: EventLog = [];
        dependencies.createExportReport.mockImplementation((input: ReportInput) => {
            events.push("create-report");
            return createReport(input);
        });
        dependencies.writeExportReport.mockImplementation(async () => {
            events.push("write-report");
        });
        const pages = resolvedTargets.map((_, index) =>
            createPageDouble({
                events,
                label: `target-${index + 1}`,
                pdfImplementation: index < failedPdfCount
                    ? async () => {
                        events.push(`export-failed:target-${index + 1}`);
                        throw new Error(`PDF failed for target ${index + 1}.`);
                    }
                    : undefined,
            })
        );
        const browser = createBrowserDouble(pages, { events });
        dependencies.chromium.launch.mockResolvedValue(browser);
        const projectRoot = "e:/teaching/DIBS/projects/astro-website";
        const options = createRealExportOptions({
            baseUrl: "http://127.0.0.1:5000/",
            skipBuild: true,
        });
        const run = runPdfExport({ projectRoot, options, dependencies });

        if (expectedMessage) {
            await expect(run).rejects.toThrow(expectedMessage);
        } else {
            await expect(run).resolves.toBeUndefined();
            expect(dependencies.logger.log).toHaveBeenCalledWith(
                "[export-lessons-pdf] Exported 2 lesson(s) to dist/exports/pdf.",
            );
        }

        expect(dependencies.createExportReport).toHaveBeenCalledOnce();
        expect(dependencies.writeExportReport).toHaveBeenCalledOnce();
        expect(dependencies.writeExportReport).toHaveBeenCalledWith(
            path.resolve(projectRoot, options.reportPath),
            expect.objectContaining({
                summary: expect.objectContaining({
                    failed: failedPdfCount,
                }),
            }),
        );
        expect(dependencies.writeExportReport.mock.invocationCallOrder[0]).toBeLessThan(
            browser.close.mock.invocationCallOrder[0],
        );

        if (expectedMessage) {
            expect(expectedMessage.startsWith(
                "PDF export completed with problems after writing the report:",
            )).toBe(true);
            expect(expectedMessage.endsWith("Report: dist/exports/pdf/report.json")).toBe(true);
            expect(expectedMessage.includes(
                "- export findings matched the configured --fail-on policy",
            )).toBe(hasFatalFindings);
            expect(expectedMessage.includes(
                `- PDF generation failed for ${failedPdfCount} lesson(s)`,
            )).toBe(failedPdfCount > 0);
        }
    });

    test("then continue-on-error allows partial generation failures after writing the report", async () => {
        const dependencies = createDependencies();
        const events: EventLog = [];
        dependencies.createExportReport.mockImplementation((input: ReportInput) => {
            events.push("create-report");
            return createReport(input);
        });
        dependencies.writeExportReport.mockImplementation(async () => {
            events.push("write-report");
        });
        const browser = createBrowserDouble([
            createPageDouble({ events, label: "target-1" }),
            createPageDouble({
                events,
                label: "target-2",
                pdfImplementation: async () => {
                    events.push("export-failed:target-2");
                    throw new Error("PDF failed for target 2.");
                },
            }),
        ], { events });
        dependencies.chromium.launch.mockResolvedValue(browser);
        const projectRoot = "e:/teaching/DIBS/projects/astro-website";
        const options = createRealExportOptions({
            baseUrl: "http://127.0.0.1:5000/",
            continueOnError: true,
            skipBuild: true,
        });

        await expect(runPdfExport({ projectRoot, options, dependencies })).resolves.toBeUndefined();

        expect(dependencies.writeExportReport).toHaveBeenCalledWith(
            path.resolve(projectRoot, options.reportPath),
            expect.objectContaining({
                summary: expect.objectContaining({
                    exported: 1,
                    failed: 1,
                }),
            }),
        );
        expect(dependencies.logger.log).toHaveBeenCalledWith(
            "[export-lessons-pdf] Exported 1 lesson(s) to dist/exports/pdf.",
        );
    });
});
