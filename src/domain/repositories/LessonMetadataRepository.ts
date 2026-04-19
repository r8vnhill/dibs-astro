import type { LessonMetadataRecord } from "$domain/lesson-metadata";
import type { LessonHref } from "$domain/value-objects/LessonHref";

/**
 * Domain repository for lesson metadata queries.
 *
 * This contract exposes metadata lookup in terms of canonical lesson identity without leaking the
 * generated JSON dataset shape or its loading mechanics into higher layers.
 */
export interface LessonMetadataRepository {
    /**
     * Finds lesson metadata for the lesson identified by the given canonical href.
     *
     * @param href Canonical lesson href used as the metadata lookup key.
     * @returns Metadata facts for the lesson, or `undefined` when the lesson is unknown.
     */
    findByHref(href: LessonHref): Promise<LessonMetadataRecord | undefined>;
}
