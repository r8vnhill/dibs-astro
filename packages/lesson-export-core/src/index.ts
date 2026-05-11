/**
 * @packageDocumentation
 *
 * Public API for `@ravenhill/lesson-export-core`.
 *
 * This package provides pure helpers for planning lesson export targets. It normalizes lesson routes, derives export
 * routes and PDF output paths, filters manifests, and reports structured findings for manifest issues.
 *
 * The package is intentionally framework-agnostic. It does not import Astro, React, DOM APIs, browser automation tools,
 * generated app data, app-local aliases, or course-specific structures.
 */

import packageJson from "../package.json" with { type: "json" };

export const LESSON_EXPORT_CORE_PACKAGE_NAME = "@ravenhill/lesson-export-core";
export const LESSON_EXPORT_CORE_VERSION = packageJson.version;

export { filterManifest } from "./filters";
export { createExportFinding } from "./findings";
export { derivePdfOutputPath, isSafePdfOutputPath } from "./output-paths";
export { deriveExportRoute, normalizeExportRoutePrefix, normalizeLessonRoute } from "./routes";
export {
    detectDuplicateExportRoutes,
    detectDuplicateOutputPaths,
    detectDuplicateRoutes,
    detectUnsafeOutputPaths,
    validateManifest,
} from "./validation";

export type { LessonExportFilter } from "./filters";
export type { LessonExportFinding, LessonExportFindingKind, LessonExportFindingSeverity } from "./findings";
export type {
    ExportRoute,
    IsoDateTime,
    LessonExportEntry,
    LessonExportManifest,
    LessonRoute,
    PdfOutputPath,
} from "./manifest";
export type { DerivePdfOutputPathOptions } from "./output-paths";
export type { DeriveExportRouteOptions } from "./routes";
export type { LessonExportValidationResult } from "./validation";
