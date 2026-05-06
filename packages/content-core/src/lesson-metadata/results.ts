import type { LessonHref } from "../navigation/lesson-href";
import type { LessonDateDisplayResult } from "./date";
import type { LessonMetadataRecord } from "./records";
import type { LessonMetadataDto } from "./types";

export type LessonMetadataIssue = Readonly<{
    path: string;
    field: string;
    message: string;
}>;

export type LessonMetadataLookupResult =
    | Readonly<{
        kind: "found";
        metadata: LessonMetadataRecord;
    }>
    | Readonly<{
        kind: "missing";
        href: LessonHref;
    }>
    | Readonly<{
        kind: "invalid";
        href: LessonHref;
        issues: readonly LessonMetadataIssue[];
    }>;

export type LessonMetadataResolutionResult =
    | Readonly<{
        kind: "found";
        metadata: LessonMetadataDto;
        displayDate: LessonDateDisplayResult;
    }>
    | Readonly<{
        kind: "missing";
        href: LessonHref;
    }>
    | Readonly<{
        kind: "invalid";
        href: LessonHref;
        issues: readonly LessonMetadataIssue[];
    }>;
