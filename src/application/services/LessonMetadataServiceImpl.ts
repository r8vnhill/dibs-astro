import type { ILessonMetadataService, LessonMetadataDto } from "$application/ports";
import type { LessonMetadataRepository } from "$domain/repositories";
import { LessonHref } from "$domain/value-objects/LessonHref";

/**
 * Application service that resolves lesson metadata for presentation callers.
 *
 * This service owns the boundary conversion from raw route strings to canonical lesson hrefs,
 * delegates lookup to a domain repository, and exposes only the small DTO shape the presentation
 * layer needs.
 */
export class LessonMetadataServiceImpl implements ILessonMetadataService {
    constructor(private readonly lessonMetadataRepository: LessonMetadataRepository) {}

    async resolveLessonMetadata(pathname: string): Promise<LessonMetadataDto | undefined> {
        const metadata = await this.lessonMetadataRepository.findByHref(
            LessonHref.create(pathname),
        );

        return metadata
            ? {
                authors: metadata.authors.map((author) => ({
                    name: author.name,
                    ...(author.url ? { url: author.url } : {}),
                })),
                changes: metadata.changes.map((change) => ({
                    hash: change.hash,
                    date: change.date,
                    author: change.author,
                    subject: change.subject,
                })),
                ...(metadata.lastModified ? { lastModified: metadata.lastModified } : {}),
            }
            : undefined;
    }
}
