/**
 * @fileoverview Usage-node builders and pending-revision pruning logic.
 *
 * This module isolates the `dibs:ReferenceUsage` builder and the exceptional
 * control flow for `pending-revision` usage pruning. Keeping that logic here
 * prevents the generic graph-support module from depending on usage-specific
 * policy.
 */

import { ALLOWED_USAGE_TAGS, DIBS, REFERENCE_TYPES } from "./constants.mjs";
import {
    asIdRef,
    dedupePreservingOrder,
    getRequiredFirstRef,
    getRequiredTags,
    LESSON_TYPES,
    validateRelationRef,
} from "./graph.support.mjs";

export const shouldSkipPendingRevisionUsage = (
    lessonId,
    referenceId,
    isPendingRevision,
    context,
) => {
    if (!isPendingRevision) return false;
    if (
        !context.recordsById
        || !context.getNodeTypes
        || !context.skippedPendingNodeIds
    ) {
        throw new Error(
            "Graph builder context is missing pending-revision dependencies.",
        );
    }

    if (
        context.skippedPendingNodeIds.has(lessonId)
        || context.skippedPendingNodeIds.has(referenceId)
        || !context.recordsById.has(lessonId)
        || !context.recordsById.has(referenceId)
    ) {
        return true;
    }

    const lessonTypes = context.getNodeTypes(
        context.recordsById.get(lessonId),
        context.sourceLabel,
    );
    const referenceTypes = context.getNodeTypes(
        context.recordsById.get(referenceId),
        context.sourceLabel,
    );

    return (
        !lessonTypes.includes("LearningResource")
        || !referenceTypes.some((type) => REFERENCE_TYPES.has(type))
    );
};

export const buildUsageNode = (record, context) => {
    const lessonId = getRequiredFirstRef(
        record,
        `${DIBS}lesson`,
        (currentRecord) => `usage "${currentRecord.id}" is missing dibs:lesson.`,
        context,
    );
    const referenceId = getRequiredFirstRef(
        record,
        `${DIBS}reference`,
        (currentRecord) => `usage "${currentRecord.id}" is missing dibs:reference.`,
        context,
    );
    const tags = getRequiredTags(record, context);
    for (const tag of tags) {
        if (!ALLOWED_USAGE_TAGS.has(tag)) {
            context.abort(
                context.sourceLabel,
                `usage "${record.id}" has unsupported tag "${tag}".`,
            );
        }
    }

    if (
        shouldSkipPendingRevisionUsage(
            lessonId,
            referenceId,
            tags.includes("pending-revision"),
            context,
        )
    ) {
        return null;
    }

    validateRelationRef(
        lessonId,
        LESSON_TYPES,
        `usage "${record.id}" lesson`,
        context,
    );
    validateRelationRef(
        referenceId,
        REFERENCE_TYPES,
        `usage "${record.id}" reference`,
        context,
    );

    return {
        "@id": record.id,
        "@type": "dibs:ReferenceUsage",
        "dibs:lesson": asIdRef(lessonId),
        "dibs:reference": asIdRef(referenceId),
        "dibs:tags": dedupePreservingOrder(tags),
    };
};
