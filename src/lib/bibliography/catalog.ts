import type {
    AuthorRef,
    BibliographyCatalog,
    BookCitationStat,
    CatalogLesson,
    CatalogUsage,
    GetReferencesForLessonOptions,
    GetReferenceStatsOptions,
    LessonReferenceEntry,
    LessonReferenceGroups,
    LoadBibliographyCatalogOptions,
    NormalizedReference,
    ReferenceStat,
    ReferenceTag,
    SupportedReferenceType,
} from "./types";

const SUPPORTED_REFERENCE_TYPES = new Set<SupportedReferenceType>([
    "Book",
    "WebPage",
    "ScholarlyArticle",
    "Thesis",
]);

const SUPPORTED_TAGS = new Set<ReferenceTag>([
    "recommended",
    "additional",
    "pending-revision",
]);

const DEFAULT_INCLUDE_TAGS: ReferenceTag[] = ["recommended", "additional"];
const DEFAULT_EXCLUDE_TAGS: ReferenceTag[] = ["pending-revision"];

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
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
        return value.map(asString).find((item): item is string => !!item) ?? "";
    }
    return asString(value) ?? "";
};

const resolveNodeId = (value: unknown): string | undefined => {
    if (typeof value === "string") return asString(value);
    if (isObject(value)) return asString(value["@id"]);
    return undefined;
};

const toArray = (value: unknown): unknown[] =>
    Array.isArray(value) ? value : value == null ? [] : [value];

const fail = (message: string): never => {
    throw new Error(message);
};

const addError = (errors: string[], strict: boolean, message: string): void => {
    if (strict) fail(message);
    errors.push(message);
};

