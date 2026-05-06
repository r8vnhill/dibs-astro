import type { LessonHref } from "../navigation/lesson-href";
import type { LessonMetadataLookupResult } from "./results";

export interface LessonMetadataRepository {
    findByHref(href: LessonHref): Promise<LessonMetadataLookupResult>;
}
