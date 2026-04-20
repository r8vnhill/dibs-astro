/**
 * Application-facing lesson metadata types.
 *
 * The DTO is intentionally narrow and serializable so presentation callers receive only the fields
 * needed for lesson page metadata panels and SEO metadata assembly.
 */
export type LessonMetadataAuthorDto = Readonly<{
    name: string;
    url?: string;
}>;

export type LessonMetadataChangeDto = Readonly<{
    hash: string;
    date: string;
    author: string;
    subject: string;
}>;

export type LessonMetadataDto = Readonly<{
    authors: readonly LessonMetadataAuthorDto[];
    lastModified?: string;
    changes: readonly LessonMetadataChangeDto[];
}>;

/**
 * Port for resolving lesson metadata from presentation-facing pathnames.
 */
export interface ILessonMetadataService {
    /**
     * Resolves lesson metadata for the given raw pathname.
     *
     * @param pathname Raw pathname or URL supplied by the presentation layer.
     * @returns UI-safe lesson metadata, or `undefined` when the route has no metadata entry.
     */
    resolveLessonMetadata(pathname: string): Promise<LessonMetadataDto | undefined>;
}
