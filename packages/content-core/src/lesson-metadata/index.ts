/**
 * @packageDocumentation
 *
 * Internal barrel for the `lesson-metadata` submodule.
 *
 * This module gathers the lesson-metadata implementation behind a single local boundary. It exists to keep the 
 * submodule easy to consume from the package entry point while preserving freedom to reorganize the internal file 
 * layout.
 *
 * It re-exports:
 *
 * - metadata records for normalized domain-facing lesson metadata;
 * - DTO contracts for data received from host applications or generated files;
 * - repository contracts that isolate core services from host-side storage;
 * - service contracts and the default metadata service implementation;
 * - date helpers for parsing, formatting, and display fallback logic;
 * - path helpers for canonical lesson-metadata lookup keys.
 *
 * Date and path helpers are intentionally part of this submodule boundary because adapters, tests, and generated-data 
 * loaders must apply the same normalization rules as the service layer.
 *
 * Prefer importing from `@ravenhill/content-core` in application code. Importing from this internal path couples 
 * consumers to the current package layout and makes future refactors harder.
 *
 * @example
 * ```typescript
 * import {
 *   LessonMetadataServiceImpl,
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

// Default service implementation for lesson-metadata lookup.
export { LessonMetadataServiceImpl } from "./lesson-metadata-service";

// Path normalization helper used to match lessons with metadata records.
export { normalizeLessonMetadataPathname } from "./pathname";

// Normalized domain records returned by the metadata service.
export type { LessonMetadataAuthor, LessonMetadataChange, LessonMetadataRecord } from "./records";

// Repository boundary implemented by host-side adapters.
export type { LessonMetadataRepository } from "./repositories";

// Service and external DTO contracts.
export type {
    ILessonMetadataService,
    LessonMetadataAuthorDto,
    LessonMetadataChangeDto,
    LessonMetadataDto,
} from "./types";
