/**
 * @file export-mode.test.ts
 *
 * Unit tests for the lesson export-mode resolver.
 */

import {
    getLessonExportRootAttributes,
    resolveLessonExportContext,
    type LessonExportContext,
} from "~/lib/presentation/export-mode";
import { describe, expect, test } from "vitest";

describe("resolveLessonExportContext", () => {
    describe("when no render mode is specified", () => {
        test("defaults to web mode", () => {
            const context = resolveLessonExportContext({});

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });
    });

    describe("when renderMode prop is explicitly 'web'", () => {
        test("returns web context", () => {
            const context = resolveLessonExportContext({ renderMode: "web" });

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });
    });

    describe("when renderMode prop is explicitly 'pdf'", () => {
        test("returns PDF export context", () => {
            const context = resolveLessonExportContext({ renderMode: "pdf" });

            expect(context.renderMode).toBe("pdf");
            expect(context.isPdfExport).toBe(true);
        });
    });

    describe("when legacy exportMode prop is true", () => {
        test("maps to PDF export context", () => {
            const context = resolveLessonExportContext({ exportMode: true });

            expect(context.renderMode).toBe("pdf");
            expect(context.isPdfExport).toBe(true);
        });
    });

    describe("when legacy exportMode prop is false", () => {
        test("defaults to web mode", () => {
            const context = resolveLessonExportContext({ exportMode: false });

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });
    });

    describe("when renderMode prop is provided alongside exportMode", () => {
        test("renderMode prop takes precedence", () => {
            const context = resolveLessonExportContext({
                renderMode: "web",
                exportMode: true,
            });

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });
    });

    describe("when Astro.locals contains lessonRenderMode", () => {
        test("uses the locals value when no props are set", () => {
            const context = resolveLessonExportContext({
                locals: { lessonRenderMode: "pdf" } as App.Locals,
            });

            expect(context.renderMode).toBe("pdf");
            expect(context.isPdfExport).toBe(true);
        });

        test("ignores locals when renderMode prop is set", () => {
            const context = resolveLessonExportContext({
                renderMode: "web",
                locals: { lessonRenderMode: "pdf" } as App.Locals,
            });

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });

        test("ignores locals when exportMode prop is set", () => {
            const context = resolveLessonExportContext({
                exportMode: false,
                locals: { lessonRenderMode: "pdf" } as App.Locals,
            });

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });
    });

    describe("when Astro.locals is undefined", () => {
        test("defaults to web mode gracefully", () => {
            const context = resolveLessonExportContext({
                locals: undefined,
            });

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });
    });

    describe("when Astro.locals contains unexpected properties", () => {
        test("ignores unexpected properties and defaults to web mode", () => {
            const context = resolveLessonExportContext({
                locals: { someOtherProperty: "value" } as unknown as App.Locals,
            });

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });

        test("ignores malformed lessonRenderMode values and defaults to web mode", () => {
            const context = resolveLessonExportContext({
                locals: { lessonRenderMode: "print" } as unknown as App.Locals,
            });

            expect(context.renderMode).toBe("web");
            expect(context.isPdfExport).toBe(false);
        });
    });
});

describe("getLessonExportRootAttributes", () => {
    describe("when in web render mode", () => {
        test("returns only the document role attribute", () => {
            const context: LessonExportContext = {
                renderMode: "web",
                isPdfExport: false,
            };

            const attributes = getLessonExportRootAttributes(context);

            expect(attributes).toEqual({
                "data-export-role": "document",
                "data-export-mode": undefined,
            });
            expect(attributes["data-export-mode"]).toBeUndefined();
        });
    });

    describe("when in PDF export mode", () => {
        test("returns both export-mode and document role attributes", () => {
            const context: LessonExportContext = {
                renderMode: "pdf",
                isPdfExport: true,
            };

            const attributes = getLessonExportRootAttributes(context);

            expect(attributes["data-export-role"]).toBe("document");
            expect(attributes["data-export-mode"]).toBe("pdf");
        });
    });

    describe("attribute stability", () => {
        test("returns consistent attributes across calls", () => {
            const context: LessonExportContext = {
                renderMode: "pdf",
                isPdfExport: true,
            };

            const attrs1 = getLessonExportRootAttributes(context);
            const attrs2 = getLessonExportRootAttributes(context);

            expect(attrs1).toEqual(attrs2);
        });
    });
});
