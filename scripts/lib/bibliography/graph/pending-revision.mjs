import { DIBS } from "../shared/constants.mjs";

export const collectPendingRevisionState = ({ recordsByIri, reader }) => {
    const publishedReferenceIds = new Set();
    const pendingReferenceIds = new Set();
    const publishedLessonIds = new Set();
    const pendingLessonIds = new Set();

    for (const record of recordsByIri.values()) {
        const types = reader.getNodeTypes(record);
        if (types[0] !== "dibs:ReferenceUsage") continue;

        const tags = reader.getUsageTagLiterals(record);
        const isPendingRevision = tags.includes("pending-revision");
        const lessonId = reader.namedRefs(record, `${DIBS}lesson`)[0];
        const referenceId = reader.namedRefs(record, `${DIBS}reference`)[0];
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
