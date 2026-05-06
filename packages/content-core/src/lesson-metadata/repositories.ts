import type { LessonHref } from "../navigation/lesson-href";
import type { LessonMetadataRecord } from "./records";

export interface LessonMetadataRepository {
    findByHref(href: LessonHref): Promise<LessonMetadataRecord | undefined>;
}