const parseInlineAuthor = (value: unknown): AuthorRef | null => {
    if (typeof value === "string") {
        const fullName = asString(value);
        return fullName ? { fullName } : null;
    }
    if (!isObject(value)) return null;

    const fullName = asString(value.name);
    const firstName = asString(value.givenName);
    const lastName = asString(value.familyName);
    const url = asString(value.url);

    if (!fullName && !firstName && !lastName) return null;

    return {
        ...(fullName ? { fullName } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(url ? { url } : {}),
    };
};

const getNodeTitle = (node: unknown): string | undefined => {
    if (typeof node === "string") return asString(node);
    if (!isObject(node)) return undefined;
    return asString(node.name) ?? asString(node.headline);
};

const getPublisherFromNode = (
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
    return publisherName ? { publisherName } : {};
};

const getLocationFromUrl = (url: string): string => {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
};

const resolveAuthors = (
    value: unknown,
    nodesById: Map<string, Record<string, unknown>>,
    errors: string[],
    strict: boolean,
    sourceLabel: string,
    referenceId: string,
): AuthorRef[] => {
    const authors: AuthorRef[] = [];

    for (const rawAuthor of toArray(value)) {
        const authorId = resolveNodeId(rawAuthor);
        if (authorId) {
            const authorNode = nodesById.get(authorId);
            if (!authorNode) {
                addError(
                    errors,
                    strict,
                    `[${sourceLabel}] reference "${referenceId}" points to missing author "${authorId}".`,
                );
                continue;
            }
            const parsed = parseInlineAuthor(authorNode);
            if (parsed) authors.push(parsed);
            continue;
        }

        const inline = parseInlineAuthor(rawAuthor);
        if (inline) authors.push(inline);
    }

    return authors;
};

const resolveLinkedTitle = (
    value: unknown,
    nodesById: Map<string, Record<string, unknown>>,
): { id?: string; title?: string } => {
    const id = resolveNodeId(value);
    if (id) {
        const node = nodesById.get(id);
        const title = node ? getNodeTitle(node) : undefined;
        return {
            ...(id ? { id } : {}),
            ...(title ? { title } : {}),
        };
    }

    const title = getNodeTitle(value);
    return title ? { title } : {};
};

const normalizeReferenceNode = (
    node: Record<string, unknown>,
    nodesById: Map<string, Record<string, unknown>>,
    sourceLabel: string,
    strict: boolean,
    errors: string[],
): NormalizedReference | null => {
    const id = asString(node["@id"]);
    const rawType = getType(node["@type"]);
    const title = asString(node.name) ?? asString(node.headline);

    if (!id || !SUPPORTED_REFERENCE_TYPES.has(rawType as SupportedReferenceType)) return null;
    if (!title) {
        addError(errors, strict, `[${sourceLabel}] reference "${id}" is missing "name".`);
        return null;
    }

    const authors = resolveAuthors(node.author, nodesById, errors, strict, sourceLabel, id);
    const description = asString(node.description);
    const datePublished = asString(node.datePublished);
    const keywords = toArray(node.keywords).map(asString).filter((item): item is string => !!item);

    let publisher = getPublisherFromNode(node.publisher);
    const publisherId = resolveNodeId(node.publisher);
    if (publisherId) {
        const publisherNode = nodesById.get(publisherId);
        if (!publisherNode) {
            addError(
                errors,
                strict,
                `[${sourceLabel}] reference "${id}" points to missing publisher "${publisherId}".`,
            );
        } else {
            publisher = getPublisherFromNode(publisherNode);
        }
    }

    if (rawType === "Book") {
        const container = resolveLinkedTitle(node.isPartOf, nodesById);
        const bookTitle = container.title;
        if (!bookTitle) {
            addError(
                errors,
                strict,
                `[${sourceLabel}] Book "${id}" is missing a resolvable "isPartOf".`,
            );
            return null;
        }

        const pageStart = asNumber(node.pageStart);
        const pageEnd = asNumber(node.pageEnd);
        let pages: [number, number] | undefined;
        if (pageStart !== undefined || pageEnd !== undefined) {
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
            ...(container.id ? { bookId: container.id } : {}),
            ...(pages ? { pages } : {}),
            ...(description ? { description } : {}),
            authors,
            ...(datePublished ? { datePublished } : {}),
            keywords,
            ...(publisher.publisherName ? { publisherName: publisher.publisherName } : {}),
            ...(publisher.publisherUrl ? { publisherUrl: publisher.publisherUrl } : {}),
            sourceLabel,
        };
    }

    const url = asString(node.url);
    if (!url) {
        addError(errors, strict, `[${sourceLabel}] reference "${id}" is missing "url".`);
        return null;
    }

    if (rawType === "WebPage") {
        const location = publisher.publisherName ?? getLocationFromUrl(url);
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
            ...(publisher.publisherName ? { publisherName: publisher.publisherName } : {}),
            ...(publisher.publisherUrl ? { publisherUrl: publisher.publisherUrl } : {}),
            sourceLabel,
        };
    }

    if (rawType === "ScholarlyArticle") {
        const container = resolveLinkedTitle(node.isPartOf, nodesById);
        const pageStart = asNumber(node.pageStart);
        const pageEnd = asNumber(node.pageEnd);
        let pages: [number, number] | undefined;
        if (pageStart !== undefined || pageEnd !== undefined) {
            const start = pageStart ?? pageEnd ?? 0;
            const end = pageEnd ?? pageStart ?? 0;
            pages = start <= end ? [start, end] : [end, start];
        }

        return {
            id,
            type: "ScholarlyArticle",
            rawType,
            title,
            url,
            ...(container.title ? { publication: container.title } : {}),
            ...(container.id ? { publicationId: container.id } : {}),
            ...(pages ? { pages } : {}),
            ...(description ? { description } : {}),
            authors,
            ...(datePublished ? { datePublished } : {}),
            keywords,
            ...(publisher.publisherName ? { publisherName: publisher.publisherName } : {}),
            ...(publisher.publisherUrl ? { publisherUrl: publisher.publisherUrl } : {}),
            sourceLabel,
        };
    }

    const institutionRef = resolveLinkedTitle(node.publisher ?? node.sourceOrganization, nodesById);
    return {
        id,
        type: "Thesis",
        rawType,
        title,
        url,
        ...(institutionRef.title ? { institution: institutionRef.title } : {}),
        ...(institutionRef.id ? { institutionId: institutionRef.id } : {}),
        ...(description ? { description } : {}),
        authors,
        ...(datePublished ? { datePublished } : {}),
        keywords,
        ...(publisher.publisherName ? { publisherName: publisher.publisherName } : {}),
        ...(publisher.publisherUrl ? { publisherUrl: publisher.publisherUrl } : {}),
        sourceLabel,
    };
};

