/**
 * @file lesson-metadata.ts
 *
 * Runtime-safe accessors and utilities for the generated lesson metadata dataset.
 *
 * This module wraps `lesson-metadata.generated.json` with:
 *
 * - **Runtime validation** via `{ts} zod` (protects against shape drift).
 * - **Convenient lookup** by URL pathname (normalized routes).
 * - **Date parsing/formatting** helpers for presenting lesson timestamps.
 *
 * ## Dataset model
 *
 * The generator produces a dataset with the following high-level shape:
 *
 * - `generatedAt`: ISO timestamp when the dataset was built.
 * - `totalLessons`: number of entries in the dataset.
 * - `changesLimit`: maximum number of git log entries per lesson.
 * - `entries`: route → metadata entry map (routes are normalized and end in `/`).
 *
 * Validation is performed once on first access and cached via {@link getLessonMetadataDataset}.
 *
 * ## Normalized route contract
 *
 * Routes in `entries` are expected to:
 *
 * - start with `/`
 * - end with `/`
 * - contain no repeated slashes (`//`)
 * - collapse index routes at generation time (e.g. `/foo/index.astro` → `/foo/`)
 *
 * {@link normalizeLessonPathname} enforces these invariants for lookup keys.
 */
import { z } from "zod";
import metadataRaw from "../data/lesson-metadata.generated.json";

/**
 * Default locale used when formatting dates for display.
 *
 * The formatting helpers use `{ts} Intl.DateTimeFormat` under the hood, so callers may override
 * this per call.
 */
export const DEFAULT_LOCALE = "es-CL";

/**
 * Fallback label returned by {@link formatLessonDate} when no date is available.
 */
export const UNKNOWN_DATE_LABEL = "sin fecha registrada";

/**
 * Zod schema for a lesson author.
 *
 * Authors are typically resolved from `lesson-authors.json` during generation.
 */
const lessonMetadataAuthorSchema = z.object({
    name: z.string(),
    url: z.string().optional(),
});

/**
 * Zod schema for a git change entry.
 *
 * This is derived from `git log --date=short` output and is intentionally stored as strings to
 * keep the generated artifact JSON-friendly.
 */
const lessonMetadataChangeSchema = z.object({
    hash: z.string(),
    date: z.string(),
    author: z.string(),
    subject: z.string(),
});

/**
 * Zod schema for a lesson metadata entry.
 *
 * `lastModified` is optional because:
 *
 * - some lessons may have no git history available
 * - git execution may fail (e.g. in shallow CI clones)
 */
const lessonMetadataEntrySchema = z.object({
    sourceFile: z.string(),
    authors: z.array(lessonMetadataAuthorSchema),
    lastModified: z.string().optional(),
    changes: z.array(lessonMetadataChangeSchema),
});

/**
 * Zod schema for the full dataset.
 *
 * The `entries` map is keyed by normalized lesson route.
 */
const lessonMetadataDatasetSchema = z.object({
    generatedAt: z.string(),
    totalLessons: z.number(),
    changesLimit: z.number(),
    entries: z.record(z.string(), lessonMetadataEntrySchema),
});

/**
 * Type representing an author associated with a lesson.
 *
 * This is inferred directly from {@link lessonMetadataAuthorSchema}, ensuring that the
 * compile-time type always matches the runtime-validated schema.
 *
 * ## Fields:
 *
 * - `name`: Display name of the author.
 * - `url` (optional): Optional external profile or homepage link.
 *
 * Typically resolved from `lesson-authors.json` during metadata generation.
 */
export type LessonMetadataAuthor = z.infer<typeof lessonMetadataAuthorSchema>;

/**
 * Type representing a single git change entry for a lesson.
 *
 * Inferred from {@link lessonMetadataChangeSchema}.
 *
 * ## Fields:
 *
 * - `hash`: Commit hash (usually abbreviated).
 * - `date`: ISO short date (`YYYY-MM-DD`) as emitted by `git log --date=short`.
 * - `author`: Commit author name.
 * - `subject`: Commit subject line.
 *
 * Dates are intentionally stored as strings in the dataset and parsed on demand via
 * {@link parseIsoShortDate}.
 */
