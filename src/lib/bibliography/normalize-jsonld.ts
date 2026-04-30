import {
    normalizeBookReference,
    normalizeScholarlyArticleReference,
    normalizeThesisReference,
    normalizeVideoReference,
    normalizeWebPageReference,
} from "./normalize/normalize-reference.mjs";
import { parsePageReference } from "./pages";
import type {
    AuthorRef,
    BibliographyJsonLd,
    NormalizedReference,
    ParseBibliographyOptions,
    ParsedBibliography,
    ResolvedReferenceGroups,
    ResolveGroupsOptions,
} from "./types";

/**
 * JSON-LD normalization helpers for bibliography sources that use the simpler `ItemList` shape.
 *
 * Unlike `catalog.ts`, which consumes the generated graph artifact, this module accepts raw
 * bibliography JSON-LD and projects it into the shared `NormalizedReference` model used by the UI.
 *
 * The parser is intentionally narrow:
 * - only a small set of reference types is supported;
 * - page bounds are delegated to the shared page-reference parser;
 * - strict mode fails fast, while non-strict mode skips malformed entries and reports warnings.
 */
const SUPPORTED_TYPES = new Set(["Book", "WebPage", "VideoObject", "ScholarlyArticle", "Thesis"]);

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const asStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map(asString).filter((item): item is string => !!item);
    }
    const single = asString(value);
    return single ? [single] : [];
};

const asNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const getType = (value: unknown): string => {
    if (Array.isArray(value)) {
        const firstType = value.map(asString).find((item): item is string => !!item);
        return firstType ?? "";
    }
    return asString(value) ?? "";
};

const fail = (message: string): never => {
    throw new Error(message);
};

const addError = (errors: string[], strict: boolean, message: string): void => {
    if (strict) fail(message);
    errors.push(message);
};

