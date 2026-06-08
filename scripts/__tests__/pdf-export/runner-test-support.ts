import { vi } from "vitest";

export type EventLog = string[];

export type ValidationFinding = {
    severity: string;
    message: string;
};

export type ReportEntry = {
    status: string;
    findings?: unknown[];
};

export type ReportInput = {
    entries: ReportEntry[];
    exitPolicy?: unknown;
};

export type FindingElement = {
    getAttribute: (attribute: string) => string | null;
    dataset: {
        exportFinding?: string;
        exportFindingSeverity?: string;
    };
    textContent?: string | null;
};

export type PageDouble = ReturnType<typeof createPageDouble>;

export const manifestEntries = [
    {
        route: "/notes/blackthorne/androth/",
        exportRoute: "/exports/pdf/notes/blackthorne/androth/",
        title: "Blackthorne / Androth",
    },
    {
        route: "/notes/blackthorne/tuul/",
        exportRoute: "/exports/pdf/notes/blackthorne/tuul/",
        title: "Blackthorne / Tuul",
    },
];

export const manifest = {
    generatedAt: "2026-05-11T00:00:00.000Z",
    entries: manifestEntries,
};

export const resolvedTargets = [
    {
        entry: manifestEntries[0],
        outputPath: "dist/exports/pdf/blackthorne/androth.pdf",
    },
    {
        entry: manifestEntries[1],
        outputPath: "dist/exports/pdf/blackthorne/tuul.pdf",
    },
];

export function createReport(input: ReportInput) {
    return {
        ...input,
        summary: {
            selected: input.entries.length,
            exported: input.entries.filter((entry) => entry.status === "exported").length,
            failed: input.entries.filter((entry) => entry.status === "failed").length,
            skipped: input.entries.filter((entry) => entry.status === "skipped").length,
            findings: input.entries.reduce(
                (total, entry) => total + (entry.findings?.length ?? 0),
                0,
            ),
            findingsByKind: {},
            failuresByKind: {},
            ...(input.exitPolicy === undefined ? {} : { exitPolicy: input.exitPolicy }),
        },
    };
}

export function createDependencies({
    validationFindings = [],
}: { validationFindings?: ValidationFinding[] } = {}) {
    const buildLessonPdfExportManifest = vi.fn(() => ({
        manifest,
        validation: { findings: validationFindings },
    }));
    const selectExportEntries = vi.fn(() => manifestEntries);
    const resolveExportTargets = vi.fn(() => resolvedTargets);
    const createExportReport = vi.fn((input: ReportInput) => createReport(input));
    const writeExportReport = vi.fn(async () => {});
    const buildSite = vi.fn(async () => {});
    const startPreviewServer = vi.fn(() => ({ pid: 1234 }));
    const waitForPreview = vi.fn(async () => "http://127.0.0.1:4321/");
    const stopPreviewServer = vi.fn(async () => {});
    const chromium = {
        launch: vi.fn(async () => createBrowserDouble([createPageDouble(), createPageDouble()])),
    };
    const mkdir = vi.fn(async () => {});
    const hasFatalExportFindings = vi.fn(() => false);
    const decidePdfExportExitCode = vi.fn((report, policy) => {
        if (hasFatalExportFindings(report, policy.findingPolicy)) {
            return 1;
        }

        if (report.summary.failed === 0) {
            return 0;
        }

        if (report.summary.exported === 0) {
            return 1;
        }

        return policy.continueOnError ? 0 : 1;
    });
    const logger = { log: vi.fn() };

    return {
        buildSite,
        buildLessonPdfExportManifest,
        chromium,
        createExportReport,
        decidePdfExportExitCode,
        hasFatalExportFindings,
        logger,
        mkdir,
        resolveExportTargets,
        selectExportEntries,
        startPreviewServer,
        stopPreviewServer,
        waitForPreview,
        writeExportReport,
        now: () => new Date("2026-05-11T00:00:00.000Z"),
    };
}

export function createBrowserDouble(
    pages: PageDouble[] = [createPageDouble()],
    { events = [] }: { events?: EventLog } = {},
) {
    const pageQueue = [...pages];

    return {
        newPage: vi.fn(async () => {
            const page = pageQueue.shift();
            if (!page) {
                throw new Error("No more pages available.");
            }

            return page;
        }),
        close: vi.fn(async () => {
            events.push("browser-close");
        }),
    };
}

export function createPageDouble({
    content = "<main data-export-role=\"document\"><section data-export-role=\"body\"></section></main>",
    events = [],
    findingElements = [],
    gotoImplementation,
    label = "page",
    pdfImplementation,
    response = { ok: () => true },
}: {
    content?: string;
    events?: EventLog;
    findingElements?: FindingElement[];
    gotoImplementation?: () => Promise<unknown>;
    label?: string;
    pdfImplementation?: () => Promise<void>;
    response?: { ok: () => boolean };
} = {}) {
    const locators = new Map();

    return {
        goto: vi.fn(gotoImplementation ?? (async () => response)),
        content: vi.fn(async () => content),
        pdf: vi.fn(
            pdfImplementation ?? (async () => {
                events.push(`export-ok:${label}`);
            }),
        ),
        close: vi.fn(async () => {
            events.push(`page-close:${label}`);
        }),
        locator: vi.fn((selector: string) => {
            if (!locators.has(selector)) {
                locators.set(selector, createLocatorDouble(selector, findingElements));
            }

            return locators.get(selector);
        }),
    };
}

export function createLocatorDouble(selector: string, findingElements: FindingElement[]) {
    if (selector === "[data-export-finding]") {
        return {
            waitFor: vi.fn(async () => {}),
            evaluateAll: vi.fn(async (callback: (elements: FindingElement[]) => unknown) => callback(findingElements)),
        };
    }

    return {
        waitFor: vi.fn(async () => {}),
        evaluateAll: vi.fn(async () => []),
    };
}

export function createRealExportOptions(overrides = {}) {
    return {
        dryRun: false,
        outDir: "dist/exports/pdf",
        reportPath: "dist/exports/pdf/report.json",
        selection: { kind: "all" },
        baseUrl: undefined,
        port: 4321,
        timeoutMs: 30_000,
        skipBuild: false,
        keepServer: false,
        continueOnError: false,
        findingPolicy: { failOn: [] },
        ...overrides,
    };
}

export function finalFailureMessage({
    hasFatalFindings = false,
    generationFailureCount = 0,
}: {
    hasFatalFindings?: boolean;
    generationFailureCount?: number;
}) {
    const bullets = [];

    if (hasFatalFindings) {
        bullets.push("- export findings matched the configured --fail-on policy");
    }

    if (generationFailureCount > 0) {
        bullets.push(`- PDF generation failed for ${generationFailureCount} lesson(s)`);
    }

    return [
        "PDF export completed with problems after writing the report:",
        ...bullets,
        "Report: dist/exports/pdf/report.json",
    ].join("\n");
}
