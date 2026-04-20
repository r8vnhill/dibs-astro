import type { LessonMetadataRecord } from "$domain/lesson-metadata";
import type { LessonMetadataRepository } from "$domain/repositories";
import type { LessonHref } from "$domain/value-objects/LessonHref";
import {
    getLessonMetadataDataset,
    type LessonMetadataDataset,
    type LessonMetadataEntry,
} from "~/utils/lesson-metadata";

/**
 * Infrastructure adapter that resolves lesson metadata from the generated JSON dataset.
 *
 * Validation, caching, and dataset ownership remain behind this boundary. Higher layers see only
 * the domain repository contract.
 */
export class LessonMetadataAdapter implements LessonMetadataRepository {
    constructor(private readonly source: LessonMetadataDataset = getLessonMetadataDataset()) {}

    async findByHref(href: LessonHref): Promise<LessonMetadataRecord | undefined> {
        const entry = this.source.entries[href.value];
        return entry ? mapLessonMetadataEntry(entry) : undefined;
    }
}

const mapLessonMetadataEntry = (entry: LessonMetadataEntry): LessonMetadataRecord => ({
    sourceFile: entry.sourceFile,
    authors: entry.authors.map((author) => ({
        name: author.name,
        ...(author.url ? { url: author.url } : {}),
    })),
    changes: entry.changes.map((change) => ({
        hash: change.hash,
        date: change.date,
        author: change.author,
        subject: change.subject,
    })),
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
});
