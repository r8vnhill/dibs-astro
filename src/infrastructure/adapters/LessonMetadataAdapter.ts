import type {
    LessonHref,
    LessonMetadataRecord,
    LessonMetadataRepository,
} from "@ravenhill/content-core";
import {
    getLessonMetadataDataset,
    type ReadonlyLessonMetadataDataset,
    type ReadonlyLessonMetadataEntry,
} from "~/utils/lesson-metadata";

/**
 * Infrastructure adapter that resolves lesson metadata from the generated JSON dataset.
 *
 * Validation, caching, and dataset ownership remain behind this boundary. Higher layers see only
 * the domain repository contract.
 */
export class LessonMetadataAdapter implements LessonMetadataRepository {
    constructor(private readonly source: ReadonlyLessonMetadataDataset = getLessonMetadataDataset()) {}

    async findByHref(href: LessonHref): Promise<LessonMetadataRecord | undefined> {
        const entry = this.source.entries[href.value];
        return entry ? mapLessonMetadataEntry(entry) : undefined;
    }
}

const mapLessonMetadataEntry = (entry: ReadonlyLessonMetadataEntry): LessonMetadataRecord => ({
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
