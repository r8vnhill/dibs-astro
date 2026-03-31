import { Parser } from "n3";

const SITE_ORIGIN = "https://dibs.ravenhill.cl";
const SCHEMA = "https://schema.org/";
const DIBS = "https://dibs.ravenhill.cl/vocab#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const ID_PREFIXES = [
    ["https://dibs.ravenhill.cl/bibliography/ref/", "ref:"],
    ["https://dibs.ravenhill.cl/bibliography/person/", "person:"],
    ["https://dibs.ravenhill.cl/bibliography/org/", "org:"],
    ["https://dibs.ravenhill.cl/bibliography/work/", "work:"],
    ["https://dibs.ravenhill.cl/bibliography/usage/", "usage:"],
];

const ALLOWED_USAGE_TAGS = new Set([
    "recommended",
    "additional",
    "pending-revision",
]);

const CATEGORY_ORDER = {
    Person: 1,
    Organization: 2,
    CollegeOrUniversity: 2,
    CreativeWork: 3,
    Book: 4,
    WebPage: 4,
    VideoObject: 4,
    ScholarlyArticle: 4,
    Thesis: 4,
    LearningResource: 5,
    "dibs:ReferenceUsage": 6,
};

const REFERENCE_TYPES = new Set([
    "Book",
    "WebPage",
    "VideoObject",
    "ScholarlyArticle",
    "Thesis",
]);

const fail = (sourceLabel, message) => {
    throw new Error(`[${sourceLabel}] ${message}`);
};

const scalarLiteral = (record, predicate, sourceLabel) => {
    const values = record.predicates.get(predicate) ?? [];
    if (values.length === 0) return undefined;
    if (values.length > 1) {
        fail(sourceLabel, `node "${record.id}" has multiple values for "${predicate}".`);
    }
    const [value] = values;
    if (value.termType !== "Literal") {
        fail(sourceLabel, `node "${record.id}" expects a literal for "${predicate}".`);
    }
    return value.value;
};

const scalarUrl = (record, predicate, sourceLabel) => {
    const values = record.predicates.get(predicate) ?? [];
    if (values.length === 0) return undefined;
    if (values.length > 1) {
        fail(sourceLabel, `node "${record.id}" has multiple values for "${predicate}".`);
    }
    const [value] = values;
    if (value.termType === "Literal") return value.value;
    if (value.termType === "NamedNode") return compactUrl(value.value);
    fail(sourceLabel, `node "${record.id}" has an unsupported URL value for "${predicate}".`);
};

const scalarInteger = (record, predicate, sourceLabel) => {
    const value = scalarLiteral(record, predicate, sourceLabel);
    if (value == null) return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        fail(sourceLabel, `node "${record.id}" has a non-integer value for "${predicate}".`);
    }
    return parsed;
};

const namedRefs = (record, predicate, sourceLabel) => {
    const values = record.predicates.get(predicate) ?? [];
    return values.map((value) => {
        if (value.termType !== "NamedNode") {
            fail(sourceLabel, `node "${record.id}" expects a named node for "${predicate}".`);
        }
        return compactId(value.value);
    });
};

const compactId = (iri) => {
    if (iri.startsWith(`${SITE_ORIGIN}/notes/`)) {
        return iri.slice(SITE_ORIGIN.length);
    }

    for (const [base, prefix] of ID_PREFIXES) {
        if (iri.startsWith(base)) {
            return `${prefix}${iri.slice(base.length)}`;
        }
    }

    return iri;
};

const compactUrl = (value) => {
    if (value.startsWith(`${SITE_ORIGIN}/notes/`)) {
        return value.slice(SITE_ORIGIN.length);
    }
    return value;
};

const compactType = (iri) => {
    if (iri.startsWith(SCHEMA)) return iri.slice(SCHEMA.length);
    if (iri.startsWith(DIBS)) return `dibs:${iri.slice(DIBS.length)}`;
    return iri;
};

const createRecord = (iri) => ({
    iri,
    id: compactId(iri),
    predicates: new Map(),
    order: Number.MAX_SAFE_INTEGER,
});

