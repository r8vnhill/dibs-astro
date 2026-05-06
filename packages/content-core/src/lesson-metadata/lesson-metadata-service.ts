import { LessonHref } from "../navigation/lesson-href";
import { normalizeLessonMetadataPathname } from "./pathname";
import type { LessonMetadataRepository } from "./repositories";
import type { LessonMetadataResolutionResult } from "./results";
import { resolveLessonDateDisplay } from "./date";
import type { LessonMetadataDto, LessonMetadataServiceContract } from "./types";

function assertNever(value: never): never {
    throw new Error(`Unexpected lesson metadata lookup result: ${JSON.stringify(value)}`);
}

export class LessonMetadataService implements LessonMetadataServiceContract {
    constructor(private readonly lessonMetadataRepository: LessonMetadataRepository) {}

    async resolveLessonMetadata(pathname: string): Promise<LessonMetadataResolutionResult> {
        const result = await this.lessonMetadataRepository.findByHref(
            LessonHref.create(normalizeLessonMetadataPathname(pathname)),
        );

        switch (result.kind) {
            case "found":
                return {
                    kind: "found",
                    metadata: toLessonMetadataDto(result.metadata),
                    displayDate: resolveLessonDateDisplay(result.metadata.lastModified),
                };
            case "missing":
            case "invalid":
                return result;
            default:
                return assertNever(result);
        }
    }
}

const toLessonMetadataDto = (metadata: {
    authors: readonly { name: string; url?: string }[];
    changes: readonly { hash: string; date: string; author: string; subject: string }[];
    lastModified?: string;
}): LessonMetadataDto => ({
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
});
