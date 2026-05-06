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

export interface ILessonMetadataService {
    resolveLessonMetadata(pathname: string): Promise<LessonMetadataDto | undefined>;
}