export type LessonMetadataChange = z.infer<typeof lessonMetadataChangeSchema>;

/**
 * Type representing the metadata associated with a single lesson route.
 *
 * Inferred from {@link lessonMetadataEntrySchema}.
 *
 * ## Fields:
 *
 * - `sourceFile`: Relative path to the `.astro` source file.
 * - `authors`: List of authors for the lesson.
 * - `lastModified` (optional): Most recent ISO short date derived from git history.
 * - `changes`: Truncated list of recent git changes (bounded by `changesLimit`).
 *
 * Instances of this type are stored under `dataset.entries[route]`, where `route` is a normalized
 * pathname ending with `/`.
 */
export type LessonMetadataEntry = z.infer<typeof lessonMetadataEntrySchema>;

/**
 * Type representing the full generated lesson metadata dataset.
 *
 * Inferred from {@link lessonMetadataDatasetSchema}.
 *
 * ## Top-level structure:
 *
 * - `generatedAt`: ISO timestamp indicating when the dataset was produced.
 * - `totalLessons`: Number of lesson entries in the dataset.
 * - `changesLimit`: Maximum number of changes retained per lesson.
 * - `entries`: Mapping from normalized route → {@link LessonMetadataEntry}.
 *
 * This type is the validated, runtime-safe representation returned by
 * {@link getLessonMetadataDataset}.
 */
export type LessonMetadataDataset = z.infer<typeof lessonMetadataDatasetSchema>;

/**
 * Cache for the validated dataset.
 *
 * The generated JSON is parsed and validated once on first access via
 * {@link getLessonMetadataDataset}, then reused to avoid repeated schema checks.
 */
let datasetCache: LessonMetadataDataset | undefined;

/**
 * Normalizes a pathname into the canonical lesson route format used by the dataset.
 *
 * ## Normalization rules:
 *
 * - Trims surrounding whitespace.
 * - Treats empty input as `/`.
 * - Strips a leading origin if a full URL is provided (e.g. `https://site/...`).
 * - Ensures a leading slash.
 * - Collapses repeated slashes (`//` → `/`).
 * - Ensures a trailing slash.
 *
 * ## Usage:
 *
 * ### Example 1: Basic path
 *
 * ```ts
 * normalizeLessonPathname("notes/foo") // "/notes/foo/"
 * ```
 *
 * ### Example 2: Full URL
 *
 * ```ts
 * normalizeLessonPathname("https://example.com/notes/foo")
 * // "/notes/foo/"
 * ```
 *
 * @param pathname Raw pathname or URL string.
 * @returns Normalized route key suitable for `dataset.entries`.
 */
export const normalizeLessonPathname = (pathname: string): string => {
    const trimmed = pathname.trim();
    if (trimmed.length === 0) return "/";

    const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, "");
    const withLeading = withoutOrigin.startsWith("/") ? withoutOrigin : `/${withoutOrigin}`;
    const compact = withLeading.replace(/\/+/g, "/");
    return compact.endsWith("/") ? compact : `${compact}/`;
};

/**
 * Parses an ISO short date (`YYYY-MM-DD`) into a UTC `{ts} Date`.
 *
 * ## This helper is intentionally strict:
 *
 * - Accepts only `YYYY-MM-DD`.
 * - Interprets the date in UTC (`T00:00:00.000Z`) to avoid local timezone shifts.
 *
 * @param date ISO short date string.
 * @returns A valid `{ts} Date` in UTC, or `undefined` if invalid/absent.
 */
export const parseIsoShortDate = (date?: string): Date | undefined => {
    if (!date) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;

    const parsed = new Date(`${date}T00:00:00.000Z`);
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
};

