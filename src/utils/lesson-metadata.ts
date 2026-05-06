/**
 * @file Infrastructure-facing boundary for the generated lesson metadata dataset.
 *
 * This module wraps `lesson-metadata.generated.json` and exposes a small, runtime-validated API for reading lesson 
 * metadata. The generated JSON is treated as an infrastructure artifact: callers should not import it directly from 
 * application or presentation code.
 *
 * The boundary provides:
 *
 * - runtime validation through Zod;
 * - normalized metadata lookup by lesson pathname;
 * - UTC-stable date parsing and formatting helpers;
 * - a cached default dataset for repeated reads;
 * - compatibility exports for existing metadata consumers.
 *
 * ## Dataset model
 *
 * The generated dataset has the following high-level shape:
 *
 * - `generatedAt`: ISO timestamp for the generation run.
 * - `totalLessons`: number of lesson entries in the dataset.
 * - `changesLimit`: maximum number of git changes stored per lesson.
 * - `entries`: map from normalized lesson route to metadata entry.
 *
 * ## Architectural role
 *
 * Production code should normally access lesson metadata through the infrastructure adapter layer instead of importing 
 * the generated JSON directly. This module remains the validation and compatibility surface behind those adapters.
 *
 * ## Normalized route contract
 *
 * Dataset keys are canonical lesson routes. They are expected to:
 *
 * - start with `/`;
 * - end with `/`;
 * - contain no repeated slashes;
 * - contain no query string or fragment;
 * - represent index pages through their containing route.
 *
 * {@link normalizeLessonPathname} accepts relative paths, absolute paths, and URL-like input. It discards query 
 * strings and fragments before delegating canonicalization to the domain lesson metadata normalizer.
 */
import { z } from "zod";
import metadataRaw from "../data/lesson-metadata.generated.json";
import {
    DEFAULT_LESSON_METADATA_LOCALE,
    formatDate as formatDomainDate,
    formatLessonDate as formatDomainLessonDate,
    normalizeLessonMetadataPathname,
    parseIsoShortDate as parseDomainIsoShortDate,
    UNKNOWN_LESSON_DATE_LABEL,
} from "@ravenhill/content-core";

/**
 * Default locale used when formatting lesson metadata dates.
 *
 * The domain formatting helpers use `Intl.DateTimeFormat`, so callers may override this locale per call when they need 
 * a different display language.
 */
export const DEFAULT_LOCALE = DEFAULT_LESSON_METADATA_LOCALE;

/**
 * Fallback label used when a lesson date is missing or intentionally unknown.
 */
export const UNKNOWN_DATE_LABEL = UNKNOWN_LESSON_DATE_LABEL;

/**
 * Zod schema for an author associated with a lesson.
 *
 * Authors are usually resolved by the metadata generator from the lesson author registry. The URL is optional because 
 * some authors may only have a display name.
 */
const lessonMetadataAuthorSchema = z.object({
    name: z.string(),
    url: z.url().optional(),
}).strict();

/**
 * Zod schema for a git change entry associated with a lesson.
 *
 * Change entries are derived from git history and stored as JSON-friendly strings. Dates are kept as ISO short date 
 * strings and parsed on demand by {@link parseIsoShortDate}.
 */
const lessonMetadataChangeSchema = z.object({
    hash: z.string(),
    date: z.string().refine((date) => parseDomainIsoShortDate(date) !== undefined),
    author: z.string(),
    subject: z.string(),
}).strict();

/**
 * Zod schema for one lesson metadata entry.
 *
 * `lastModified` is optional because metadata generation may run in environments where git history is incomplete or 
 * unavailable, such as shallow CI clones.
 */
const lessonMetadataEntrySchema = z.object({
    sourceFile: z.string(),
    authors: z.array(lessonMetadataAuthorSchema),
    lastModified: z.string().refine((date) => parseDomainIsoShortDate(date) !== undefined).optional(),
    changes: z.array(lessonMetadataChangeSchema),
}).strict();

/**
 * Zod schema for the full generated lesson metadata dataset.
 *
 * The `entries` object is keyed by normalized lesson route. This schema validates the JSON shape at runtime before the 
 * dataset is exposed to callers.
 */
