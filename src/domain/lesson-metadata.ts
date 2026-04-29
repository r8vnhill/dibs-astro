/**
 * @file Domain helpers for lesson metadata.
 *
 * This module contains pure logic for lesson metadata records, metadata lookup keys, and date display. It 
 * intentionally avoids I/O, framework-specific dependencies, and adapter concerns so domain, application, 
 * infrastructure, and compatibility-wrapper code can share the same contracts.
 *
 * ## Responsibilities
 *
 * - Define immutable metadata record types.
 * - Normalize lesson locations into metadata lookup keys.
 * - Parse `YYYY-MM-DD` calendar dates without accepting `Date` overflow.
 * - Format parsed dates with UTC-stable locale defaults.
 * - Resolve optional date text into an explicit display result.
 *
 * ## Contracts
 *
 * - Blank text is treated as missing.
 * - Valid metadata dates use the `YYYY-MM-DD` calendar-date form.
 * - Impossible calendar dates do not parse successfully.
 * - Invalid non-blank date text is preserved as trimmed passthrough text.
 * - Date formatting defaults to Chilean Spanish and UTC.
 * - Metadata lookup keys are canonical lesson routes, not full URLs.
 *
 * @see {@link LessonMetadataAuthor}
 * @see {@link LessonMetadataChange}
 * @see {@link LessonMetadataRecord}
 * @see {@link LessonDateDisplayResult}
 * @see {@link normalizeLessonMetadataPathname}
 * @see {@link parseIsoShortDate}
 * @see {@link formatLessonDate}
 */

import { LessonHref } from "./value-objects/LessonHref";

/** Author attribution stored in a lesson metadata record. */
export type LessonMetadataAuthor = Readonly<{
    /** Display name used for attribution. */
    name: string;

    /** Optional public profile or author page URL. */
    url?: string;
}>;

/** Commit-derived change entry for a lesson source file. */
export type LessonMetadataChange = Readonly<{
    /** Commit hash that introduced the change. */
    hash: string;

    /** Commit date as provided by the metadata source. */
    date: string;

    /** Commit author display name. */
    author: string;

    /** Commit subject line. */
    subject: string;
}>;

/**
 * Immutable metadata snapshot for a lesson source file.
 *
 * The record stores the source file, credited authors, optional last-modified text, and commit-derived change history 
 * used by the lesson metadata UI.
 */
export type LessonMetadataRecord = Readonly<{
    /** Source file from which this metadata record was produced. */
    sourceFile: string;

    /** People credited as lesson authors. */
    authors: readonly LessonMetadataAuthor[];

    /** Optional last-modified date text. */
    lastModified?: string;

    /** Commit-derived change history for the lesson source file. */
    changes: readonly LessonMetadataChange[];
}>;

/**
 * Display-ready interpretation of optional lesson date text.
 *
 * This result keeps absence, invalid text, and formatted dates separate so callers can decide whether to show a 
 * fallback label, preserve source text, or render a locale-formatted date.
 *
 * Variants:
 *
 * - `missing`: the date is absent, empty, or whitespace-only.
 * - `passthrough`: the date is non-empty but not a valid `YYYY-MM-DD` date.
 * - `formatted`: the date parsed successfully and was locale-formatted.
 */
export type LessonDateDisplayResult =
    | {
        /** Date text was absent, empty, or whitespace-only. */
        kind: "missing";
    }
    | {
        /** Date text was present but could not be parsed as a valid date. */
        kind: "passthrough";

        /** Trimmed source text that could not be parsed as a valid date. */
        value: string;
    }
    | {
        /** Date text parsed successfully and was locale-formatted. */
        kind: "formatted";

        /** Locale-formatted date text. */
        value: string;
    };

/** Default locale used when formatting lesson metadata dates. */
export const DEFAULT_LESSON_METADATA_LOCALE = "es-CL";

/** UI fallback used when no lesson date is recorded. */
export const UNKNOWN_LESSON_DATE_LABEL = "sin fecha registrada";