const ensureNodeCategory = (recordsById, id, allowedTypes, sourceLabel, relationLabel) => {
    const record = recordsById.get(id);
    if (!record) fail(sourceLabel, `${relationLabel} points to missing node "${id}".`);
    const types = getNodeTypes(record, sourceLabel);
    if (!types.some((type) => allowedTypes.has(type))) {
        fail(
            sourceLabel,
            `${relationLabel} points to "${id}" with invalid type "${types.join(", ")}".`,
        );
    }
};

const getNodeTypes = (record, sourceLabel) => {
    const rawTypes = record.predicates.get(RDF_TYPE) ?? [];
    if (rawTypes.length === 0) fail(sourceLabel, `node "${record.id}" is missing rdf:type.`);
    return rawTypes.map((value) => {
        if (value.termType !== "NamedNode") {
            fail(sourceLabel, `node "${record.id}" has a non-named rdf:type.`);
        }
        return compactType(value.value);
    });
};

const sortGraphNodes = (graph) =>
    graph.sort((a, b) => {
        const categoryA = CATEGORY_ORDER[a["@type"]] ?? 99;
        const categoryB = CATEGORY_ORDER[b["@type"]] ?? 99;
        return categoryA - categoryB || a["@id"].localeCompare(b["@id"]);
    });

const getUsageTagLiterals = (record, sourceLabel) =>
    (record.predicates.get(`${DIBS}tag`) ?? []).map((value) => {
        if (value.termType !== "Literal") {
            fail(sourceLabel, `usage "${record.id}" has a non-literal dibs:tag.`);
        }
        return value.value;
    });