const isLessonNode = (node: Record<string, unknown>): boolean => {
    const rawType = getType(node["@type"]);
    const id = asString(node["@id"]);
    return rawType === "LearningResource" || (!!id && id.startsWith("/notes/"));
};

const normalizeLessonNode = (node: Record<string, unknown>): CatalogLesson | null => {
    const id = asString(node["@id"]);
    if (!id) return null;
    const title = asString(node.name);
    const url = asString(node.url);
    return {
        id,
        rawType: getType(node["@type"]),
        ...(title ? { title } : {}),
        ...(url ? { url } : {}),
    };
};

const normalizeUsageNode = (
    node: Record<string, unknown>,
    lessonsById: Map<string, CatalogLesson>,
    referencesById: Map<string, NormalizedReference>,
    sourceLabel: string,
    strict: boolean,
    errors: string[],
): CatalogUsage | null => {
    const id = asString(node["@id"]);
    if (!id) {
        addError(errors, strict, `[${sourceLabel}] usage node is missing "@id".`);
        return null;
    }

    const lessonId = resolveNodeId(node["dibs:lesson"] ?? node.lesson);
    if (!lessonId) {
        addError(errors, strict, `[${sourceLabel}] usage "${id}" is missing lesson reference.`);
        return null;
    }

    const referenceId = resolveNodeId(node["dibs:reference"] ?? node.reference);
    if (!referenceId) {
        addError(errors, strict, `[${sourceLabel}] usage "${id}" is missing reference link.`);
        return null;
    }

    if (!lessonsById.has(lessonId)) {
        addError(
            errors,
            strict,
            `[${sourceLabel}] usage "${id}" points to missing lesson "${lessonId}".`,
        );
        return null;
    }

    if (!referencesById.has(referenceId)) {
        addError(
            errors,
            strict,
            `[${sourceLabel}] usage "${id}" points to missing reference "${referenceId}".`,
        );
        return null;
    }

    const tags = toArray(node["dibs:tags"] ?? node.tags)
        .map(asString)
        .filter((tag): tag is ReferenceTag => !!tag && SUPPORTED_TAGS.has(tag as ReferenceTag));

    if (tags.length === 0) {
        addError(
            errors,
            strict,
            `[${sourceLabel}] usage "${id}" must have at least one valid tag.`,
        );
        return null;
    }

    return {
        id,
        lessonId,
        referenceId,
        tags,
        rawType: getType(node["@type"]),
    };
};

export const loadBibliographyCatalog = (
    source: unknown,
    options: LoadBibliographyCatalogOptions = {},
): BibliographyCatalog => {
    const strict = options.strict ?? true;
    const sourceLabel = options.sourceLabel ?? "bibliography-catalog";
    const errors: string[] = [];

    if (!isObject(source)) fail(`[${sourceLabel}] catalog source must be an object.`);
    const sourceObject = source as Record<string, unknown>;
    const rawGraph = sourceObject["@graph"];
    if (!Array.isArray(rawGraph)) {
        fail(`[${sourceLabel}] catalog must include an "@graph" array.`);
    }
    const graph = rawGraph as unknown[];

    const nodesById = new Map<string, Record<string, unknown>>();
    for (const rawNode of graph) {
        if (!isObject(rawNode)) {
            addError(errors, strict, `[${sourceLabel}] graph node is not an object.`);
            continue;
        }
        const id = asString(rawNode["@id"]);
        if (!id) {
            addError(errors, strict, `[${sourceLabel}] graph node is missing "@id".`);
            continue;
        }
        if (nodesById.has(id)) {
            addError(errors, strict, `[${sourceLabel}] duplicate graph node id "${id}".`);
            continue;
        }
        nodesById.set(id, rawNode);
    }

    const references: NormalizedReference[] = [];
    const referencesById = new Map<string, NormalizedReference>();
    const lessons: CatalogLesson[] = [];
    const lessonsById = new Map<string, CatalogLesson>();

    for (const node of nodesById.values()) {
        const rawType = getType(node["@type"]);
        if (SUPPORTED_REFERENCE_TYPES.has(rawType as SupportedReferenceType)) {
            const normalized = normalizeReferenceNode(
                node,
                nodesById,
                sourceLabel,
                strict,
                errors,
            );
            if (!normalized) continue;
            references.push(normalized);
            referencesById.set(normalized.id, normalized);
            continue;
        }

        if (isLessonNode(node)) {
            const lesson = normalizeLessonNode(node);
            if (!lesson) continue;
            lessons.push(lesson);
            lessonsById.set(lesson.id, lesson);
        }
    }

    const usages: CatalogUsage[] = [];
    const usagesByLessonId = new Map<string, CatalogUsage[]>();
    const usagesByReferenceId = new Map<string, CatalogUsage[]>();

    for (const node of nodesById.values()) {
        if (getType(node["@type"]) !== "dibs:ReferenceUsage") continue;
        const usage = normalizeUsageNode(
            node,
            lessonsById,
            referencesById,
            sourceLabel,
            strict,
            errors,
        );
        if (!usage) continue;
        usages.push(usage);

        const lessonBucket = usagesByLessonId.get(usage.lessonId) ?? [];
        lessonBucket.push(usage);
        usagesByLessonId.set(usage.lessonId, lessonBucket);

        const refBucket = usagesByReferenceId.get(usage.referenceId) ?? [];
        refBucket.push(usage);
        usagesByReferenceId.set(usage.referenceId, refBucket);
    }

    if (!strict && errors.length > 0) {
        console.warn(`[${sourceLabel}] Non-strict parse warnings:\n- ${errors.join("\n- ")}`);
    }

    return {
        references,
        referencesById,
        lessons,
        lessonsById,
        usages,
        usagesByLessonId,
        usagesByReferenceId,
    };
};