const lessonMetadataDatasetSchema = z.object({
    generatedAt: z.iso.datetime(),
    totalLessons: z.number().int().nonnegative(),
    changesLimit: z.number().int().nonnegative(),
    entries: z.record(
        z.string().refine((route) => normalizeLessonMetadataPathname(route) === route),
        lessonMetadataEntrySchema,
    ),
}).strict().superRefine((dataset, context) => {
    const entries = Object.values(dataset.entries);

    if (dataset.totalLessons !== entries.length) {
        context.addIssue({
            code: "custom",
            message: "totalLessons must match the number of metadata entries",
            path: ["totalLessons"],
        });
    }

    entries.forEach((entry, entryIndex) => {
        if (entry.changes.length > dataset.changesLimit) {
            context.addIssue({
                code: "custom",
                message: "entry changes must not exceed changesLimit",
                path: ["entries", entryIndex, "changes"],
            });
        }
    });
});

/**
 * Author metadata associated with a lesson.
 *
 * This type is inferred from {@link lessonMetadataAuthorSchema}, keeping the TypeScript representation aligned with 
 * runtime validation.
 *
 * @property name Display name of the author.
 * @property url Optional external profile, homepage, or reference URL.
 */
export type LessonMetadataAuthor = z.infer<typeof lessonMetadataAuthorSchema>;

/**
 * Git change metadata associated with a lesson.
 *
 * This type is inferred from {@link lessonMetadataChangeSchema}, keeping the TypeScript representation aligned with 
 * runtime validation.
 *
 * @property hash Commit hash, usually abbreviated by the generator.
 * @property date ISO short date string in `YYYY-MM-DD` format.
 * @property author Commit author name.
 * @property subject Commit subject line.
 */
export type LessonMetadataChange = z.infer<typeof lessonMetadataChangeSchema>;

/**
 * Metadata associated with a single lesson route.
 *
 * Entries are stored under normalized route keys in {@link LessonMetadataDataset.entries}.
 *
 * @property sourceFile Relative path to the lesson source file.
 * @property authors Authors associated with the lesson.
 * @property lastModified Optional most recent ISO short date from git history.
 * @property changes Recent git changes, bounded by the dataset `changesLimit`.
 */
export type LessonMetadataEntry = z.infer<typeof lessonMetadataEntrySchema>;

/**
 * Runtime-validated representation of the generated lesson metadata dataset.
 *
 * This type is inferred from {@link lessonMetadataDatasetSchema}, keeping the compile-time model aligned with the Zod 
 * runtime boundary.
 *
 * @property generatedAt ISO timestamp indicating when the dataset was produced.
 * @property totalLessons Number of lesson entries in the dataset.
 * @property changesLimit Maximum number of changes retained per lesson.
 * @property entries Mapping from normalized route to lesson metadata entry.
 */
export type LessonMetadataDataset = z.infer<typeof lessonMetadataDatasetSchema>;
export type ReadonlyLessonMetadataAuthor = Readonly<LessonMetadataAuthor>;
export type ReadonlyLessonMetadataChange = Readonly<LessonMetadataChange>;
export type ReadonlyLessonMetadataEntry = Readonly<{
    sourceFile: string;
    authors: readonly ReadonlyLessonMetadataAuthor[];
    lastModified?: string;
    changes: readonly ReadonlyLessonMetadataChange[];
}>;
export type ReadonlyLessonMetadataDataset = Readonly<{
    generatedAt: string;
    totalLessons: number;
    changesLimit: number;
    entries: Readonly<Record<string, ReadonlyLessonMetadataEntry>>;
}>;

export class LessonMetadataDatasetError extends Error {
    constructor(cause: unknown) {
        super("Lesson metadata dataset is invalid.", { cause });
        this.name = "LessonMetadataDatasetError";
    }
}

/**
 * Cached validated dataset for the default generated metadata source.
 *
 * The generated JSON is parsed once on first access through {@link getLessonMetadataDataset}. Subsequent calls reuse 
 * the cached value to avoid repeated validation work.
 */
let datasetCache: ReadonlyLessonMetadataDataset | undefined;

