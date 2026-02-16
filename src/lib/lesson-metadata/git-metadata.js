/**
 * @fileoverview
 *
 * Utilities to build lesson metadata from an Astro project and a `git log` export.
 *
 * The module focuses on three tasks:
 *
 * - Normalizing file paths so they are stable across platforms (Windows vs POSIX).
 * - Deriving a public lesson route (e.g. `/fp/functors/`) from an Astro source file path.
 * - Parsing `git log` output into structured change records and using them to compute a lesson’s
 *   `lastModified` date.
 *
 * ## Assumptions
 *
 * - Lesson source files live under a “pages root” (defaults to `src/pages`).
 * - Lessons are `.astro` files, and routes follow Astro conventions:
 *   - `index.astro` maps to the directory route (e.g. `foo/index.astro` -> `/foo/`).
 * - Git log entries are exported using a delimiter-based format, where the first three fields are
 *   `hash`, `date`, and `author`, and the remaining text is the commit subject (which may contain
 *   the delimiter).
 *
 * ## Recommended `git log` format
 *
 * This parser is simplest and most robust when your format ensures:
 *
 * - The delimiter does not appear in the first three fields.
 * - The date is already in ISO short form (`YYYY-MM-DD`).
 *
 * For example:
 *
 * ```ts
 * git log --date=short --pretty=format:"%H|%ad|%an|%s"
 * ```
 *
 * If you need a safer delimiter than `|`, consider using a rarely-used character (or even
 * NUL `\0`), but note that handling NUL may require extra care depending on how you capture stdout.
 */
import path from "node:path";

/**
 * Delimiter used when parsing `git log` output.
 *
 * The parsing logic assumes the line format is:
 *
 * - `hash | date | author | subject`
 *
 * Where `subject` may contain the delimiter. For this reason, the parser splits into
 * `[hash, date, author, ...subjectParts]` and joins the remainder back with the delimiter.
 *
 * If your commit subjects commonly include `|`, you may prefer switching to a different delimiter
 * at the `git log` call site and passing that value to the parsing functions.
 */
export const GIT_FIELD_DELIMITER = "|";

/**
 * Matches an ISO short date in the form `YYYY-MM-DD`.
 *
 * This module intentionally uses a strict date shape to keep metadata stable and avoid
 * locale-dependent parsing.
 */
const ISO_SHORT_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A lesson author record.
 *
 * @typedef {{ name: string, url?: string }} LessonAuthor
 */

/**
 * A single change entry derived from one `git log` line.
 *
 * @typedef {{ hash: string, date: string, author: string, subject: string }} Change
 */

/**
 * The metadata entry produced for one lesson.
 *
 * @typedef {{
 *   path: string,
 *   sourceFile: string,
 *   authors: LessonAuthor[],
 *   lastModified?: string,
 *   changes: Change[]
 * }} LessonMetadataEntry
 */

/**
 * Normalizes a path into POSIX form with stable separators.
 *
 * ## This function:
 *
 * - Replaces Windows backslashes (`\`) with forward slashes (`/`).
 * - Uses `{js} path.posix.normalize` to collapse `.` and `..` segments and canonicalize redundant
 *   slashes.
 *
 * This is useful because lesson paths are treated as *routes*, which are always
 * POSIX-like regardless of the host OS.
 *
 * @param {unknown} value
 *   A path-like value (will be coerced to string).
 * @returns {string}
 *   A POSIX-normalized path.
 */
export const normalizePath = (value) => path.posix.normalize(String(value).replaceAll("\\", "/"));

/**
 * Strips the `.astro` extension from a path if present.
 *
 * @param {string} value
 * @returns {string | undefined}
 *   The path without `.astro`, or `undefined` when the suffix is not present.
 */
const stripAstroExt = (value) =>
    value.endsWith(".astro") ? value.slice(0, -".astro".length) : undefined;

/**
 * Collapses “index routes” according to Astro conventions.
 *
 * - `index` becomes the root route (`""`), which later becomes `/`.
 * - `foo/index` becomes `foo`.
 *
 * @param {string} route
 * @returns {string}
 */
const collapseIndexRoutes = (route) => {
    if (route === "index") return "";
    return route.endsWith("/index") ? route.slice(0, -"/index".length) : route;
};

/**
 * Ensures a route begins with `/`.
 *
 * @param {string} route
 * @returns {string}
 */
const ensureLeadingSlash = (route) => (route.startsWith("/") ? route : `/${route}`);

/**
 * Ensures a route ends with `/`.
 *
 * @param {string} route
 * @returns {string}
 */
const ensureTrailingSlash = (route) => (route.endsWith("/") ? route : `${route}/`);