/**
 * Captures the three numeric components of an ISO-short calendar date.
 *
 * The pattern intentionally validates only the textual shape. Calendar correctness is checked later by round-tripping 
 * the parsed UTC components, because JavaScript `Date` can carry overflowing date components into later months or 
 * years instead of rejecting them.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#individual_date_and_time_component_values
 */
const ISO_SHORT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Pattern used to detect absolute HTTP(S) metadata locations.
 *
 * Metadata keys are route pathnames, not external URLs. Only explicit absolute HTTP(S) URLs need URL parsing so their
 * origins can be discarded. Route-like strings are left as text for {@link LessonHref} to canonicalize, which keeps
 * normalization idempotent for path characters that `URL` would percent-encode.
 */
const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//iu;

/**
 * Default formatting options for lesson metadata dates.
 *
 * The `timeZone` default is part of the domain contract. Lesson metadata dates represent date-only values, so 
 * formatting them in local time could shift the displayed day depending on the runtime environment.
 */
const DEFAULT_DATE_FORMAT_OPTIONS = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
} as const satisfies Intl.DateTimeFormatOptions;

/**
 * Trim optional text and collapse blank values to `undefined`.
 *
 * This helper centralizes the module's blank-text policy so parsing and display code treat `undefined`, empty strings, 
 * and whitespace-only strings the same way.
 *
 * @param value Optional text to normalize.
 * @returns Trimmed text, or `undefined` when the input is missing or blank.
 */
function normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
}

/**
 * Resolve user- or browser-provided lesson locations to pathname candidates.
 *
 * The input may be an absolute URL, a relative URL, or an already-normalized pathname. Query strings and hash 
 * fragments are discarded because lesson metadata records are keyed by canonical route path.
 *
 * Final route canonicalization is delegated to {@link LessonHref}.
 *
 * @param pathname Absolute URL, relative URL, or lesson pathname to normalize.
 * @returns Pathname candidate to validate with {@link LessonHref}.
 */
function toMetadataPathnameCandidate(pathname: string): string {
    const trimmed = pathname.trim();
    if (trimmed.length === 0) {
        return "/";
    }

    if (ABSOLUTE_HTTP_URL_PATTERN.test(trimmed)) {
        try {
            return new URL(trimmed).pathname;
        } catch {
            return trimmed;
        }
    }

    return trimmed;
}

/**
 * Mark unreachable discriminated-union branches.
 *
 * The helper lets TypeScript check exhaustiveness when {@link LessonDateDisplayResult} grows. If a new variant is 
 * added without updating the switch, the `never` parameter exposes the missing branch during type checking.
 *
 * @param value Value that should be unreachable.
 * @returns Never returns successfully.
 * @throws Always throws with the unexpected value serialized for debugging.
 */
function assertNever(value: never): never {
    throw new Error(`Unexpected lesson date display result: ${JSON.stringify(value)}`);
}

/**
 * Normalize a lesson location into a canonical metadata lookup key.
 *
 * The input may be a canonical path, a relative path, or an absolute URL. Query strings and hash fragments are 
 * discarded because metadata records are keyed by lesson route, not by a concrete browser URL.
 *
 * Blank input resolves to `/`. Final route canonicalization is delegated to {@link LessonHref}.
 *
 * @param pathname Absolute URL, relative URL, or lesson pathname to normalize.
 * @returns Canonical lesson route suitable for metadata record lookup.
 * @throws If {@link LessonHref.create} rejects the resolved pathname.
 */
export const normalizeLessonMetadataPathname = (pathname: string): string =>
    LessonHref.create(toMetadataPathnameCandidate(pathname)).value;

/**
 * Parse a `YYYY-MM-DD` calendar date into a UTC-backed {@link Date}.
 *
 * The parser is intentionally stricter than JavaScript's built-in date normalization. It round-trips the UTC year, 
 * month, and day fields so impossible dates such as `2025-02-30` return `undefined` instead of overflowing into 
 * another month.
 *
 * @param date Optional date text to parse.
 * @returns A UTC-backed {@link Date}, or `undefined` for missing or invalid text.
 */