export const buildCatalogArtifactFromTurtle = (
    ttl,
    options = {},
) => {
    const sourceLabel = options.sourceLabel ?? "catalog.graph.ttl";
    const parser = new Parser({ baseIRI: SITE_ORIGIN });
    const recordsByIri = new Map();
    let quadIndex = 0;

    for (const quad of parser.parse(ttl)) {
        if (quad.graph.termType !== "DefaultGraph") {
            fail(sourceLabel, "named graphs are not supported in the bibliography catalog.");
        }
        if (quad.subject.termType !== "NamedNode") {
            fail(sourceLabel, "blank node subjects are not supported in the bibliography catalog.");
        }
        if (quad.object.termType === "BlankNode") {
            fail(sourceLabel, `blank node object found on "${quad.subject.value}".`);
        }

        const record = recordsByIri.get(quad.subject.value) ?? createRecord(quad.subject.value);
        if (record.order === Number.MAX_SAFE_INTEGER) record.order = quadIndex;
        const bucket = record.predicates.get(quad.predicate.value) ?? [];
        bucket.push(quad.object);
        record.predicates.set(quad.predicate.value, bucket);
        recordsByIri.set(quad.subject.value, record);
        quadIndex += 1;
    }

    const recordsById = new Map(
        Array.from(recordsByIri.values(), (record) => [record.id, record]),
    );
    const pendingReferenceIds = new Set();
    const publishedReferenceIds = new Set();
    const pendingLessonIds = new Set();
    const publishedLessonIds = new Set();

    for (const record of recordsByIri.values()) {
        const types = getNodeTypes(record, sourceLabel);
        if (types[0] !== "dibs:ReferenceUsage") continue;

        const tags = getUsageTagLiterals(record, sourceLabel);
        const isPendingRevision = tags.includes("pending-revision");
        const lessonId = namedRefs(record, `${DIBS}lesson`, sourceLabel)[0];
        const referenceId = namedRefs(record, `${DIBS}reference`, sourceLabel)[0];
        const lessonTargets = isPendingRevision ? pendingLessonIds : publishedLessonIds;
        const referenceTargets = isPendingRevision ? pendingReferenceIds : publishedReferenceIds;

        if (lessonId) lessonTargets.add(lessonId);
        if (referenceId) referenceTargets.add(referenceId);
    }

    const pendingOnlyReferenceIds = new Set(
        Array.from(pendingReferenceIds).filter((id) => !publishedReferenceIds.has(id)),
    );
    const pendingOnlyLessonIds = new Set(
        Array.from(pendingLessonIds).filter((id) => !publishedLessonIds.has(id)),
    );
    const skippedPendingNodeIds = new Set();

    const graph = [];

    for (const record of Array.from(recordsByIri.values()).sort((a, b) => a.order - b.order)) {
        const types = getNodeTypes(record, sourceLabel);
        const primaryType = types[0];

        if (primaryType === "Person") {
            graph.push({
                "@id": record.id,
                "@type": "Person",
                ...(scalarLiteral(record, `${SCHEMA}givenName`, sourceLabel)
                    ? { givenName: scalarLiteral(record, `${SCHEMA}givenName`, sourceLabel) }
                    : {}),
                ...(scalarLiteral(record, `${SCHEMA}familyName`, sourceLabel)
                    ? { familyName: scalarLiteral(record, `${SCHEMA}familyName`, sourceLabel) }
                    : {}),
                ...(scalarUrl(record, `${SCHEMA}url`, sourceLabel)
                    ? { url: scalarUrl(record, `${SCHEMA}url`, sourceLabel) }
                    : {}),
            });
            continue;
        }

        if (primaryType === "Organization" || primaryType === "CollegeOrUniversity") {
            const name = scalarLiteral(record, `${SCHEMA}name`, sourceLabel);
            if (!name) fail(sourceLabel, `organization "${record.id}" is missing schema:name.`);
            graph.push({
                "@id": record.id,
                "@type": primaryType,
                name,
                ...(scalarUrl(record, `${SCHEMA}url`, sourceLabel)
                    ? { url: scalarUrl(record, `${SCHEMA}url`, sourceLabel) }
                    : {}),
            });
            continue;
        }

        if (primaryType === "CreativeWork") {
            const name = scalarLiteral(record, `${SCHEMA}name`, sourceLabel);
            if (!name) fail(sourceLabel, `work "${record.id}" is missing schema:name.`);
            const authors = namedRefs(record, `${SCHEMA}author`, sourceLabel);
            authors.forEach((id) =>
                ensureNodeCategory(
                    recordsById,
                    id,
                    new Set(["Person", "Organization", "CollegeOrUniversity"]),
                    sourceLabel,
                    `work "${record.id}" author`,
                )
            );
            const publisherId = namedRefs(record, `${SCHEMA}publisher`, sourceLabel)[0];
            if (publisherId) {
                ensureNodeCategory(
                    recordsById,
                    publisherId,
                    new Set(["Organization", "CollegeOrUniversity"]),
                    sourceLabel,
                    `work "${record.id}" publisher`,
                );
            }
            graph.push({
                "@id": record.id,
                "@type": "CreativeWork",
                name,
                ...(authors.length > 0
                    ? { author: authors.map((id) => ({ "@id": id })) }
                    : {}),
                ...(publisherId ? { publisher: { "@id": publisherId } } : {}),
            });
            continue;
        }

        if (REFERENCE_TYPES.has(primaryType)) {
            try {
                const name = scalarLiteral(record, `${SCHEMA}name`, sourceLabel);
                if (!name) fail(sourceLabel, `reference "${record.id}" is missing schema:name.`);
                const authors = namedRefs(record, `${SCHEMA}author`, sourceLabel);
                authors.forEach((id) =>
                    ensureNodeCategory(
                        recordsById,
                        id,
                        new Set(["Person", "Organization", "CollegeOrUniversity"]),
                        sourceLabel,
                        `reference "${record.id}" author`,
                    )
                );
                const publisherId = namedRefs(record, `${SCHEMA}publisher`, sourceLabel)[0];
                if (publisherId) {
                    ensureNodeCategory(
                        recordsById,
                        publisherId,
                        new Set(["Organization", "CollegeOrUniversity"]),
                        sourceLabel,
                        `reference "${record.id}" publisher`,
                    );
                }
                const isPartOfId = namedRefs(record, `${SCHEMA}isPartOf`, sourceLabel)[0];
                if (isPartOfId) {
                    ensureNodeCategory(
                        recordsById,
                        isPartOfId,
                        new Set(["CreativeWork"]),
                        sourceLabel,
                        `reference "${record.id}" isPartOf`,
                    );
                }

                graph.push({
                    "@id": record.id,
                    "@type": primaryType,
                    name,
                    ...(scalarUrl(record, `${SCHEMA}url`, sourceLabel)
                        ? { url: scalarUrl(record, `${SCHEMA}url`, sourceLabel) }
                        : {}),
                    ...(scalarLiteral(record, `${SCHEMA}datePublished`, sourceLabel)
                        ? {
                            datePublished: scalarLiteral(
                                record,
                                `${SCHEMA}datePublished`,
                                sourceLabel,
                            ),
                        }
                        : {}),
                    ...(scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel) != null
                        ? { pageStart: scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel) }
                        : {}),
                    ...(scalarInteger(record, `${SCHEMA}pageEnd`, sourceLabel) != null
                        ? { pageEnd: scalarInteger(record, `${SCHEMA}pageEnd`, sourceLabel) }
                        : {}),
                    ...(authors.length > 0
                        ? { author: authors.map((id) => ({ "@id": id })) }
                        : {}),
                    ...(publisherId ? { publisher: { "@id": publisherId } } : {}),
                    ...(isPartOfId ? { isPartOf: { "@id": isPartOfId } } : {}),
                });
            } catch (error) {
                if (pendingOnlyReferenceIds.has(record.id)) {
                    skippedPendingNodeIds.add(record.id);
                    continue;
                }
                throw error;
            }
            continue;
        }

        if (primaryType === "LearningResource") {
            const name = scalarLiteral(record, `${SCHEMA}name`, sourceLabel);
            const url = scalarUrl(record, `${SCHEMA}url`, sourceLabel);
            if (!name) fail(sourceLabel, `lesson "${record.id}" is missing schema:name.`);
            graph.push({
                "@id": record.id,
                "@type": "LearningResource",
                name,
                ...(url ? { url } : {}),
            });
            continue;
        }

        if (primaryType === "dibs:ReferenceUsage") {
            const lessonId = namedRefs(record, `${DIBS}lesson`, sourceLabel)[0];
            const referenceId = namedRefs(record, `${DIBS}reference`, sourceLabel)[0];
            const tags = getUsageTagLiterals(record, sourceLabel);
            const isPendingRevision = tags.includes("pending-revision");

            if (!lessonId) fail(sourceLabel, `usage "${record.id}" is missing dibs:lesson.`);
            if (!referenceId) {
                fail(sourceLabel, `usage "${record.id}" is missing dibs:reference.`);
            }
            if (tags.length === 0) fail(sourceLabel, `usage "${record.id}" is missing dibs:tag.`);
            for (const tag of tags) {
                if (!ALLOWED_USAGE_TAGS.has(tag)) {
                    fail(sourceLabel, `usage "${record.id}" has unsupported tag "${tag}".`);
                }
            }

            if (isPendingRevision) {
                if (
                    skippedPendingNodeIds.has(lessonId) || skippedPendingNodeIds.has(referenceId)
                    || !recordsById.has(lessonId) || !recordsById.has(referenceId)
                ) {
                    continue;
                }

                const lessonTypes = getNodeTypes(recordsById.get(lessonId), sourceLabel);
                const referenceTypes = getNodeTypes(recordsById.get(referenceId), sourceLabel);

                if (
                    !lessonTypes.includes("LearningResource")
                    || !referenceTypes.some((type) => REFERENCE_TYPES.has(type))
                ) {
                    continue;
                }
            }

            ensureNodeCategory(
                recordsById,
                lessonId,
                new Set(["LearningResource"]),
                sourceLabel,
                `usage "${record.id}" lesson`,
            );
            ensureNodeCategory(
                recordsById,
                referenceId,
                REFERENCE_TYPES,
                sourceLabel,
                `usage "${record.id}" reference`,
            );

            graph.push({
                "@id": record.id,
                "@type": "dibs:ReferenceUsage",
                "dibs:lesson": { "@id": lessonId },
                "dibs:reference": { "@id": referenceId },
                "dibs:tags": Array.from(new Set(tags)),
            });
            continue;
        }

        if (pendingOnlyReferenceIds.has(record.id) || pendingOnlyLessonIds.has(record.id)) {
            skippedPendingNodeIds.add(record.id);
            continue;
        }

        fail(sourceLabel, `node "${record.id}" has unsupported type "${primaryType}".`);
    }

    return {
        "@context": [
            "https://schema.org",
            {
                dibs: DIBS,
            },
        ],
        "@graph": sortGraphNodes(graph),
    };
};