/**
 * Validates and returns an ISO short date (`YYYY-MM-DD`).
 *
 * This function does *not* attempt to parse arbitrary date strings. If you need to support other
 * formats, convert them at the `git log` call site (e.g. `--date=short`) or implement an explicit
 * parser.
 *
 * @param {unknown} value
 *   The candidate date value (coerced to string).
 * @returns {string | undefined}
 *   The validated ISO short date, or `undefined` if invalid.
 */
export const toIsoShortDate = (value) => {
    const normalized = String(value).trim();
    if (!ISO_SHORT_DATE_REGEX.test(normalized)) return undefined;
    return normalized;
};

/**
 * Parses a single `git log` output line into a {@link Change}.
 *
 * ## The expected line format is:
 *
 * - `{hash}{delimiter}{date}{delimiter}{author}{delimiter}{subject}`
 *
 * ## Notes:
 *
 * - Empty/whitespace-only lines return `undefined`.
 * - The date must already be `YYYY-MM-DD`; otherwise parsing fails.
 * - The subject may contain the delimiter; it is reconstructed by joining the remaining split
 *   parts.
 *
 * @param {string} line
 *   A single line from `git log` output.
 * @param {string} [delimiter=GIT_FIELD_DELIMITER]
 *   Field delimiter used by your `git log --pretty=format:...` template.
 * @returns {Change | undefined}
 *   The parsed change entry, or `undefined` if the line is invalid.
 */
export const parseGitLogLine = (line, delimiter = GIT_FIELD_DELIMITER) => {
    const trimmed = line.trim();
    if (!trimmed) return undefined;

    const [hashRaw, dateRaw, authorRaw, ...subjectParts] = trimmed.split(delimiter);
    const hash = hashRaw?.trim();
    const date = toIsoShortDate(dateRaw);
    const author = authorRaw?.trim();

    if (!hash || !date || !author) return undefined;

    return {
        hash,
        date,
        author,
        subject: subjectParts.join(delimiter).trim(),
    };
};

/**
 * Parses the full output of a `git log` export into a list of {@link Change}.
 *
 * The function is tolerant to:
 *
 * - Empty lines (ignored)
 * - Invalid lines (ignored)
 *
 * @param {string} raw
 *   The full stdout text produced by `git log`.
 * @param {string} [delimiter=GIT_FIELD_DELIMITER]
 *   Field delimiter used in the export format.
 * @returns {Change[]}
 *   The parsed changes in the same order they appear in the log output.
 */
export const parseGitLogOutput = (raw, delimiter = GIT_FIELD_DELIMITER) => {
    const lines = raw.split(/\r?\n/);
    const changes = [];

    for (const line of lines) {
        const parsed = parseGitLogLine(line, delimiter);
        if (parsed) changes.push(parsed);
    }

    return changes;
};

/**
 * Converts an Astro source file path into a canonical lesson route.
 *
 * Example mappings (with default `pagesRoot = "src/pages"`):
 *
 * - `src/pages/index.astro` -> `/`
 * - `src/pages/foo.astro` -> `/foo/`
 * - `src/pages/foo/index.astro` -> `/foo/`
 * - `some/nested/src/pages/bar/baz.astro` -> `/bar/baz/`
 *
 * ## Behavior:
 *
 * - Returns `undefined` if the file is not located under `pagesRoot`.
 * - Returns `undefined` if the file does not end with `.astro`.
 * - Collapses multiple slashes and always returns a trailing slash.
 *
 * @param {string} sourceFile
 *   The path to the `.astro` file (absolute or relative).
 * @param {string} [pagesRoot="src/pages"]
 *   The root folder used to derive routes.
 * @returns {string | undefined}
 *   The canonical lesson route (e.g. `/fp/functors/`), or `undefined` if not applicable.
 */
export const sourceFileToLessonPath = (sourceFile, pagesRoot = "src/pages") => {
    const normalized = normalizePath(sourceFile);
    const root = normalizePath(pagesRoot).replace(/\/+$/, "");
    const rootPrefix = `${root}/`;
    const nestedMarker = `/${root}/`;

    let relative;

    // Case 1: path begins with the pages root (common for relative paths).
    if (normalized.startsWith(rootPrefix)) {
        relative = normalized.slice(rootPrefix.length);
    } else {
        // Case 2: pages root appears as an internal segment (common for absolute paths).
        const index = normalized.indexOf(nestedMarker);
        if (index === -1) return undefined;
        relative = normalized.slice(index + nestedMarker.length);
    }

    const withoutExt = stripAstroExt(relative);
    if (!withoutExt) return undefined;

    const collapsed = collapseIndexRoutes(withoutExt);
    const leading = ensureLeadingSlash(collapsed);
    const compact = leading.replace(/\/+/g, "/");
    return ensureTrailingSlash(compact);
};

