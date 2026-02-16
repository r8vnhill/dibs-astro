import path from "node:path";

export const GIT_FIELD_DELIMITER = "|";
const ISO_SHORT_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @typedef {{ name: string, url?: string }} LessonAuthor
 * @typedef {{ hash: string, date: string, author: string, subject: string }} Change
 * @typedef {{
 *   path: string,
 *   sourceFile: string,
 *   authors: LessonAuthor[],
 *   lastModified?: string,
 *   changes: Change[]
 * }} LessonMetadataEntry
 */

export const normalizePath = (value) => path.posix.normalize(value.replaceAll("\\", "/"));

const stripAstroExt = (value) => value.endsWith(".astro") ? value.slice(0, -".astro".length) : undefined;

const collapseIndexRoutes = (route) => {
    if (route === "index") return "";
    return route.endsWith("/index") ? route.slice(0, -"/index".length) : route;
};

const ensureLeadingSlash = (route) => route.startsWith("/") ? route : `/${route}`;

const ensureTrailingSlash = (route) => route.endsWith("/") ? route : `${route}/`;

export const toIsoShortDate = (value) => {
    const normalized = String(value).trim();
    if (!ISO_SHORT_DATE_REGEX.test(normalized)) return undefined;
    return normalized;
};

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

export const parseGitLogOutput = (raw, delimiter = GIT_FIELD_DELIMITER) => {
    const lines = raw.split(/\r?\n/);
    const changes = [];

    for (const line of lines) {
        const parsed = parseGitLogLine(line, delimiter);
        if (parsed) changes.push(parsed);
    }

    return changes;
};

export const sourceFileToLessonPath = (sourceFile, pagesRoot = "src/pages") => {
    const normalized = normalizePath(sourceFile);
    const root = normalizePath(pagesRoot).replace(/\/+$/, "");
    const rootPrefix = `${root}/`;
    const nestedMarker = `/${root}/`;
    let relative;
    if (normalized.startsWith(rootPrefix)) {
        relative = normalized.slice(rootPrefix.length);
    } else {
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

export const resolveAuthors = (
    lessonPath,
    authorsByPath,
    fallbackAuthorName,
) => {
    const authors = authorsByPath[lessonPath];
    if (Array.isArray(authors) && authors.length > 0) return authors;
    if (!fallbackAuthorName) return [];
    return [{ name: fallbackAuthorName }];
};

const compareIsoDatesDesc = (a, b) => b.localeCompare(a);

const getLatestChangeDate = (changes) => {
    if (changes.length === 0) return undefined;
    const dates = changes.map((change) => change.date).filter(Boolean);
    if (dates.length === 0) return undefined;
    return [...dates].sort(compareIsoDatesDesc)[0];
};

export const buildLessonMetadataEntry = (
    sourceFile,
    changes,
    authorsByPath,
    pagesRoot = "src/pages",
    fallbackAuthorName,
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