/**
 * Normalizes a pathname into the canonical route-key format used by lesson metadata.
 *
 * This is a compatibility export over the domain lesson metadata normalizer.
 * It accepts loose input and returns the route format used by
 * {@link LessonMetadataDataset.entries}.
 *
 * ## Usage:
 *
 * ### Example 1: Relative lesson path
 *
 * ```ts
 * normalizeLessonPathname("notes/foo");
 * // "/notes/foo/"
 * ```
 *
 * ### Example 2: URL-like input
 *
 * ```ts
 * normalizeLessonPathname("https://example.com/notes/foo?draft=true#top");
 * // "/notes/foo/"
 * ```
 *
 * @param pathname Raw pathname, relative path, or URL-like string.
 * @returns Normalized route key suitable for metadata lookup.
 */
export const normalizeLessonPathname = (pathname: string): string => {
    return normalizeLessonMetadataPathname(pathname);
};

/**
 * Parses a real ISO short calendar date into a UTC `Date`.
 *
 * This helper delegates to the domain lesson metadata date parser. It accepts
 * only real dates in `YYYY-MM-DD` format and returns dates at midnight UTC to
 * avoid local timezone shifts during display.
 *
 * Invalid, impossible, blank, or missing dates return `undefined`.
 *
 * @param date ISO short date string, or `undefined`.
 * @returns Parsed UTC date, or `undefined` when the input is invalid or absent.
 */
export const parseIsoShortDate = (date?: string): Date | undefined => {
    return parseDomainIsoShortDate(date);
};

/**
 * Formats a `Date` using the lesson metadata default display locale.
 *
 * Default formatting is UTC-stable and includes year, month, and day. Callers
 * may provide a custom locale or `Intl.DateTimeFormatOptions` when a different
 * presentation is needed.
 *
 * The default options are passed directly to the domain formatter. Callers may
 * override `timeZone`, but the default keeps UTC to avoid off-by-one-day
 * display bugs.
 *
 * @param date Date to format.
 * @param locale BCP 47 locale tag. Defaults to {@link DEFAULT_LOCALE}.
 * @param options Formatting options for `Intl.DateTimeFormat`.
 * @returns Locale-formatted date string.
 */
export const formatDate = (
    date: Date,
    locale = DEFAULT_LOCALE,
    options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    },
): string => {
    return formatDomainDate(date, locale, options);
};

/**
 * Formats a lesson metadata date string for display.
 *
 * This helper accepts the date representation stored in the generated metadata
 * dataset and converts it into UI-ready text.
 *
 * ## Behavior:
 *
 * - missing dates return {@link UNKNOWN_DATE_LABEL};
 * - blank dates return {@link UNKNOWN_DATE_LABEL};
 * - valid ISO short dates are parsed in UTC and formatted;
 * - invalid non-blank strings are returned trimmed, preserving source data.
 *
 * ## Usage:
 *
 * ### Example 1: Default locale
 *
 * ```ts
 * formatLessonDate("2026-02-16");
 * // e.g. "16 de febrero de 2026"
 * ```
 *
 * ### Example 2: Custom locale
 *
 * ```ts
 * formatLessonDate("2026-02-16", "en-GB");
 * // "16 February 2026"
 * ```
 *
 * @param date ISO short date string, arbitrary display string, or `undefined`.
 * @param locale BCP 47 locale tag. Defaults to {@link DEFAULT_LOCALE}.
 * @param options Optional formatting options for `Intl.DateTimeFormat`.
 * @returns Display string suitable for lesson metadata UI.
 */
export const formatLessonDate = (
    date?: string,
    locale = DEFAULT_LOCALE,
    options?: Intl.DateTimeFormatOptions,
): string => {
    return formatDomainLessonDate(date, locale, options);
};

/**
 * Validates and parses a dataset-like value as lesson metadata.
 *
 * This is the runtime safety boundary for the generated JSON artifact. It
 * should be used for arbitrary or imported metadata sources before exposing
 * them to application or presentation code.
 *
 * The current implementation validates the dataset shape through Zod and
 * returns the parsed value. More specific semantic validation can be added here
 * without changing downstream consumers.
 *
 * @param source Arbitrary input value, usually imported JSON.
 * @returns Validated lesson metadata dataset.
 * @throws {z.ZodError} If the source does not match the expected schema.
 */
