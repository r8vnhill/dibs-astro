import { DIBS } from "./bibliography-catalog-builder.constants.mjs";

export const collectPendingRevisionState = (
    recordsByIri,
    getNodeTypes,
    getUsageTagLiterals,
    namedRefs,
    sourceLabel,
) => {
    const publishedReferenceIds = new Set();
    const pendingReferenceIds = new Set();
    const publishedLessonIds = new Set();
    const pendingLessonIds = new Set();

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

    return {
        pendingOnlyReferenceIds: new Set(
            Array.from(pendingReferenceIds).filter((id) => !publishedReferenceIds.has(id)),
        ),
        pendingOnlyLessonIds: new Set(
            Array.from(pendingLessonIds).filter((id) => !publishedLessonIds.has(id)),
        ),
    };
};
