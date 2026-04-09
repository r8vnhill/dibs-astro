import {
    ALLOWED_USAGE_TAGS,
    CATEGORY_ORDER,
    DIBS,
    REFERENCE_TYPES,
    SCHEMA,
} from "./bibliography-catalog-builder.constants.mjs";

export const sortGraphNodes = (graph) =>
    graph.sort((a, b) => {
        const categoryA = CATEGORY_ORDER[a["@type"]] ?? 99;
        const categoryB = CATEGORY_ORDER[b["@type"]] ?? 99;
        return categoryA - categoryB || a["@id"].localeCompare(b["@id"]);
    });

export const buildPersonNode = (record, scalarLiteral, scalarUrlLiteral, sourceLabel) => {
    const givenName = scalarLiteral(record, `${SCHEMA}givenName`, sourceLabel);
    const familyName = scalarLiteral(record, `${SCHEMA}familyName`, sourceLabel);
    const url = scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel);

    return {
        "@id": record.id,
        "@type": "Person",
        ...(givenName ? { givenName } : {}),
        ...(familyName ? { familyName } : {}),
        ...(url ? { url } : {}),
    };
};

export const buildOrganizationNode = (record, scalarLiteral, scalarUrlLiteral, fail, sourceLabel) => {
    const name = scalarLiteral(record, `${SCHEMA}name`, sourceLabel);
    const url = scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel);
    if (!name) fail(sourceLabel, `organization "${record.id}" is missing schema:name.`);
    return {
        "@id": record.id,
        "@type": record.primaryType,
        name,
        ...(url ? { url } : {}),
    };
};

export const buildCreativeWorkNode = (
    record,
    recordsById,
    scalarLiteral,
    namedRefs,
    ensureNodeCategory,
    fail,
    sourceLabel,
) => {
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
    return {
        "@id": record.id,
        "@type": "CreativeWork",
        name,
        ...(authors.length > 0
            ? { author: authors.map((id) => ({ "@id": id })) }
            : {}),
        ...(publisherId ? { publisher: { "@id": publisherId } } : {}),
    };
};

export const buildReferenceNode = (
    record,
    recordsById,
    scalarLiteral,
    scalarUrlLiteral,
    scalarInteger,
    namedRefs,
    ensureNodeCategory,
    fail,
    sourceLabel,
) => {
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

    const url = scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel);
    const datePublished = scalarLiteral(record, `${SCHEMA}datePublished`, sourceLabel);
    const pageStart = scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel);
    const pageEnd = scalarInteger(record, `${SCHEMA}pageEnd`, sourceLabel);

    return {
        "@id": record.id,
        "@type": record.primaryType,
        name,
        ...(url ? { url } : {}),
        ...(datePublished ? { datePublished } : {}),
        ...(pageStart != null ? { pageStart } : {}),
        ...(pageEnd != null ? { pageEnd } : {}),
        ...(authors.length > 0
            ? { author: authors.map((id) => ({ "@id": id })) }
            : {}),
        ...(publisherId ? { publisher: { "@id": publisherId } } : {}),
        ...(isPartOfId ? { isPartOf: { "@id": isPartOfId } } : {}),
    };
};

export const buildLearningResourceNode = (
    record,
    scalarLiteral,
    scalarUrlLiteral,
    fail,
    sourceLabel,
) => {
    const name = scalarLiteral(record, `${SCHEMA}name`, sourceLabel);
    const url = scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel);
    if (!name) fail(sourceLabel, `lesson "${record.id}" is missing schema:name.`);
    return {
        "@id": record.id,
        "@type": "LearningResource",
        name,
        ...(url ? { url } : {}),
    };
};

export const buildUsageNode = (
    record,
    recordsById,
    namedRefs,
    getUsageTagLiterals,
    getNodeTypes,
    ensureNodeCategory,
    fail,
    skippedPendingNodeIds,
    sourceLabel,
) => {
    const lessonId = namedRefs(record, `${DIBS}lesson`, sourceLabel)[0];
    const referenceId = namedRefs(record, `${DIBS}reference`, sourceLabel)[0];
    const tags = getUsageTagLiterals(record, sourceLabel);
    const isPendingRevision = tags.includes("pending-revision");

    if (!lessonId) fail(sourceLabel, `usage "${record.id}" is missing dibs:lesson.`);
    if (!referenceId) fail(sourceLabel, `usage "${record.id}" is missing dibs:reference.`);
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
            return null;
        }

        const lessonTypes = getNodeTypes(recordsById.get(lessonId), sourceLabel);
        const referenceTypes = getNodeTypes(recordsById.get(referenceId), sourceLabel);

        if (
            !lessonTypes.includes("LearningResource")
            || !referenceTypes.some((type) => REFERENCE_TYPES.has(type))
        ) {
            return null;
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

    return {
        "@id": record.id,
        "@type": "dibs:ReferenceUsage",
        "dibs:lesson": { "@id": lessonId },
        "dibs:reference": { "@id": referenceId },
        "dibs:tags": Array.from(new Set(tags)),
    };
};