const freezeLessonMetadataDataset = (
    dataset: LessonMetadataDataset,
): ReadonlyLessonMetadataDataset => {
    const entries = Object.fromEntries(
        Object.entries(dataset.entries).map(([route, entry]) => [
            route,
            Object.freeze({
                sourceFile: entry.sourceFile,
                authors: Object.freeze(entry.authors.map((author) => Object.freeze({ ...author }))),
                ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
                changes: Object.freeze(entry.changes.map((change) => Object.freeze({ ...change }))),
            }),
        ]),
    ) as Record<string, ReadonlyLessonMetadataEntry>;

    return Object.freeze({
        generatedAt: dataset.generatedAt,
        totalLessons: dataset.totalLessons,
        changesLimit: dataset.changesLimit,
        entries: Object.freeze(entries),
    });
};

export const parseLessonMetadataDataset = (source: unknown): ReadonlyLessonMetadataDataset => {
    const result = lessonMetadataDatasetSchema.safeParse(source);
    if (!result.success) {
        throw new LessonMetadataDatasetError(result.error);
    }

    return freezeLessonMetadataDataset(result.data);
};

/**
 * Returns the default validated lesson metadata dataset.
 *
 * The first call validates `lesson-metadata.generated.json` with
 * {@link parseLessonMetadataDataset} and stores the result in a module-local
 * cache. Later calls return the same cached dataset instance.
 *
 * @returns Validated generated lesson metadata dataset.
 * @throws {z.ZodError} If the generated JSON does not match the expected schema.
 */
export const getLessonMetadataDataset = (): ReadonlyLessonMetadataDataset => {
    if (!datasetCache) {
        datasetCache = parseLessonMetadataDataset(metadataRaw);
    }
    return datasetCache;
};

/**
 * Resets the module-local generated metadata cache.
 *
 * @deprecated Prefer injecting an explicit parsed dataset in tests instead of
 * resetting module state. This hook exists only for legacy cache-dependent
 * tests and should not be used by production code.
 */
export const __resetLessonMetadataCache = (): void => {
    datasetCache = undefined;
};

export type LessonMetadataRepository = Readonly<{
    dataset(): ReadonlyLessonMetadataDataset;
    resolve(pathname: string): ReadonlyLessonMetadataEntry | undefined;
}>;

export const createLessonMetadataRepository = (source: unknown): LessonMetadataRepository => {
    let cache: ReadonlyLessonMetadataDataset | undefined;

    const dataset = (): ReadonlyLessonMetadataDataset => {
        cache ??= parseLessonMetadataDataset(source);
        return cache;
    };

    return {
        dataset,
        resolve(pathname: string): ReadonlyLessonMetadataEntry | undefined {
            return resolveLessonMetadata(pathname, dataset());
        },
    };
};

/**
 * Resolves lesson metadata for a pathname using a metadata dataset.
 *
 * The input is normalized through {@link normalizeLessonPathname} before being
 * looked up in `source.entries`.
 *
 * By default, this function reads from {@link getLessonMetadataDataset}. Tests
 * or adapters may pass an explicit dataset to avoid depending on the default
 * generated metadata cache.
 *
 * ## Usage:
 *
 * ### Example 1: Resolve from the current browser route
 *
 * ```ts
 * const entry = resolveLessonMetadata(window.location.pathname);
 * ```
 *
 * ### Example 2: Resolve from a known lesson route
 *
 * ```ts
 * const entry = resolveLessonMetadata("/notes/scripting/first-script/");
 * ```
 *
 * ### Example 3: Resolve from an explicit dataset
 *
 * ```ts
 * const dataset = parseLessonMetadataDataset(rawMetadata);
 * const entry = resolveLessonMetadata("/notes/foo/", dataset);
 * ```
 *
 * @param pathname Raw pathname, relative path, or URL-like string.
 * @param source Dataset to query. Defaults to the generated metadata dataset.
 * @returns Matching metadata entry, or `undefined` when no entry exists.
 * @throws {z.ZodError} If the default generated dataset is invalid.
 */
export const resolveLessonMetadata = (
    pathname: string,
    source: ReadonlyLessonMetadataDataset = getLessonMetadataDataset(),
): ReadonlyLessonMetadataEntry | undefined => {
    const normalized = normalizeLessonPathname(pathname);
    return source.entries[normalized];
};
