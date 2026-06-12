/**
 * @packageDocumentation
 *
 * Pure, host-agnostic contracts for planning lesson export workflows.
 *
 * `@ravenhill/lesson-export-core` is the reusable planning and reporting core  behind lesson export orchestration. It
 * defines route, manifest, finding, report, failure-policy, and book-planning contracts without depending on a
 * concrete host runtime.
 *
 * The package intentionally avoids dependencies on Astro, Playwright, browser APIs, the DOM, filesystem access, CLI
 * parsing, process exits, or PDF generation. Host adapters are responsible for those side effects and should pass
 * normalized data into this package.
 *
 * Use this package from adapters such as:
 *
 * - CLI export scripts;
 * - build integrations;
 * - application-specific PDF exporters;
 * - smoke-test fixtures that need deterministic export plans;
 * - report generators that need stable summary and finding semantics.
 *
 * ## Responsibilities
 *
 * This package owns pure, deterministic operations that can be tested without a browser, filesystem, generated site,
 * or command-line process:
 *
 * - normalizing and validating source lesson routes;
 * - deriving PDF export routes from source lesson routes;
 * - deriving safe PDF output paths for single-lesson exports;
 * - planning optional unit and full-course book PDF targets;
 * - filtering and validating lesson export manifests;
 * - representing findings with canonical runtime values;
 * - normalizing legacy or host-provided finding kinds;
 * - summarizing export entries for reports;
 * - evaluating findings against a host-provided failure policy.
 *
 * It deliberately does not own side effects:
 *
 * - rendering Astro pages;
 * - inspecting browser or DOM state;
 * - launching Playwright;
 * - reading generated site data;
 * - checking filesystem state for book inputs;
 * - writing PDFs or other files;
 * - parsing CLI arguments;
 * - printing logs;
 * - deciding process exit behavior.
 *
 * Keep those responsibilities in the consuming adapter. The adapter should gather runtime data, normalize it at the
 * boundary, call this package, and then decide how to render logs, reports, artifacts, or process failures.
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
 * {@link derivePdfOutputPath}. Avoid direct casts at call sites because casts bypass the validation boundary and make
 * host adapters harder to audit.
 *
 * ## Findings, reports, and failure policies
 *
 * Findings use the canonical {@link LessonExportFindingKind} registry. Normalize external, legacy, or host-provided
 * values with {@link normalizeExportFindingKind} before storing or comparing them.
 *
 * Use {@link buildExportSummary} to aggregate report entries for CLI, JSON, or UI output. Use
 * {@link hasFatalExportFindings} to evaluate a {@link LessonExportFailurePolicy}. The result tells the host whether a
 * configured policy matched; the host remains responsible for mapping that result to logs, artifacts, process exits,
 * build failures, or advisory output.
 *
 * ## Book planning
 *
 * Use {@link planBookExports} as the public entry point for optional unit and full-course book export planning.
 *
 * The planner receives plain course-tree data, a lesson export manifest, an output directory, and a host-provided set
 * of available PDF paths. It returns data-only book targets and findings. This makes it suitable for dry-run CLIs,
 * deterministic tests, and later PDF assembly without coupling the core package to filesystem checks or `pdf-lib`.
 *
 * Book planning does not generate PDFs. It only answers questions such as:
 *
 * - which book bundles should exist;
 * - which lessons belong to each bundle;
 * - where each bundle should be written;
 * - which expected lesson PDFs are unavailable;
 * - whether planned book output paths are unsafe.
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
 *   planBookExports,
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
 *
 * Do not use this value to infer feature support. Feature checks should be based on explicit exported APIs instead of
 * package-name comparisons.
 */
export const LESSON_EXPORT_CORE_PACKAGE_NAME = "@ravenhill/lesson-export-core";

/**
 * Version of the published package, read from `package.json`.
 *
 * This value is runtime metadata for diagnostics, generated reports, and integration tests that need to include the
 * package version that produced an artifact.
 *
 * Do not use this value to gate feature behavior. Prefer capability checks or explicit host configuration when
 * behavior must differ by environment.
 */
export const LESSON_EXPORT_CORE_VERSION = packageJson.version;

/**
 * Book export planning.
 *
 * These exports describe optional unit and full-course PDF bundle targets using plain data only. They do not read
 * lesson PDFs, generate bundled PDFs, or decide CLI failure behavior.
 */
export { planBookExports } from "./book-planning";

/**
 * Manifest filtering.
 */
export { filterManifest } from "./filters";

/**
 * Finding construction, classification, and normalization.
 */
export { createExportFinding, exportFindingKinds, isExportFindingKind, normalizeExportFindingKind } from "./findings";

/**
 * Single-lesson PDF output path derivation and safety checks.
 */
export { derivePdfOutputPath, isSafePdfOutputPath } from "./output-paths";

/**
 * Report summarization and failure-policy evaluation.
 */
export {
    buildExportSummary,
    countEntriesByStatus,
    countFailuresByKind,
    countFindingsByKind,
    hasFatalExportFindings,
} from "./reporting";

/**
 * Lesson route normalization and export route derivation.
 */
export { deriveExportRoute, normalizeExportRoutePrefix, normalizeLessonRoute } from "./routes";

/**
 * Manifest-level validation helpers.
 */
export {
    detectDuplicateExportRoutes,
    detectDuplicateOutputPaths,
    detectDuplicateRoutes,
    detectUnsafeOutputPaths,
    validateManifest,
} from "./validation";

export type {
    BookExportCourseEntry,
    BookExportCourseTree,
    BookExportFinding,
    BookExportFindingCode,
    BookExportFindingSeverity,
    BookExportLessonEntry,
    BookExportPlan,
    BookExportTarget,
    BookExportTargetKind,
    PlanBookExportsOptions,
} from "./book-planning";

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