const parseAuthorName = (entity: Record<string, unknown>): AuthorRef | null => {
    const fullName = asString(entity.name);
    const firstName = asString(entity.givenName);
    const lastName = asString(entity.familyName);
    const url = asString(entity.url);
    if (!fullName && !firstName && !lastName) return null;
    return {
        ...(fullName ? { fullName } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(url ? { url } : {}),
    };
};

const normalizeAuthors = (value: unknown): AuthorRef[] => {
    if (!value) return [];

    const rawAuthors = Array.isArray(value) ? value : [value];
    const authors: AuthorRef[] = [];

    for (const rawAuthor of rawAuthors) {
        if (typeof rawAuthor === "string") {
            const fullName = asString(rawAuthor);
            if (fullName) authors.push({ fullName });
            continue;
        }
        if (!isObject(rawAuthor)) continue;
        const parsed = parseAuthorName(rawAuthor);
        if (parsed) authors.push(parsed);
    }

    return authors;
};

const getBookTitle = (value: unknown): string | undefined => {
    if (typeof value === "string") return asString(value);
    if (isObject(value)) return asString(value.name);
    return undefined;
};

const getContainerTitle = (value: unknown): string | undefined => {
    if (typeof value === "string") return asString(value);
    if (isObject(value)) {
        return asString(value.name) ?? asString(value.headline);
    }
    return undefined;
};

const getPublisher = (
    value: unknown,
): { publisherName?: string; publisherUrl?: string } => {
    if (!value) return {};
    if (isObject(value)) {
        const publisherName = asString(value.name);
        const publisherUrl = asString(value.url);
        return {
            ...(publisherName ? { publisherName } : {}),
            ...(publisherUrl ? { publisherUrl } : {}),
        };
    }
    const publisherName = asString(value);
    return {
        ...(publisherName ? { publisherName } : {}),
    };
};

const normalizeItem = (
    rawItem: unknown,
    index: number,
    sourceLabel: string,
    strict: boolean,
    errors: string[],
): NormalizedReference | null => {
    if (!isObject(rawItem)) {
        addError(errors, strict, `[${sourceLabel}] itemListElement[${index}] is not an object.`);
        return null;
    }

    const id = asString(rawItem.identifier);
    if (!id) {
        addError(
            errors,
            strict,
            `[${sourceLabel}] itemListElement[${index}] missing "identifier".`,
        );
        return null;
    }

    const rawType = getType(rawItem["@type"]);
    if (!SUPPORTED_TYPES.has(rawType)) {
        addError(
            errors,
            strict,
            `[${sourceLabel}] item "${id}" has unsupported @type "${rawType || "<empty>"}".`,
        );
        return null;
    }

    const title = asString(rawItem.name) ?? asString(rawItem.headline);
    if (!title) {
        addError(errors, strict, `[${sourceLabel}] item "${id}" is missing "name".`);
        return null;
    }

    const authors = normalizeAuthors(rawItem.author);
    const description = asString(rawItem.description);
    const datePublished = asString(rawItem.datePublished);
    const keywords = asStringArray(rawItem.keywords);
    const { publisherName, publisherUrl } = getPublisher(rawItem.publisher);

    if (rawType === "Book") {
        const bookTitle = getBookTitle(rawItem.isPartOf);
        if (!bookTitle) {
            addError(
                errors,
                strict,
                `[${sourceLabel}] Book "${id}" is missing "isPartOf.name" (book title).`,
            );
            return null;
        }

        const pageStart = asNumber(rawItem.pageStart);
        const pageEnd = asNumber(rawItem.pageEnd);
        const pages = parsePageReference(pageStart, pageEnd);

        return normalizeBookReference({
            kind: "Book",
            id,
            rawType,
            title,
            bookTitle,
            ...(description ? { description } : {}),
            authors,
            ...(datePublished ? { datePublished } : {}),
            keywords,
            ...(publisherName ? { publisherName } : {}),
            ...(publisherUrl ? { publisherUrl } : {}),
            ...(sourceLabel ? { sourceLabel } : {}),
            ...(pages ? { pages } : {}),
        });
    }

    if (rawType === "ScholarlyArticle") {
        const url = asString(rawItem.url);
        if (!url) {
            addError(errors, strict, `[${sourceLabel}] ScholarlyArticle "${id}" is missing "url".`);
            return null;
        }

        const pageStart = asNumber(rawItem.pageStart);
        const pageEnd = asNumber(rawItem.pageEnd);
        const pages = parsePageReference(pageStart, pageEnd);

        const publication = getContainerTitle(rawItem.isPartOf) ?? publisherName;
        const publicationUrl = asString((rawItem.isPartOf as Record<string, unknown> | undefined)?.url);

        return normalizeScholarlyArticleReference({
            kind: "ScholarlyArticle",
            id,
            rawType,
            title,
            url,
            ...(publication ? { publication } : {}),
            ...(publicationUrl ? { publicationUrl } : {}),
            ...(description ? { description } : {}),
            authors,
            ...(datePublished ? { datePublished } : {}),
            keywords,
            ...(publisherName ? { publisherName } : {}),
            ...(publisherUrl ? { publisherUrl } : {}),
            ...(sourceLabel ? { sourceLabel } : {}),
            ...(pages ? { pages } : {}),
        });
    }

    if (rawType === "Thesis") {
        const url = asString(rawItem.url);
        if (!url) {
            addError(errors, strict, `[${sourceLabel}] Thesis "${id}" is missing "url".`);
            return null;
        }

        const institution = getContainerTitle(rawItem.publisher)
            ?? getContainerTitle(rawItem.sourceOrganization);
        const institutionUrl = asString((rawItem.publisher as Record<string, unknown> | undefined)?.url)
            ?? asString((rawItem.sourceOrganization as Record<string, unknown> | undefined)?.url);

        return normalizeThesisReference({
            kind: "Thesis",
            id,
            rawType,
            title,
            url,
            ...(institution ? { institution } : {}),
            ...(institutionUrl ? { institutionUrl } : {}),
            ...(description ? { description } : {}),
            authors,
            ...(datePublished ? { datePublished } : {}),
            keywords,
            ...(publisherName ? { publisherName } : {}),
            ...(publisherUrl ? { publisherUrl } : {}),
            ...(sourceLabel ? { sourceLabel } : {}),
        });
    }

    if (rawType === "VideoObject") {
        const url = asString(rawItem.url);
        if (!url) {
            addError(errors, strict, `[${sourceLabel}] VideoObject "${id}" is missing "url".`);
            return null;
        }

        return normalizeVideoReference({
            kind: "VideoObject",
            id,
            rawType,
            title,
            url,
            ...(description ? { description } : {}),
            authors,
            ...(datePublished ? { datePublished } : {}),
            keywords,
            ...(publisherName ? { platform: publisherName } : {}),
            ...(publisherUrl ? { platformUrl: publisherUrl } : {}),
            ...(publisherName ? { publisherName } : {}),
            ...(publisherUrl ? { publisherUrl } : {}),
            ...(sourceLabel ? { sourceLabel } : {}),
        });
    }

    const url = asString(rawItem.url);
    if (!url) {
        addError(errors, strict, `[${sourceLabel}] WebPage "${id}" is missing "url".`);
        return null;
    }

    return normalizeWebPageReference({
        kind: "WebPage",
        id,
        rawType,
        title,
        url,
        ...(description ? { description } : {}),
        authors,
        ...(datePublished ? { datePublished } : {}),
        keywords,
        ...(publisherName ? { publisherName } : {}),
        ...(publisherUrl ? { publisherUrl } : {}),
        ...(sourceLabel ? { sourceLabel } : {}),
    });
};

/**
 * Parse a bibliography JSON-LD `ItemList` into normalized references keyed by `identifier`.
 *
 * The return value preserves input order for `items` and also builds a `byId` map for later
 * grouping. Duplicate identifiers are rejected because group resolution relies on them as stable
 * keys.
 */
export const parseBibliography = (
    source: unknown,
    options: ParseBibliographyOptions = {},
): ParsedBibliography => {
    const strict = options.strict ?? true;
    const sourceLabel = options.sourceLabel ?? "bibliography";
    const errors: string[] = [];

    if (!isObject(source)) fail(`[${sourceLabel}] JSON-LD source must be an object.`);
    const jsonld = source as BibliographyJsonLd;

    const rootType = getType(jsonld["@type"]);
    if (rootType !== "ItemList") {
        addError(
            errors,
            strict,
            `[${sourceLabel}] root "@type" must be "ItemList" but received "${rootType || "<empty>"}".`,
        );
    }

    if (!Array.isArray(jsonld.itemListElement)) {
        fail(`[${sourceLabel}] "itemListElement" must be an array.`);
    }
    const itemListElement = jsonld.itemListElement as unknown[];

    const byId = new Map<string, NormalizedReference>();
    const items: NormalizedReference[] = [];

    itemListElement.forEach((item, index) => {
        const normalized = normalizeItem(item, index, sourceLabel, strict, errors);
        if (!normalized) return;
        if (byId.has(normalized.id)) {
            addError(
                errors,
                strict,
                `[${sourceLabel}] duplicate identifier "${normalized.id}" in itemListElement.`,
            );
            return;
        }
        byId.set(normalized.id, normalized);
        items.push(normalized);
    });

    if (!strict && errors.length > 0) {
        // Keep non-strict behavior deterministic and visible in logs/CI.
        // eslint-disable-next-line no-console
        console.warn(`[${sourceLabel}] Non-strict parse warnings:\n- ${errors.join("\n- ")}`);
    }

    const name = asString(jsonld.name);
    const about = asString(jsonld.about);
    return {
        ...(name ? { name } : {}),
        ...(about ? { about } : {}),
        items,
        byId,
    };
};

/**
 * Resolve curated recommended/additional groups from a previously parsed bibliography.
 *
 * In strict mode, duplicate ids across groups and unknown ids are treated as authoring errors. In
 * all modes, each output group preserves the first occurrence order from the provided id list.
 */
export const resolveReferenceGroups = (
    parsed: ParsedBibliography,
    recommendedIds: string[],
    additionalIds: string[] = [],
    options: ResolveGroupsOptions = {},
): ResolvedReferenceGroups => {
    const strict = options.strict ?? true;
    const sourceLabel = options.sourceLabel ?? "bibliography";
    const allGroupIds = [...recommendedIds, ...additionalIds];
    const uniqueIds = new Set<string>();
    const duplicates = new Set<string>();

    for (const id of allGroupIds) {
        if (uniqueIds.has(id)) duplicates.add(id);
        uniqueIds.add(id);
    }

    if (duplicates.size > 0 && strict) {
        fail(
            `[${sourceLabel}] duplicate IDs across reference groups: ${Array.from(duplicates).join(", ")}.`,
        );
    }

    const unknownIds = allGroupIds.filter((id) => !parsed.byId.has(id));
    if (unknownIds.length > 0 && strict) {
        fail(`[${sourceLabel}] unknown reference IDs: ${unknownIds.join(", ")}.`);
    }

    const pick = (ids: string[]): NormalizedReference[] => {
        const selected: NormalizedReference[] = [];
        const seen = new Set<string>();
        for (const id of ids) {
            if (seen.has(id)) continue;
            seen.add(id);
            const item = parsed.byId.get(id);
            if (!item) continue;
            selected.push(item);
        }
        return selected;
    };

    return {
        recommended: pick(recommendedIds),
        additional: pick(additionalIds),
    };
};

/**
 * Extract fallback titles directly from raw JSON-LD without requiring full normalization.
 *
 * This helper is used by UIs that want a lightweight id -> title map even when a full
 * `parseBibliography` pass is not available or would be too strict for the current context.
 * `name` takes precedence over `headline`, and malformed entries are ignored.
 */
export function extractFallbackTitles(
    source: unknown,
): Record<string, string> {
    const fallbackTitles: Record<string, string> = {};

    if (typeof source !== "object" || source === null) {
        return fallbackTitles;
    }

    const sourceObj = source as Record<string, unknown>;

    if (!Array.isArray(sourceObj.itemListElement)) {
        return fallbackTitles;
    }

    for (const rawItem of sourceObj.itemListElement) {
        if (typeof rawItem !== "object" || rawItem === null) {
            continue;
        }

        const item = rawItem as Record<string, unknown>;
        const id = asString(item.identifier);
        if (!id) continue;

        // Prefer 'name' over 'headline' for title fallback
        const title = asString(item.name) ?? asString(item.headline);
        if (title) {
            fallbackTitles[id] = title;
        }
    }

    return fallbackTitles;
}
