/**
 * @packageDocumentation
 *
 * Internal barrel for the `lesson-metadata` submodule.
 *
 * This module defines the local aggregation boundary for lesson-metadata concerns. It keeps the package entry point 
 * easy to maintain while allowing the internal file layout to evolve without leaking implementation details to
 * application code.
 *
 * The submodule is organized around these concerns:
 *
 * - date helpers for parsing, formatting, and display fallback behavior;
 * - branded values for trusted semantic fields such as URLs, commit hashes, ISO short dates, source files, and 
 *   non-empty text;
 * - path normalization for stable lesson-metadata lookup keys;
 * - domain records for validated lesson metadata;
 * - lookup and resolution results that distinguish `found`, `missing`, and `invalid` metadata states;
 * - repository contracts that isolate core logic from host-side storage;
 * - service and DTO contracts for resolving external metadata into trusted records;
 * - the default metadata service implementation.
 *
 * Date, path, and branded-value helpers are intentionally re-exported here because adapters, tests, and generated-data 
 * loaders must use the same normalization and validation rules as the service layer.
 *
 * Prefer importing from `@ravenhill/content-core` in application code. Imports from this internal path couple 
 * consumers to the current package layout and make future refactors more disruptive.
 *
 * @example
 * ```typescript
 * import {
 *   LessonMetadataService,
 *   type LessonMetadataRepository,
 * } from "@ravenhill/content-core";
 * ```
 */

// Date parsing, formatting, and display-fallback helpers.
export {
    DEFAULT_LESSON_METADATA_LOCALE,
    formatDate,
    formatLessonDate,
    type LessonDateDisplayResult,
    parseIsoShortDate,
    resolveLessonDateDisplay,
    UNKNOWN_LESSON_DATE_LABEL,
} from "./date";

// Branded semantic values and parsers for trusted metadata fields.
export {
    type AbsoluteUrl,
    type GitCommitHash,
    type IsoShortDate,
    type LessonSourceFile,
    type NonEmptyText,
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
} from "./branded-values";

// Default service implementation for lesson-metadata resolution.
export { LessonMetadataService } from "./lesson-metadata-service";

// Path normalization helper used to match lessons with metadata records.
export { normalizeLessonMetadataPathname } from "./pathname";

// Validated domain records returned through metadata lookup and resolution.
export type { LessonMetadataAuthor, LessonMetadataChange, LessonMetadataRecord } from "./records";

// Explicit boundary results for metadata lookup and service resolution.
export type { LessonMetadataIssue, LessonMetadataLookupResult, LessonMetadataResolutionResult } from "./results";

// Repository boundary implemented by host-side metadata adapters.
export type { LessonMetadataRepository } from "./repositories";

// External DTO contracts and service contract.
export type {
    LessonMetadataAuthorDto,
    LessonMetadataChangeDto,
    LessonMetadataDto,
    LessonMetadataServiceContract,
} from "./types";
