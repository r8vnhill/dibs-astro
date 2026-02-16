import type {
    AuthorRef,
    BibliographyJsonLd,
    NormalizedReference,
    ParseBibliographyOptions,
    ParsedBibliography,
    ResolvedReferenceGroups,
    ResolveGroupsOptions,
} from "./types";

const SUPPORTED_TYPES = new Set(["Book", "WebPage"]);

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

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

const getLocationFromUrl = (url: string): string => {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
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
        const hasAnyPage = pageStart !== undefined || pageEnd !== undefined;
        let pages: [number, number] | undefined;
        if (hasAnyPage) {
            const start = pageStart ?? pageEnd ?? 0;
            const end = pageEnd ?? pageStart ?? 0;
            pages = start <= end ? [start, end] : [end, start];
        }

        return {
            id,
            type: "Book",
            rawType,
            title,
            chapter: title,
            bookTitle,
            ...(pages ? { pages } : {}),
            ...(description ? { description } : {}),
            authors,
            ...(datePublished ? { datePublished } : {}),
            keywords,
            ...(publisherName ? { publisherName } : {}),
            ...(publisherUrl ? { publisherUrl } : {}),
            ...(sourceLabel ? { sourceLabel } : {}),
        };
    }

    const url = asString(rawItem.url);
    if (!url) {
        addError(errors, strict, `[${sourceLabel}] WebPage "${id}" is missing "url".`);
        return null;
    }

    const location = publisherName ?? getLocationFromUrl(url);

    return {
        id,
        type: "WebPage",
        rawType,
        title,
        url,
        ...(location ? { location } : {}),
        ...(description ? { description } : {}),
        authors,
        ...(datePublished ? { datePublished } : {}),
        keywords,
        ...(publisherName ? { publisherName } : {}),
        ...(publisherUrl ? { publisherUrl } : {}),
        ...(sourceLabel ? { sourceLabel } : {}),
    };
};

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
            `[${sourceLabel}] root "@type" must be "ItemList" but received "${
                rootType || "<empty>"
            }".`,
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
            `[${sourceLabel}] duplicate IDs across reference groups: ${
                Array.from(duplicates).join(", ")
            }.`,
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
