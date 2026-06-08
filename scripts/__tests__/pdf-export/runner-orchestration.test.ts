import { describe, expect, test } from "vitest";

import { runPdfExport } from "../../lib/pdf-export/runner.mjs";
import {
    createBrowserDouble,
    createDependencies,
    createPageDouble,
    createRealExportOptions,
} from "./runner-test-support";

describe("given the PDF export runner orchestration", () => {
    describe("when a real export uses a provided baseUrl", () => {
        test("then it normalizes the baseUrl and skips preview startup", async () => {
            const dependencies = createDependencies();
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/site/page/",
            });
            const firstPage = createPageDouble();
            const secondPage = createPageDouble();
            const browser = createBrowserDouble([firstPage, secondPage]);
            dependencies.chromium.launch.mockResolvedValue(browser);

            await runPdfExport({ projectRoot, options, dependencies });

            expect(dependencies.buildSite).toHaveBeenCalledWith({ projectRoot });
            expect(dependencies.startPreviewServer).not.toHaveBeenCalled();
            expect(dependencies.waitForPreview).not.toHaveBeenCalled();
            expect(dependencies.stopPreviewServer).not.toHaveBeenCalled();
            expect(dependencies.chromium.launch).toHaveBeenCalledOnce();
            expect(dependencies.createExportReport).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseUrl: "http://127.0.0.1:5000/",
                }),
            );
            expect(browser.close).toHaveBeenCalledOnce();
        });

        test("then skipBuild prevents the build but still exports the targets", async () => {
            const dependencies = createDependencies();
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });
            const browser = createBrowserDouble([createPageDouble(), createPageDouble()]);
            dependencies.chromium.launch.mockResolvedValue(browser);

            await runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            });

            expect(dependencies.buildSite).not.toHaveBeenCalled();
            expect(dependencies.chromium.launch).toHaveBeenCalledOnce();
            expect(browser.close).toHaveBeenCalledOnce();
        });
    });

    describe("when a real export needs a preview server", () => {
        test("then it builds, starts preview, waits for readiness, exports, and stops preview in order", async () => {
            const dependencies = createDependencies();
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const previewProcess = { pid: 9876 };
            dependencies.startPreviewServer.mockReturnValue(previewProcess);
            dependencies.waitForPreview.mockResolvedValue("http://127.0.0.1:4321/");
            const browser = createBrowserDouble([createPageDouble(), createPageDouble()]);
            dependencies.chromium.launch.mockResolvedValue(browser);
            const options = createRealExportOptions();

            await runPdfExport({ projectRoot, options, dependencies });

            expect(dependencies.buildSite).toHaveBeenCalledWith({ projectRoot });
            expect(dependencies.startPreviewServer).toHaveBeenCalledWith({
                projectRoot,
                port: 4321,
            });
            expect(dependencies.waitForPreview).toHaveBeenCalledWith(
                "http://127.0.0.1:4321/",
                30_000,
            );
            expect(dependencies.chromium.launch).toHaveBeenCalledOnce();
            expect(browser.close).toHaveBeenCalledOnce();
            expect(dependencies.stopPreviewServer).toHaveBeenCalledWith(previewProcess);

            expect(dependencies.buildSite.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.startPreviewServer.mock.invocationCallOrder[0],
            );
            expect(dependencies.startPreviewServer.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.waitForPreview.mock.invocationCallOrder[0],
            );
            expect(dependencies.waitForPreview.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.chromium.launch.mock.invocationCallOrder[0],
            );
            expect(dependencies.chromium.launch.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.stopPreviewServer.mock.invocationCallOrder[0],
            );
        });

        test("then keepServer leaves a started preview running", async () => {
            const dependencies = createDependencies();
            const browser = createBrowserDouble([createPageDouble(), createPageDouble()]);
            dependencies.chromium.launch.mockResolvedValue(browser);
            const options = createRealExportOptions({ keepServer: true });

            await runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            });

            expect(dependencies.startPreviewServer).toHaveBeenCalledOnce();
            expect(dependencies.stopPreviewServer).not.toHaveBeenCalled();
        });

        test("then a build failure stops before preview startup", async () => {
            const dependencies = createDependencies();
            dependencies.buildSite.mockRejectedValue(new Error("Build failed."));

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options: createRealExportOptions(),
                dependencies,
            })).rejects.toThrow("Build failed.");

            expect(dependencies.startPreviewServer).not.toHaveBeenCalled();
            expect(dependencies.waitForPreview).not.toHaveBeenCalled();
            expect(dependencies.chromium.launch).not.toHaveBeenCalled();
            expect(dependencies.stopPreviewServer).not.toHaveBeenCalled();
        });

        test("then preview stops when browser launch fails", async () => {
            const dependencies = createDependencies();
            const previewProcess = { pid: 2468 };
            dependencies.startPreviewServer.mockReturnValue(previewProcess);
            dependencies.chromium.launch.mockRejectedValue(new Error("Launch failed."));

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options: createRealExportOptions(),
                dependencies,
            })).rejects.toThrow("Launch failed.");

            expect(dependencies.stopPreviewServer).toHaveBeenCalledWith(previewProcess);
        });
    });
});