/**
 * Resolves authors for a lesson route using a lookup table.
 *
 * If the route is not present (or has no authors), the function:
 *
 * - Returns a single fallback author when `fallbackAuthorName` is provided.
 * - Otherwise returns an empty list.
 *
 * @param {string} lessonPath
 *   Lesson route (e.g. `/fp/functors/`).
 * @param {Record<string, LessonAuthor[] | undefined>} authorsByPath
 *   Lookup table keyed by lesson route.
 * @param {string | undefined} fallbackAuthorName
 *   Name used when no authors are found for the lesson.
 * @returns {LessonAuthor[]}
 */
export const resolveAuthors = (
    lessonPath,
    authorsByPath,
    fallbackAuthorName = undefined,
) => {
    const authors = authorsByPath[lessonPath];
    if (Array.isArray(authors) && authors.length > 0) return authors;
    if (!fallbackAuthorName) return [];
    return [{ name: fallbackAuthorName }];
};

/**
 * Compares ISO short dates in descending order (newest first).
 *
 * ISO short dates (`YYYY-MM-DD`) sort lexicographically the same way they sort chronologically,
 * which makes `localeCompare` sufficient and fast.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
const compareIsoDatesDesc = (a, b) => b.localeCompare(a);

/**
 * Computes the newest date across a list of {@link Change}.
 *
 * @param {Change[]} changes
 * @returns {string | undefined}
 *   The newest `change.date`, or `undefined` when no valid dates exist.
 */
const getLatestChangeDate = (changes) => {
    if (changes.length === 0) return undefined;

    const dates = changes.map((change) => change.date).filter(Boolean);
    if (dates.length === 0) return undefined;

    return [...dates].sort(compareIsoDatesDesc)[0];
};

/**
 * Builds a {@link LessonMetadataEntry} from a source file, its git changes, and author mappings.
 *
 * ## The function:
 *
 * - Derives the lesson route from `sourceFile` using {@link sourceFileToLessonPath}.
 * - Normalizes the `sourceFile` path for stable output.
 * - Resolves authors from `authorsByPath` (with optional fallback).
 * - Computes `lastModified` as the newest ISO date across the provided `changes`.
 *
 * ## Usage:
 *
 * Build metadata for a single source file after parsing a git log export.
 *
 * ### Example 1: Parse changes and build one entry
 *
 * ```ts
 * const raw = execSync(
 *   `git log --date=short --pretty=format:"%H|%ad|%an|%s" -- src/pages/fp/functors.astro`,
 *   { encoding: "utf8" },
 * );
 *
 * const changes = parseGitLogOutput(raw);
 *
 * const authorsByPath = {
 *   "/fp/functors/": [{ name: "Jane Doe", url: "https://example.com" }],
 * };
 *
 * const entry = buildLessonMetadataEntry(
 *   "src/pages/fp/functors.astro",
 *   changes,
 *   authorsByPath,
 *   "src/pages",
 *   "Fallback Author",
 * );
 * ```
 *
 * ### Example 2: Map multiple files
 * ```ts
 * const entries = sourceFiles
 *   .map((file) => buildLessonMetadataEntry(file, changesByFile[file] ?? [], authorsByPath))
 *   .filter(Boolean);
 * ```
 *
 * @param {string} sourceFile
 *   Path to the lesson’s `.astro` file.
 * @param {Change[]} changes
 *   Parsed changes for this file (order does not matter).
 * @param {Record<string, LessonAuthor[] | undefined>} authorsByPath
 *   Lookup table keyed by lesson route.
 * @param {string} [pagesRoot="src/pages"]
 *   Root folder used to derive routes.
 * @param {string | undefined} fallbackAuthorName
 *   Used when no authors are found for the lesson.
 * @returns {LessonMetadataEntry | undefined}
 *   The metadata entry, or `undefined` when `sourceFile` does not map to a lesson.
 */
export const buildLessonMetadataEntry = (
    sourceFile,
    changes,
    authorsByPath,
    pagesRoot = "src/pages",
    fallbackAuthorName = undefined,
) => {
    const lessonPath = sourceFileToLessonPath(sourceFile, pagesRoot);
    if (!lessonPath) return undefined;

    return {
        path: lessonPath,
        sourceFile: normalizePath(sourceFile),
        authors: resolveAuthors(lessonPath, authorsByPath, fallbackAuthorName),
        lastModified: getLatestChangeDate(changes),
        changes,
    };
};
