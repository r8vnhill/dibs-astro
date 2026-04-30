import { normalizeReference } from "./normalize/normalize-reference.mjs";
import { parsePageReference } from "./pages-core.mjs";

const SUPPORTED_REFERENCE_TYPES = new Set([
    "Book",
    "WebPage",
    "VideoObject",
    "ScholarlyArticle",
    "Thesis",
]);

const SUPPORTED_TAGS = new Set([
    "recommended",
    "additional",
    "pending-revision",
]);

const DEFAULT_INCLUDE_TAGS = ["recommended", "additional"];
const DEFAULT_EXCLUDE_TAGS = ["pending-revision"];

const isObject = (value) => typeof value === "object" && value !== null;

const asString = (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const asNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const getType = (value) => {
    if (Array.isArray(value)) {
        return value.map(asString).find((item) => !!item) ?? "";
    }
    return asString(value) ?? "";
};

const resolveNodeId = (value) => {
    if (typeof value === "string") return asString(value);
    if (isObject(value)) return asString(value["@id"]);
    return undefined;
};

const toArray = (value) => Array.isArray(value) ? value : value == null ? [] : [value];

const getUsageTags = (node) =>
    toArray(node["dibs:tags"] ?? node.tags)
        .map(asString)
        .filter((tag) => !!tag && SUPPORTED_TAGS.has(tag));

const fail = (message) => {
    throw new Error(message);
};

const addError = (errors, strict, message) => {
    if (strict) fail(message);
    errors.push(message);
};

const parseInlineAuthor = (value) => {
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

const getNodeTitle = (node) => {
    if (typeof node === "string") return asString(node);
    if (!isObject(node)) return undefined;
    return asString(node.name) ?? asString(node.headline);
};

const getPublisherFromNode = (value) => {
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

const resolveAuthors = (
    value,
    nodesById,
    errors,
    strict,
    sourceLabel,
    referenceId,
) => {
    const authors = [];

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

const resolveLinkedTitle = (value, nodesById) => {
    const id = resolveNodeId(value);
    if (id) {
        const node = nodesById.get(id);
        const title = node ? getNodeTitle(node) : undefined;
        const url = node ? asString(node.url) : undefined;
        return {
            ...(id ? { id } : {}),
            ...(title ? { title } : {}),
            ...(url ? { url } : {}),
        };
    }

    const title = getNodeTitle(value);
    const url = isObject(value) ? asString(value.url) : undefined;
    return {
        ...(title ? { title } : {}),
        ...(url ? { url } : {}),
    };
};

const buildBaseReferenceInput = (base) => ({
    id: base.id,
    rawType: base.rawType,
    title: base.title,
    ...(base.description ? { description: base.description } : {}),
    authors: base.authors,
    ...(base.datePublished ? { datePublished: base.datePublished } : {}),
    keywords: base.keywords,
    ...(base.publisherName ? { publisherName: base.publisherName } : {}),
    ...(base.publisherUrl ? { publisherUrl: base.publisherUrl } : {}),
    ...(base.sourceLabel ? { sourceLabel: base.sourceLabel } : {}),
});

const buildBookReferenceInput = (node, context, base) => {
    const container = resolveLinkedTitle(node.isPartOf, context.nodesById);
    const bookTitle = container.title;
    if (!bookTitle) {
        addError(
            context.errors,
            context.effectiveStrict,
            `[${context.sourceLabel}] Book "${base.id}" is missing a resolvable "isPartOf".`,
        );
        return null;
    }

    const pages = parsePageReference(asNumber(node.pageStart), asNumber(node.pageEnd));

    return {
        ...buildBaseReferenceInput(base),
        kind: "Book",
        bookTitle,
        ...(container.id ? { bookId: container.id } : {}),
        ...(pages ? { pages } : {}),
    };
};

const buildWebPageReferenceInput = (node, context, base, url) => ({
    ...buildBaseReferenceInput(base),
    kind: "WebPage",
    url,
});

const buildVideoReferenceInput = (node, context, base, url) => ({
    ...buildBaseReferenceInput(base),
    kind: "VideoObject",
    url,
});

const buildScholarlyArticleReferenceInput = (node, context, base, url) => {
    const container = resolveLinkedTitle(node.isPartOf, context.nodesById);
    const pages = parsePageReference(asNumber(node.pageStart), asNumber(node.pageEnd));

    return {
        ...buildBaseReferenceInput(base),
        kind: "ScholarlyArticle",
        url,
        ...(container.title ? { publication: container.title } : {}),
        ...(container.id ? { publicationId: container.id } : {}),
        ...(container.url ? { publicationUrl: container.url } : {}),
        ...(pages ? { pages } : {}),
    };
};

const buildThesisReferenceInput = (node, context, base, url) => {
    const institutionRef = resolveLinkedTitle(node.publisher ?? node.sourceOrganization, context.nodesById);

    return {
        ...buildBaseReferenceInput(base),
        kind: "Thesis",
        url,
        ...(institutionRef.title ? { institution: institutionRef.title } : {}),
        ...(institutionRef.id ? { institutionId: institutionRef.id } : {}),
        ...(institutionRef.url ? { institutionUrl: institutionRef.url } : {}),
    };
};

const buildReferenceInput = (node, context, base) => {
    if (base.rawType === "Book") {
        return buildBookReferenceInput(node, context, base);
    }

    const url = asString(node.url);
    if (!url) {
        addError(
            context.errors,
            context.effectiveStrict,
            `[${context.sourceLabel}] reference "${base.id}" is missing "url".`,
        );
        return null;
    }

    if (base.rawType === "WebPage") {
        return buildWebPageReferenceInput(node, context, base, url);
    }

    if (base.rawType === "VideoObject") {
        return buildVideoReferenceInput(node, context, base, url);
    }

    if (base.rawType === "ScholarlyArticle") {
        return buildScholarlyArticleReferenceInput(node, context, base, url);
    }

    return buildThesisReferenceInput(node, context, base, url);
};

const normalizeReferenceNode = (
    node,
    nodesById,
    sourceLabel,
    strict,
    errors,
    toleratedReferenceIds,
) => {
    const id = asString(node["@id"]);
    const rawType = getType(node["@type"]);
    const title = asString(node.name) ?? asString(node.headline);

    if (!id || !SUPPORTED_REFERENCE_TYPES.has(rawType)) return null;
    const effectiveStrict = strict && !toleratedReferenceIds.has(id);
    if (!title) {
        addError(errors, effectiveStrict, `[${sourceLabel}] reference "${id}" is missing "name".`);
        return null;
    }

    const publisherId = resolveNodeId(node.publisher);
    const publisherNode = publisherId ? nodesById.get(publisherId) : undefined;
    if (publisherId && !publisherNode) {
        addError(
            errors,
            effectiveStrict,
            `[${sourceLabel}] reference "${id}" points to missing publisher "${publisherId}".`,
        );
    }

    const publisher = publisherNode
        ? getPublisherFromNode(publisherNode)
        : getPublisherFromNode(node.publisher);
    const description = asString(node.description);
    const datePublished = asString(node.datePublished);
    const keywords = toArray(node.keywords).map(asString).filter((item) => !!item);
    const authors = resolveAuthors(node.author, nodesById, errors, effectiveStrict, sourceLabel, id);

    const base = {
        id,
        rawType,
        title,
        ...(description ? { description } : {}),
        authors,
        ...(datePublished ? { datePublished } : {}),
        keywords,
        ...(publisher.publisherName ? { publisherName: publisher.publisherName } : {}),
        ...(publisher.publisherUrl ? { publisherUrl: publisher.publisherUrl } : {}),
        sourceLabel,
    };
    const context = { nodesById, errors, effectiveStrict, sourceLabel };

    const input = buildReferenceInput(node, context, base);
    return input ? normalizeReference(input) : null;
};

const isLessonNode = (node) => {
    const rawType = getType(node["@type"]);
    const id = asString(node["@id"]);
    return rawType === "LearningResource" || (!!id && id.startsWith("/notes/"));
};

const normalizeLessonNode = (node) => {
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
    node,
    lessonsById,
    referencesById,
    sourceLabel,
    strict,
    errors,
    toleratedUsageIds,
) => {
    const id = asString(node["@id"]);
    if (!id) {
        addError(errors, strict, `[${sourceLabel}] usage node is missing "@id".`);
        return null;
    }
    const effectiveStrict = strict && !toleratedUsageIds.has(id);
    const tags = getUsageTags(node);

    const lessonId = resolveNodeId(node["dibs:lesson"] ?? node.lesson);
    const referenceId = resolveNodeId(node["dibs:reference"] ?? node.reference);

    if (!lessonId) {
        addError(errors, effectiveStrict, `[${sourceLabel}] usage "${id}" is missing lesson reference.`);
        return null;
    }

    if (!referenceId) {
        addError(errors, effectiveStrict, `[${sourceLabel}] usage "${id}" is missing reference link.`);
        return null;
    }

    if (!lessonsById.has(lessonId)) {
        addError(errors, effectiveStrict, `[${sourceLabel}] usage "${id}" points to missing lesson "${lessonId}".`);
        return null;
    }

    if (!referencesById.has(referenceId)) {
        addError(
            errors,
            effectiveStrict,
            `[${sourceLabel}] usage "${id}" points to missing reference "${referenceId}".`,
        );
        return null;
    }

    if (tags.length === 0) {
        addError(errors, effectiveStrict, `[${sourceLabel}] usage "${id}" must have at least one valid tag.`);
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

const collectPendingTolerance = (nodesById) => {
    const tagsByReferenceId = new Map();
    const pendingOnlyUsageIds = new Set();

    for (const node of nodesById.values()) {
        if (getType(node["@type"]) !== "dibs:ReferenceUsage") continue;

        const usageId = asString(node["@id"]);
        const referenceId = resolveNodeId(node["dibs:reference"] ?? node.reference);
        const tags = getUsageTags(node);

        if (usageId && tags.length === 1 && tags[0] === "pending-revision") {
            pendingOnlyUsageIds.add(usageId);
        }

        if (!referenceId || tags.length === 0) continue;

        const existing = tagsByReferenceId.get(referenceId) ?? new Set();
        tags.forEach((tag) => existing.add(tag));
        tagsByReferenceId.set(referenceId, existing);
    }

    const pendingOnlyReferenceIds = new Set();
    for (const [referenceId, tags] of tagsByReferenceId) {
        if (tags.size === 1 && tags.has("pending-revision")) {
            pendingOnlyReferenceIds.add(referenceId);
        }
    }

    return { pendingOnlyReferenceIds, pendingOnlyUsageIds };
};

export const loadBibliographyCatalog = (source, options = {}) => {
    const strict = options.strict ?? true;
    const sourceLabel = options.sourceLabel ?? "bibliography-catalog";
    const errors = [];

    if (!isObject(source)) fail(`[${sourceLabel}] catalog source must be an object.`);
    const rawGraph = source["@graph"];
    if (!Array.isArray(rawGraph)) {
        fail(`[${sourceLabel}] catalog must include an "@graph" array.`);
    }

    const nodesById = new Map();
    for (const rawNode of rawGraph) {
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

    const { pendingOnlyReferenceIds, pendingOnlyUsageIds } = collectPendingTolerance(nodesById);
    const references = [];
    const referencesById = new Map();
    const lessons = [];
    const lessonsById = new Map();

    for (const node of nodesById.values()) {
        const rawType = getType(node["@type"]);
        if (SUPPORTED_REFERENCE_TYPES.has(rawType)) {
            const normalized = normalizeReferenceNode(
                node,
                nodesById,
                sourceLabel,
                strict,
                errors,
                pendingOnlyReferenceIds,
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

    const usages = [];
    const usagesByLessonId = new Map();
    const usagesByReferenceId = new Map();

    for (const node of nodesById.values()) {
        if (getType(node["@type"]) !== "dibs:ReferenceUsage") continue;
        const usage = normalizeUsageNode(
            node,
            lessonsById,
            referencesById,
            sourceLabel,
            strict,
            errors,
            pendingOnlyUsageIds,
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

const getFilterTags = (options = {}) => {
    const includeTags = options.includeTags ?? DEFAULT_INCLUDE_TAGS;
    const excludeTags = options.excludeTags
        ?? (options.includePendingRevision ? [] : DEFAULT_EXCLUDE_TAGS);
    return { includeTags, excludeTags };
};

export const usageMatchesTagFilters = (usage, options = {}) => {
    const { includeTags, excludeTags } = getFilterTags(options);
    const includesAny = usage.tags.some((tag) => includeTags.includes(tag));
    const excludesAny = usage.tags.some((tag) => excludeTags.includes(tag));
    return includesAny && !excludesAny;
};

const buildLessonEntry = (catalog, usage) => {
    const reference = catalog.referencesById.get(usage.referenceId);
    return reference ? { reference, usage } : null;
};

const uniqueEntries = (entries) => {
    const seen = new Set();
    const unique = [];
    for (const entry of entries) {
        if (seen.has(entry.reference.id)) continue;
        seen.add(entry.reference.id);
        unique.push(entry);
    }
    return unique;
};

export const getReferencesForLesson = (catalog, lessonId, options = {}) => {
    const usages = catalog.usagesByLessonId.get(lessonId) ?? [];
    const filteredUsages = usages.filter((usage) => usageMatchesTagFilters(usage, options));

    const recommended = uniqueEntries(
        filteredUsages
            .filter((usage) => usage.tags.includes("recommended"))
            .map((usage) => buildLessonEntry(catalog, usage))
            .filter((entry) => entry !== null),
    );

    const recommendedIds = new Set(recommended.map((entry) => entry.reference.id));
    const additional = uniqueEntries(
        filteredUsages
            .filter((usage) => usage.tags.includes("additional") && !recommendedIds.has(usage.referenceId))
            .map((usage) => buildLessonEntry(catalog, usage))
            .filter((entry) => entry !== null),
    );

    const visibleIds = new Set([
        ...recommended.map((entry) => entry.reference.id),
        ...additional.map((entry) => entry.reference.id),
    ]);
    const pendingRevision = uniqueEntries(
        filteredUsages
            .filter((usage) => usage.tags.includes("pending-revision") && !visibleIds.has(usage.referenceId))
            .map((usage) => buildLessonEntry(catalog, usage))
            .filter((entry) => entry !== null),
    );

    return { recommended, additional, pendingRevision };
};

export const getReferenceById = (catalog, referenceId) => catalog.referencesById.get(referenceId);

export const getUsagesForReference = (catalog, referenceId) => catalog.usagesByReferenceId.get(referenceId) ?? [];

export const getReferenceStats = (catalog, options = {}) => {
    const counts = new Map();

    for (const usage of catalog.usages) {
        if (!usageMatchesTagFilters(usage, options)) continue;
        const reference = catalog.referencesById.get(usage.referenceId);
        if (!reference) continue;
        if (options.types && !options.types.includes(reference.type)) continue;

        const current = counts.get(reference.id) ?? {
            reference,
            citationCount: 0,
            lessons: new Set(),
            tags: new Set(),
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

export const getMostCitedReferences = (catalog, options = {}) => getReferenceStats(catalog, options);

export const getMostCitedBooks = (catalog, options = {}) => {
    const counts = new Map();

    for (const usage of catalog.usages) {
        if (!usageMatchesTagFilters(usage, options)) continue;
        const reference = catalog.referencesById.get(usage.referenceId);
        if (!reference || reference.type !== "Book") continue;

        const key = reference.bookId ?? `book-title:${reference.bookTitle}`;
        const current = counts.get(key) ?? {
            ...(reference.bookId ? { bookId: reference.bookId } : {}),
            bookTitle: reference.bookTitle,
            citationCount: 0,
            lessons: new Set(),
            chapterIds: new Set(),
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
        .sort((a, b) => b.citationCount - a.citationCount || a.bookTitle.localeCompare(b.bookTitle));
};

export const getReferencesByTag = (catalog, tag) => {
    const seen = new Set();
    const references = [];

    for (const usage of catalog.usages) {
        if (!usage.tags.includes(tag)) continue;
        const reference = catalog.referencesById.get(usage.referenceId);
        if (!reference || seen.has(reference.id)) continue;
        seen.add(reference.id);
        references.push(reference);
    }

    return references;
};

export const parseCatalogJson = (catalogJsonLd, options = {}) =>
    loadBibliographyCatalog(JSON.parse(catalogJsonLd), options);