const getFilterTags = (options: GetReferencesForLessonOptions | GetReferenceStatsOptions = {}) => {
    const includeTags = options.includeTags ?? DEFAULT_INCLUDE_TAGS;
    const excludeTags = options.excludeTags
        ?? (options.includePendingRevision ? [] : DEFAULT_EXCLUDE_TAGS);
    return { includeTags, excludeTags };
};

const usageMatchesTagFilters = (
    usage: CatalogUsage,
    options: GetReferencesForLessonOptions | GetReferenceStatsOptions = {},
): boolean => {
    const { includeTags, excludeTags } = getFilterTags(options);
    const includesAny = usage.tags.some((tag) => includeTags.includes(tag));
    const excludesAny = usage.tags.some((tag) => excludeTags.includes(tag));
    return includesAny && !excludesAny;
};

const buildLessonEntry = (
    catalog: BibliographyCatalog,
    usage: CatalogUsage,
): LessonReferenceEntry | null => {
    const reference = catalog.referencesById.get(usage.referenceId);
    return reference ? { reference, usage } : null;
};

const uniqueEntries = (entries: LessonReferenceEntry[]): LessonReferenceEntry[] => {
    const seen = new Set<string>();
    const unique: LessonReferenceEntry[] = [];
    for (const entry of entries) {
        if (seen.has(entry.reference.id)) continue;
        seen.add(entry.reference.id);
        unique.push(entry);
    }
    return unique;
};

export const getReferencesForLesson = (
    catalog: BibliographyCatalog,
    lessonId: string,
    options: GetReferencesForLessonOptions = {},
): LessonReferenceGroups => {
    const usages = catalog.usagesByLessonId.get(lessonId) ?? [];
    const filteredUsages = usages.filter((usage) => usageMatchesTagFilters(usage, options));

    const recommended = uniqueEntries(
        filteredUsages
            .filter((usage) => usage.tags.includes("recommended"))
            .map((usage) => buildLessonEntry(catalog, usage))
            .filter((entry): entry is LessonReferenceEntry => entry !== null),
    );

    const recommendedIds = new Set(recommended.map((entry) => entry.reference.id));

    const additional = uniqueEntries(
        filteredUsages
            .filter(
                (usage) =>
                    usage.tags.includes("additional") && !recommendedIds.has(usage.referenceId),
            )
            .map((usage) => buildLessonEntry(catalog, usage))
            .filter((entry): entry is LessonReferenceEntry => entry !== null),
    );

    const visibleIds = new Set([
        ...recommended.map((entry) => entry.reference.id),
        ...additional.map((entry) => entry.reference.id),
    ]);

    const pendingRevision = uniqueEntries(
        filteredUsages
            .filter(
                (usage) =>
                    usage.tags.includes("pending-revision")
                    && !visibleIds.has(usage.referenceId),
            )
            .map((usage) => buildLessonEntry(catalog, usage))
            .filter((entry): entry is LessonReferenceEntry => entry !== null),
    );

    return {
        recommended,
        additional,
        pendingRevision,
    };
};