/**
 * Formats a `{ts} Date` using `{ts} Intl.DateTimeFormat`.
 *
 * Default options are chosen to produce a stable, human-readable date:
 *
 * - year/month/day
 * - `timeZone: "UTC"` to avoid local offsets
 *
 * @param date A valid `{ts} Date`.
 * @param locale BCP 47 locale tag (defaults to {@link DEFAULT_LOCALE}).
 * @param options `{ts} Intl.DateTimeFormatOptions` for custom formatting.
 * @returns A locale-formatted date string.
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
    return date.toLocaleDateString(locale, options);
};

/**
 * Formats a lesson date string for display.
 *
 * ## Behavior:
 *
 * - If `date` is missing: returns {@link UNKNOWN_DATE_LABEL}.
 * - If `date` is not a valid ISO short date: returns the original string unchanged.
 * - Otherwise: parses the ISO short date in UTC and formats it via {@link formatDate}.
 *
 * ## Usage:
 *
 * ### Example 1: Default formatting
 *
 * ```ts
 * formatLessonDate("2026-02-16") // e.g. "16 de febrero de 2026"
 * ```
 *
 * ### Example 2: Custom locale
 *
 * ```ts
 * formatLessonDate("2026-02-16", "en-GB") // "16 February 2026"
 * ```
 *
 * @param date ISO short date (`YYYY-MM-DD`) or undefined.
 * @param locale BCP 47 locale tag.
 * @param options Optional `{ts} Intl.DateTimeFormatOptions` override.
 * @returns Display string suitable for UI
 */
export const formatLessonDate = (
    date?: string,
    locale = DEFAULT_LOCALE,
    options?: Intl.DateTimeFormatOptions,
): string => {
    if (!date) return UNKNOWN_DATE_LABEL;

    const parsed = parseIsoShortDate(date);
    if (!parsed) return date;
    return formatDate(parsed, locale, options);
};

/**
 * Validates and parses a dataset-like value into a {@link LessonMetadataDataset}.
 *
 * This is the main runtime safety boundary for the generated JSON artefact.
 *
 * @param source Arbitrary input value (e.g. imported JSON).
 * @returns Validated dataset.
 * @throws {z.ZodError} If validation fails.
 */
export const parseLessonMetadataDataset = (source: unknown): LessonMetadataDataset => {
    return lessonMetadataDatasetSchema.parse(source);
};

/**
 * Returns the validated lesson metadata dataset, caching the result.
 *
 * The first call validates `lesson-metadata.generated.json` against the Zod schema. Subsequent
 * calls return the cached value.
 *
 * @returns Validated {@link LessonMetadataDataset}.
 * @throws {z.ZodError} If the generated JSON does not match the expected schema.
 */
export const getLessonMetadataDataset = (): LessonMetadataDataset => {
    if (!datasetCache) {
        datasetCache = parseLessonMetadataDataset(metadataRaw);
    }
    return datasetCache;
};

/**
 * Resolves a metadata entry for a given pathname.
 *
 * The lookup key is normalized via {@link normalizeLessonPathname}.
 *
 * ## Usage:
 *
 * ### Example 1: Resolve from current route
 *
 * ```ts
 * const entry = resolveLessonMetadata(window.location.pathname);
 * ```
 *
 * ### Example 2: Resolve from a known lesson path
 * 
 * ```ts
 * resolveLessonMetadata("/notes/software-libraries/scripting/first-script/");
 * ```
 *
 * @param pathname Raw pathname or URL (e.g. `"/notes/foo"` or `"https://site/notes/foo"`).
 * @param source Dataset to query (defaults to {@link getLessonMetadataDataset}).
 * @returns The matching {@link LessonMetadataEntry}, or `undefined` if not found.
 */
export const resolveLessonMetadata = (
    pathname: string,
    source: LessonMetadataDataset = getLessonMetadataDataset(),
): LessonMetadataEntry | undefined => {
    const normalized = normalizeLessonPathname(pathname);
    return source.entries[normalized];
};
