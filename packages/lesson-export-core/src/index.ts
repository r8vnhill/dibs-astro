/**
 * @packageDocumentation
 *
 * Pure, host-agnostic contracts for planning lesson export workflows.
 *
 * `@ravenhill/lesson-export-core` is the reusable core behind lesson export orchestration. It describes route, 
 * manifest, finding, report, and failure-policy contracts without depending on Astro, Playwright, the DOM, the 
 * filesystem, process exits, or CLI parsing.
 *
 * Use this package from host adapters such as:
 *
 * - CLI export scripts;
 * - build integrations;
 * - application-specific PDF exporters;
 * - tests that need deterministic export planning fixtures.
 *
 * ## Responsibilities
 *
 * The package owns pure operations that can be tested without a host runtime:
 *
 * - normalizing and validating source lesson routes;
 * - deriving export routes from source routes;
 * - deriving safe PDF output paths;
 * - filtering and validating export manifests;
 * - representing findings with canonical runtime values;
 * - normalizing legacy finding kinds;
 * - summarizing export entries for reports;
 * - evaluating findings against a host-provided failure policy.
 *
 * It deliberately does not own side effects:
 *
 * - rendering Astro pages;
 * - inspecting browser or DOM state;
 * - launching Playwright;
 * - reading generated site data;
 * - writing PDFs or other files;
 * - parsing CLI arguments;
 * - deciding process exit behavior.
 *
 * Keep those behaviors in the consuming adapter and pass only normalized inputs into this package.
 *
 * ## Semantic strings
 *
 * Route-shaped and path-shaped values are branded so callers cannot casually mix semantically different strings:
 *
 * - {@link LessonRoute} is a normalized source lesson route.
 * - {@link ExportRoute} is a generated PDF export route.
 * - {@link PdfOutputPath} is a validated PDF output path.
 *
 * Create these values through {@link normalizeLessonRoute}, {@link deriveExportRoute}, and
 * {@link derivePdfOutputPath}. Avoid direct casts at call sites because they bypass the validation boundary.
 *
 * ## Findings, reports, and failure policies
 *
 * Findings use the canonical {@link LessonExportFindingKind} registry. Normalize external, legacy, or host-provided 
 * values with {@link normalizeExportFindingKind} before storing or comparing them.
 *
 * Use {@link buildExportSummary} to aggregate report entries for CLI or UI output. Use {@link hasFatalExportFindings} 
 * to evaluate a {@link LessonExportFailurePolicy}. The result tells the host whether a finding policy matched; the 
 * host remains responsible for mapping that result to logs, artifacts, process exits, or build failures.
 *
 * ## Public imports
 *
 * Import from the package root:
 *
 * ```ts
 * import {
 *   buildExportSummary,
 *   derivePdfOutputPath,
 *   hasFatalExportFindings,
 *   normalizeLessonRoute,
 * } from "@ravenhill/lesson-export-core";
 * ```
 *
 * Subpath imports are internal and may change without notice.
 */

import packageJson from "../package.json" with { type: "json" };

/**
 * Name of the published package.
 *
 * Use this value in diagnostics, generated metadata, and integration tests that need to assert the public package 
 * identity.
 */
export const LESSON_EXPORT_CORE_PACKAGE_NAME = "@ravenhill/lesson-export-core";

/**
 * Version of the published package, read from `package.json`.
 *
 * This value is runtime metadata for diagnostics and integration tests. Do not use it to gate feature behavior.
 */
export const LESSON_EXPORT_CORE_VERSION = packageJson.version;

export { filterManifest } from "./filters";
export { createExportFinding, exportFindingKinds, isExportFindingKind, normalizeExportFindingKind } from "./findings";
export { derivePdfOutputPath, isSafePdfOutputPath } from "./output-paths";
export {
    buildExportSummary,
    countEntriesByStatus,
    countFailuresByKind,
    countFindingsByKind,
    hasFatalExportFindings,
} from "./reporting";
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
    LessonExportFailurePolicy,
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