export const getReferenceById = (
    catalog: BibliographyCatalog,
    referenceId: string,
): NormalizedReference | undefined => catalog.referencesById.get(referenceId);

export const getUsagesForReference = (
    catalog: BibliographyCatalog,
    referenceId: string,
): CatalogUsage[] => catalog.usagesByReferenceId.get(referenceId) ?? [];

export const getReferenceStats = (
    catalog: BibliographyCatalog,
    options: GetReferenceStatsOptions = {},
): ReferenceStat[] => {
    const counts = new Map<
        string,
        {
            reference: NormalizedReference;
            citationCount: number;
            lessons: Set<string>;
            tags: Set<ReferenceTag>;
        }
    >();

    for (const usage of catalog.usages) {
        if (!usageMatchesTagFilters(usage, options)) continue;
        const reference = catalog.referencesById.get(usage.referenceId);
        if (!reference) continue;
        if (options.types && !options.types.includes(reference.type)) continue;

        const current = counts.get(reference.id) ?? {
            reference,
            citationCount: 0,
            lessons: new Set<string>(),
            tags: new Set<ReferenceTag>(),
        };
        current.citationCount += 1;
        current.lessons.add(usage.lessonId);
        usage.tags.forEach((tag) => current.tags.add(tag));
        counts.set(reference.id, current);
    }

    return Array.from(counts.values())
        .map((entry) => ({
            referenceId: entry.reference.id,
            type: entry.reference.type,
            title: entry.reference.title,
            citationCount: entry.citationCount,
            lessonCount: entry.lessons.size,
            tags: Array.from(entry.tags).sort(),
        }))
        .sort((a, b) => b.citationCount - a.citationCount || a.title.localeCompare(b.title));
};

export const getMostCitedReferences = (
    catalog: BibliographyCatalog,
    options: GetReferenceStatsOptions = {},
): ReferenceStat[] => getReferenceStats(catalog, options);

export const getMostCitedBooks = (
    catalog: BibliographyCatalog,
    options: GetReferenceStatsOptions = {},
): BookCitationStat[] => {
    const counts = new Map<
        string,
        {
            bookId?: string;
            bookTitle: string;
            citationCount: number;
            lessons: Set<string>;
            chapterIds: Set<string>;
        }
    >();

    for (const usage of catalog.usages) {
        if (!usageMatchesTagFilters(usage, options)) continue;
        const reference = catalog.referencesById.get(usage.referenceId);
        if (!reference || reference.type !== "Book") continue;

        const key = reference.bookId ?? `book-title:${reference.bookTitle}`;
        const current = counts.get(key) ?? {
            ...(reference.bookId ? { bookId: reference.bookId } : {}),
            bookTitle: reference.bookTitle,
            citationCount: 0,
            lessons: new Set<string>(),
            chapterIds: new Set<string>(),
        };

        current.citationCount += 1;
        current.lessons.add(usage.lessonId);
        current.chapterIds.add(reference.id);
        counts.set(key, current);
    }

    return Array.from(counts.entries())
        .map(([bookKey, entry]) => ({
            bookKey,
            ...(entry.bookId ? { bookId: entry.bookId } : {}),
            bookTitle: entry.bookTitle,
            citationCount: entry.citationCount,
            lessonCount: entry.lessons.size,
            chapterIds: Array.from(entry.chapterIds).sort(),
        }))
        .sort((a, b) =>
            b.citationCount - a.citationCount || a.bookTitle.localeCompare(b.bookTitle)
        );
};

export const getReferencesByTag = (
    catalog: BibliographyCatalog,
    tag: ReferenceTag,
): NormalizedReference[] => {
    const seen = new Set<string>();
    const references: NormalizedReference[] = [];

    for (const usage of catalog.usages) {
        if (!usage.tags.includes(tag)) continue;
        const reference = catalog.referencesById.get(usage.referenceId);
        if (!reference || seen.has(reference.id)) continue;
        seen.add(reference.id);
        references.push(reference);
    }

    return references;
};
