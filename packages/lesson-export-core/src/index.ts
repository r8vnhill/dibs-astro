/**
 * @packageDocumentation
 *
 * Pure planning contracts for lesson export workflows.
 *
 * `@ravenhill/lesson-export-core` provides host-agnostic helpers for describing, validating, filtering, and
 * summarizing lesson export plans. It is intended to be consumed by orchestration layers such as CLI scripts, build
 * integrations, or application-specific exporters.
 *
 * The package focuses on deterministic export planning:
 *
 * - normalizing and validating lesson routes;
 * - deriving export routes from source routes;
 * - deriving safe PDF output paths;
 * - filtering and validating export manifests;
 * - representing export findings with canonical runtime values;
 * - normalizing legacy finding kinds;
 * - building aggregate report summaries from export entries.
 *
 * The package deliberately does **not** perform host-specific work. It does not render Astro components, inspect the
 * DOM, launch browsers, read generated site data, write PDF files, or decide process exit policies. Those concerns
 * belong to the consuming application.
 *
 * Keeping this layer pure makes the contracts easier to test, reuse, and evolve independently from any particular
 * exporter implementation.
 *
 * ## Semantic types
 *
 * Route-shaped and path-shaped values use branded types to prevent accidental mixing of semantically different strings:
 *
 * - {@link LessonRoute} identifies a source lesson route.
 * - {@link ExportRoute} identifies the generated export route.
 * - {@link PdfOutputPath} identifies a validated PDF output path.
 *
 * Use the route and output-path helpers to create these values instead of casting strings directly.
 *
 * ## Findings and reports
 *
 * Export findings are represented by the canonical {@link LessonExportFindingKind} registry. Use
 * {@link normalizeExportFindingKind} when reading legacy or host-provided values, and use {@link buildExportSummary}
 * when aggregating report entries for CLI or UI presentation.
 *
 * ## Public imports
 *
 * Import from the package root:
 *
 * ```ts
 * import {
 *   buildExportSummary,
 *   derivePdfOutputPath,
 *   normalizeLessonRoute,
 * } from "@ravenhill/lesson-export-core";
 * ```
 *
 * Subpath imports are not part of the public API and may change without notice.
 */

import packageJson from "../package.json" with { type: "json" };

/**
 * Published package name used by diagnostics, metadata, and integration tests.
 */
export const LESSON_EXPORT_CORE_PACKAGE_NAME = "@ravenhill/lesson-export-core";

/**
 * Package version read from `package.json`.
 */
export const LESSON_EXPORT_CORE_VERSION = packageJson.version;

export { filterManifest } from "./filters";
export { createExportFinding, exportFindingKinds, isExportFindingKind, normalizeExportFindingKind } from "./findings";
export { derivePdfOutputPath, isSafePdfOutputPath } from "./output-paths";
export { buildExportSummary, countEntriesByStatus, countFailuresByKind, countFindingsByKind } from "./reporting";
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
export type {
    LessonExportKindCounts,
    LessonExportReportEntryLike,
    LessonExportReportErrorLike,
    LessonExportReportFindingLike,
    LessonExportReportStatus,
    LessonExportStatusCounts,
    LessonExportSummary,
} from "./reporting";
export type { DeriveExportRouteOptions } from "./routes";
export type { LessonExportValidationResult } from "./validation";