export function parseIsoShortDate(date?: string): Date | undefined {
    const normalized = normalizeOptionalText(date);
    if (!normalized) {
        return undefined;
    }

    const match = ISO_SHORT_DATE_PATTERN.exec(normalized);
    if (!match) {
        return undefined;
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    const isSameDate = parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day;

    return isSameDate ? parsed : undefined;
}

/**
 * Format a date with lesson metadata defaults.
 *
 * Formatting defaults to `es-CL` and UTC so date-only metadata is stable across runtime timezones. Custom options are 
 * merged over the defaults, which means callers may still override fields such as `month`, `day`, or `timeZone`.
 *
 * @param date Date value to format.
 * @param locale BCP 47 locale used by {@link Intl.DateTimeFormat}.
 * @param options Formatting options merged over the module defaults.
 * @returns Locale-formatted date text.
 */
export const formatDate = (
    date: Date,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options: Intl.DateTimeFormatOptions = {},
): string =>
    new Intl.DateTimeFormat(locale, {
        ...DEFAULT_DATE_FORMAT_OPTIONS,
        ...options,
    }).format(date);

/**
 * Resolve optional lesson date text into a display result.
 *
 * Missing or blank text resolves to `missing`. Valid `YYYY-MM-DD` dates are parsed and formatted. Non-empty invalid 
 * text is returned as trimmed passthrough text so existing metadata remains visible instead of being hidden.
 *
 * @param date Optional lesson date text.
 * @param locale BCP 47 locale used when formatting valid dates.
 * @param options Formatting options merged over the module defaults.
 * @returns A {@link LessonDateDisplayResult} describing how the date should render.
 *
 * @example
 * ```ts
 * resolveLessonDateDisplay("2025-04-28", "es-CL");
 * // { kind: "formatted", value: "28 de abril de 2025" }
 * ```
 *
 * @example
 * ```ts
 * resolveLessonDateDisplay("not a date", "es-CL");
 * // { kind: "passthrough", value: "not a date" }
 * ```
 *
 * @example
 * ```ts
 * resolveLessonDateDisplay("   ", "es-CL");
 * // { kind: "missing" }
 * ```
 */
export function resolveLessonDateDisplay(
    date?: string,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options?: Intl.DateTimeFormatOptions,
): LessonDateDisplayResult {
    const normalized = normalizeOptionalText(date);
    if (!normalized) {
        return { kind: "missing" };
    }

    const parsed = parseIsoShortDate(normalized);
    if (!parsed) {
        return { kind: "passthrough", value: normalized };
    }

    return {
        kind: "formatted",
        value: formatDate(parsed, locale, options),
    };
}

/**
 * Format optional lesson date text as UI-ready text.
 *
 * This is the string-returning convenience wrapper around {@link resolveLessonDateDisplay}. It is useful for 
 * components that do not need to distinguish between formatted and passthrough dates.
 *
 * ## Output policy:
 *
 * - Missing or blank text returns {@link UNKNOWN_LESSON_DATE_LABEL}.
 * - Valid `YYYY-MM-DD` dates return locale-formatted text.
 * - Invalid non-blank text returns the trimmed passthrough value.
 *
 * @param date Optional lesson date text.
 * @param locale BCP 47 locale used when formatting valid dates.
 * @param options Formatting options merged over the module defaults.
 * @returns UI-ready date text.
 *
 * @example
 * ```ts
 * formatLessonDate("2025-04-28", "es-CL");
 * // "28 de abril de 2025"
 * ```
 *
 * @example
 * ```ts
 * formatLessonDate(undefined, "es-CL");
 * // "sin fecha registrada"
 * ```
 */
export function formatLessonDate(
    date?: string,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options?: Intl.DateTimeFormatOptions,
): string {
    const display = resolveLessonDateDisplay(date, locale, options);

    switch (display.kind) {
        case "missing":
            return UNKNOWN_LESSON_DATE_LABEL;
        case "passthrough":
        case "formatted":
            return display.value;
        default:
            return assertNever(display);
    }
}
