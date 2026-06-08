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
    manifestEntries,
    type ReportInput,
    resolvedTargets,
} from "./runner-test-support";

describe("given the PDF export runner target export", () => {
    test("then it records failed targets, continues, writes the report, and fails after report writing", async () => {
        const dependencies = createDependencies();
        const events: EventLog = [];
        dependencies.createExportReport.mockImplementation((input: ReportInput) => {
            events.push("create-report");
            return createReport(input);
        });
        dependencies.writeExportReport.mockImplementation(async () => {
            events.push("write-report");
        });
        const firstPage = createPageDouble({
            events,
            gotoImplementation: async () => {
                events.push("export-failed:androth");
                throw new Error("Navigation failed.");
            },
            label: "androth",
        });
        const secondPage = createPageDouble({ events, label: "tuul" });
        const browser = createBrowserDouble([firstPage, secondPage], { events });
        dependencies.chromium.launch.mockResolvedValue(browser);
        const projectRoot = "e:/teaching/DIBS/projects/astro-website";
        const options = createRealExportOptions({
            baseUrl: "http://127.0.0.1:5000/",
            skipBuild: true,
        });

        await expect(runPdfExport({ projectRoot, options, dependencies })).rejects.toThrow(
            finalFailureMessage({ generationFailureCount: 1 }),
        );

        expect(firstPage.close).toHaveBeenCalledOnce();
        expect(secondPage.close).toHaveBeenCalledOnce();
        expect(browser.close).toHaveBeenCalledOnce();
        expect(dependencies.writeExportReport).toHaveBeenCalledOnce();

        const reportInput = dependencies.createExportReport.mock.calls[0][0];
        expect(reportInput.entries).toEqual([
            {
                route: manifestEntries[0].route,
                exportRoute: manifestEntries[0].exportRoute,
                url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/androth/",
                outputPath: resolvedTargets[0].outputPath,
                status: "failed",
                title: manifestEntries[0].title,
                findings: [],
                error: {
                    kind: "pdf-generation-failed",
                    message: "Navigation failed.",
                },
            },
            {
                route: manifestEntries[1].route,
                exportRoute: manifestEntries[1].exportRoute,
                url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/tuul/",
                outputPath: resolvedTargets[1].outputPath,
                status: "exported",
                title: manifestEntries[1].title,
                findings: [],
            },
        ]);
        expect(dependencies.writeExportReport.mock.invocationCallOrder[0]).toBeLessThan(
            browser.close.mock.invocationCallOrder[0],
        );
        expect(events).toEqual([
            "export-failed:androth",
            "page-close:androth",
            "export-ok:tuul",
            "page-close:tuul",
            "create-report",
            "write-report",
            "browser-close",
        ]);
    });

    test("then browser allocation failures are recorded and later targets still run", async () => {
        const dependencies = createDependencies();
        const events: EventLog = [];
        dependencies.createExportReport.mockImplementation((input: ReportInput) => {
            events.push("create-report");
            return createReport(input);
        });
        dependencies.writeExportReport.mockImplementation(async () => {
            events.push("write-report");
        });
        const secondPage = createPageDouble({ events, label: "tuul" });
        const browser = createBrowserDouble([secondPage], { events });
        browser.newPage.mockRejectedValueOnce(new Error("Page allocation failed."));
        dependencies.chromium.launch.mockResolvedValue(browser);
        const options = createRealExportOptions({
            baseUrl: "http://127.0.0.1:5000/",
            skipBuild: true,
        });

        await expect(runPdfExport({
            projectRoot: "e:/teaching/DIBS/projects/astro-website",
            options,
            dependencies,
        })).rejects.toThrow(finalFailureMessage({ generationFailureCount: 1 }));

        expect(browser.newPage).toHaveBeenCalledTimes(2);
        expect(secondPage.close).toHaveBeenCalledOnce();
        expect(dependencies.createExportReport).toHaveBeenCalledOnce();
        expect(dependencies.writeExportReport).toHaveBeenCalledOnce();
        expect(browser.close).toHaveBeenCalledOnce();

        const reportInput = dependencies.createExportReport.mock.calls[0][0];
        expect(reportInput.entries).toEqual([
            {
                route: manifestEntries[0].route,
                exportRoute: manifestEntries[0].exportRoute,
                url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/androth/",
                outputPath: resolvedTargets[0].outputPath,
                status: "failed",
                title: manifestEntries[0].title,
                findings: [],
                error: {
                    kind: "pdf-generation-failed",
                    message: "Page allocation failed.",
                },
            },
            {
                route: manifestEntries[1].route,
                exportRoute: manifestEntries[1].exportRoute,
                url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/tuul/",
                outputPath: resolvedTargets[1].outputPath,
                status: "exported",
                title: manifestEntries[1].title,
                findings: [],
            },
        ]);
        expect(events).toEqual([
            "export-ok:tuul",
            "page-close:tuul",
            "create-report",
            "write-report",
            "browser-close",
        ]);
    });

    test("then report creation failures close the browser without writing the report", async () => {
        const dependencies = createDependencies();
        const events: EventLog = [];
        const firstPage = createPageDouble({ events, label: "androth" });
        const secondPage = createPageDouble({ events, label: "tuul" });
        const browser = createBrowserDouble([firstPage, secondPage], { events });
        dependencies.chromium.launch.mockResolvedValue(browser);
        dependencies.createExportReport.mockImplementation(() => {
            events.push("create-report");
            throw new Error("Report creation failed.");
        });
        const options = createRealExportOptions({
            baseUrl: "http://127.0.0.1:5000/",
            skipBuild: true,
        });

        await expect(runPdfExport({
            projectRoot: "e:/teaching/DIBS/projects/astro-website",
            options,
            dependencies,
        })).rejects.toThrow("Report creation failed.");

        expect(firstPage.close).toHaveBeenCalledOnce();
        expect(secondPage.close).toHaveBeenCalledOnce();
        expect(dependencies.writeExportReport).not.toHaveBeenCalled();
        expect(browser.close).toHaveBeenCalledOnce();
        expect(events).toEqual([
            "export-ok:androth",
            "page-close:androth",
            "export-ok:tuul",
            "page-close:tuul",
            "create-report",
            "browser-close",
        ]);
    });

    test("then report writing failures close the browser after the write attempt", async () => {
        const dependencies = createDependencies();
        const events: EventLog = [];
        dependencies.writeExportReport.mockImplementation(async () => {
            events.push("write-report");
            throw new Error("Report write failed.");
        });
        const firstPage = createPageDouble({ events, label: "androth" });
        const secondPage = createPageDouble({ events, label: "tuul" });
        const browser = createBrowserDouble([firstPage, secondPage], { events });
        dependencies.chromium.launch.mockResolvedValue(browser);
        const options = createRealExportOptions({
            baseUrl: "http://127.0.0.1:5000/",
            skipBuild: true,
        });

        await expect(runPdfExport({
            projectRoot: "e:/teaching/DIBS/projects/astro-website",
            options,
            dependencies,
        })).rejects.toThrow("Report write failed.");

        expect(dependencies.createExportReport).toHaveBeenCalledOnce();
        expect(dependencies.writeExportReport).toHaveBeenCalledOnce();
        expect(browser.close).toHaveBeenCalledOnce();
        expect(dependencies.writeExportReport.mock.invocationCallOrder[0]).toBeLessThan(
            browser.close.mock.invocationCallOrder[0],
        );
        expect(events).toEqual([
            "export-ok:androth",
            "page-close:androth",
            "export-ok:tuul",
            "page-close:tuul",
            "write-report",
            "browser-close",
        ]);
    });
});
