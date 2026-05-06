export type LessonMetadataAuthor = Readonly<{
    name: string;
    url?: string;
}>;

export type LessonMetadataChange = Readonly<{
    hash: string;
    date: string;
    author: string;
    subject: string;
}>;

export type LessonMetadataRecord = Readonly<{
    sourceFile: string;
    authors: readonly LessonMetadataAuthor[];
    lastModified?: string;
    changes: readonly LessonMetadataChange[];
}>;
