/**
 * @file Validated domain records for lesson metadata.
 *
 * This module defines the trusted metadata shapes returned by the lesson-metadata boundary. These records are created
 * only after raw DTO fields have been parsed into branded values, so downstream code can rely on their semantic
 * meaning without repeating field-level validation.
 *
 * The model intentionally mirrors git-like provenance concepts:
 *
 * - authors identify credited maintainers of a lesson;
 * - changes describe individual commits or commit-like updates;
 * - records group the source file, authorship, latest modification date, and ordered change history for one lesson.
 *
 * These types are immutable at the TypeScript level. Runtime immutability, when required, should still be enforced by
 * the adapter or repository that creates the records.
 */

import type { AbsoluteUrl, GitCommitHash, IsoShortDate, LessonSourceFile, NonEmptyText } from "./branded-values";

/**
 * Credited author of a lesson.
 *
 * The author name has already been normalized and validated as non-empty text. When present, the URL has already been
 * validated as an absolute HTTP(S) URL.
 */
export type LessonMetadataAuthor = Readonly<{
    /** Display name of the credited author. */
    name: NonEmptyText;

    /** Optional absolute HTTP(S) URL associated with the author. */
    url?: AbsoluteUrl;
}>;

/**
 * Commit-like change entry for a lesson.
 *
 * A change captures the provenance information needed to display how a lesson evolved over time. Each field is trusted:
 *
 * - `hash` is a validated git commit hash or commit-like hexadecimal identifier;
 * - `date` is a real ISO short date in `YYYY-MM-DD` format;
 * - `author` is non-empty text;
 * - `subject` is non-empty text.
 */
export type LessonMetadataChange = Readonly<{
    /** Validated git commit hash or commit-like hexadecimal identifier. */
    hash: GitCommitHash;

    /** Real ISO short date in `YYYY-MM-DD` format. */
    date: IsoShortDate;

    /** Display name of the person associated with the change. */
    author: NonEmptyText;

    /** Non-empty change summary, typically derived from a commit subject. */
    subject: NonEmptyText;
}>;

/**
 * Trusted metadata record for a single lesson.
 *
 * This is the normalized domain-facing record returned by metadata lookup and resolution. Raw generated metadata 
 * should be converted into this shape only after all semantic fields have passed through the branded-value parsers.
 *
 * The `changes` array is expected to preserve the ordering provided by the metadata source, typically newest-first 
 * when derived from git log output.
 */
export type LessonMetadataRecord = Readonly<{
    /** Canonical source-file identifier for the lesson. */
    sourceFile: LessonSourceFile;

    /** Credited lesson authors or maintainers. */
    authors: readonly LessonMetadataAuthor[];

    /**
     * Optional most-recent modification date.
     *
     * This may differ from the first change date when the change list is filtered, truncated, or generated from a 
     * source that computes the latest date separately.
     */
    lastModified?: IsoShortDate;

    /** Ordered history of lesson updates. */
    changes: readonly LessonMetadataChange[];
}>;
