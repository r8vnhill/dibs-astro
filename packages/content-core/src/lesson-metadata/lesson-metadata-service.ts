import { LessonHref } from "../navigation/lesson-href";
import { normalizeLessonMetadataPathname } from "./pathname";
import type { LessonMetadataRepository } from "./repositories";
import type { LessonMetadataDto, LessonMetadataServiceContract } from "./types";

export class LessonMetadataService implements LessonMetadataServiceContract {
    constructor(private readonly lessonMetadataRepository: LessonMetadataRepository) {}

    async resolveLessonMetadata(pathname: string): Promise<LessonMetadataDto | undefined> {
        const metadata = await this.lessonMetadataRepository.findByHref(
            LessonHref.create(normalizeLessonMetadataPathname(pathname)),
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
