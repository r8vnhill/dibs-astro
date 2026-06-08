import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { runPdfExport } from "../../lib/pdf-export/runner.mjs";
import {
    createBrowserDouble,
    createDependencies,
    createLocatorDouble,
    createPageDouble,
    createRealExportOptions,
    type EventLog,
    manifestEntries,
    resolvedTargets,
} from "./runner-test-support";

describe("given the PDF export runner DOM finding collection", () => {
    test("then it collects normalized DOM findings from rendered HTML", async () => {
        const dependencies = createDependencies();
        const events: EventLog = [];
        const documentLocator = createLocatorDouble("[data-export-role=\"document\"]", []);
        const bodyLocator = createLocatorDouble("[data-export-role=\"body\"]", []);
        const firstPage = {
            goto: vi.fn(async () => ({ ok: () => true })),
            content: vi.fn(async () => `
                <main data-export-role="document">
                    <section data-export-role="body">
                        <aside
                            data-testid="abstract-fallback"
                            data-export-finding="client-only"
                            data-export-finding-severity="warning"
                        >
                            Pikachu island rendered on the client only.
                        </aside>
                    </section>
                </main>
            `),
            pdf: vi.fn(async () => {
                events.push("export-ok:androth");
            }),
            close: vi.fn(async () => {
                events.push("page-close:androth");
            }),
            locator: vi.fn((selector: string) => {
                switch (selector) {
                    case "[data-export-role=\"document\"]":
                        return documentLocator;
                    case "[data-export-role=\"body\"]":
                        return bodyLocator;
                    default:
                        return createLocatorDouble(selector, []);
                }
            }),
        };
        const secondPage = createPageDouble({ events, label: "tuul" });
        const browser = createBrowserDouble([firstPage, secondPage], { events });
        dependencies.chromium.launch.mockResolvedValue(browser);
        const projectRoot = "e:/teaching/DIBS/projects/astro-website";
        const options = createRealExportOptions({
            baseUrl: "http://127.0.0.1:5000/",
            skipBuild: true,
        });

        await runPdfExport({ projectRoot, options, dependencies });

        expect(browser.newPage).toHaveBeenCalledWith({
            viewport: { width: 1280, height: 1600 },
        });
        expect(firstPage.goto).toHaveBeenCalledWith(
            "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/androth/",
            {
                waitUntil: "domcontentloaded",
                timeout: options.timeoutMs,
            },
        );
        expect(firstPage.locator).toHaveBeenCalledWith("[data-export-role=\"document\"]");
        expect(firstPage.locator).toHaveBeenCalledWith("[data-export-role=\"body\"]");
        expect(firstPage.content).toHaveBeenCalledOnce();
        expect(dependencies.mkdir).toHaveBeenCalledWith(
            path.dirname(path.resolve(projectRoot, resolvedTargets[0].outputPath)),
            { recursive: true },
        );
        expect(firstPage.pdf).toHaveBeenCalledWith({
            path: path.resolve(projectRoot, resolvedTargets[0].outputPath),
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: "0",
                right: "0",
                bottom: "0",
                left: "0",
            },
        });
        expect(firstPage.close).toHaveBeenCalledOnce();
        expect(secondPage.close).toHaveBeenCalledOnce();
        expect(browser.close).toHaveBeenCalledOnce();
        expect(events).toEqual([
            "export-ok:androth",
            "page-close:androth",
            "export-ok:tuul",
            "page-close:tuul",
            "browser-close",
        ]);

        expect(dependencies.createExportReport).toHaveBeenCalledWith({
            generatedAt: "2026-05-11T00:00:00.000Z",
            baseUrl: "http://127.0.0.1:5000/",
            outDir: options.outDir,
            selection: options.selection,
            exitPolicy: {
                continueOnError: false,
                failOn: [],
            },
            entries: [
                {
                    route: manifestEntries[0].route,
                    exportRoute: manifestEntries[0].exportRoute,
                    url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/androth/",
                    outputPath: resolvedTargets[0].outputPath,
                    status: "exported",
                    title: manifestEntries[0].title,
                    findings: [
                        {
                            kind: "client-only-island",
                            message: "client-only-island: Pikachu island rendered on the client only.",
                            route: manifestEntries[0].route,
                            severity: "warning",
                            source: "dom",
                            selector: "[data-export-role=\"body\"] [data-export-finding=\"client-only\"]",
                            excerpt: "Pikachu island rendered on the client only.",
                        },
                    ],
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
            ],
        });
    });

    test("then it reports manifest and DOM findings together for the selected entry", async () => {
        const dependencies = createDependencies();
        const entryWithManifestFinding = {
            ...manifestEntries[0],
            findings: [
                {
                    kind: "missing-generated-metadata",
                    severity: "warning",
                    message: "No generated lesson metadata found for /notes/blackthorne/androth/.",
                    route: manifestEntries[0].route,
                    field: "metadata",
                    value: manifestEntries[0].route,
                },
            ],
        };
        const target = {
            entry: entryWithManifestFinding,
            outputPath: resolvedTargets[0].outputPath,
        };
        dependencies.selectExportEntries.mockReturnValue([entryWithManifestFinding]);
        dependencies.resolveExportTargets.mockReturnValue([target]);
        const documentLocator = createLocatorDouble("[data-export-role=\"document\"]", []);
        const bodyLocator = createLocatorDouble("[data-export-role=\"body\"]", []);
        const page = {
            goto: vi.fn(async () => ({ ok: () => true })),
            content: vi.fn(async () => `
                <main data-export-role="document">
                    <section data-export-role="body">
                        <p data-export-finding="unresolved-todo">Resolve this before publishing.</p>
                    </section>
                </main>
            `),
            pdf: vi.fn(async () => {}),
            close: vi.fn(async () => {}),
            locator: vi.fn((selector: string) => {
                switch (selector) {
                    case "[data-export-role=\"document\"]":
                        return documentLocator;
                    case "[data-export-role=\"body\"]":
                        return bodyLocator;
                    default:
                        return createLocatorDouble(selector, []);
                }
            }),
        };
        dependencies.chromium.launch.mockResolvedValue(createBrowserDouble([page]));
        const options = createRealExportOptions({
            baseUrl: "http://127.0.0.1:5000/",
            skipBuild: true,
        });

        await runPdfExport({
            projectRoot: "e:/teaching/DIBS/projects/astro-website",
            options,
            dependencies,
        });

        expect(dependencies.createExportReport).toHaveBeenCalledWith(expect.objectContaining({
            entries: [
                expect.objectContaining({
                    findings: [
                        {
                            kind: "missing-generated-metadata",
                            severity: "warning",
                            message: "No generated lesson metadata found for /notes/blackthorne/androth/.",
                            route: manifestEntries[0].route,
                            field: "metadata",
                            value: manifestEntries[0].route,
                            source: "manifest",
                        },
                        {
                            kind: "unresolved-todo",
                            message: "unresolved-todo: Resolve this before publishing.",
                            route: manifestEntries[0].route,
                            severity: "warning",
                            source: "dom",
                            selector: "[data-export-role=\"body\"] [data-export-finding=\"unresolved-todo\"]",
                            excerpt: "Resolve this before publishing.",
                        },
                    ],
                }),
            ],
        }));
    });
});
