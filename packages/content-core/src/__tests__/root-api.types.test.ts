import { describe, expect, test } from "vitest";
import type {
    AbsoluteUrl,
    GitCommitHash,
    IsoShortDate,
    LessonMetadataDto,
    LessonMetadataIssue,
    LessonMetadataLookupResult,
    LessonMetadataRepository,
    LessonMetadataResolutionResult,
    LessonMetadataServiceContract,
    LessonSourceFile,
    LessonNavigationRepository,
    NavigationResult,
    NavigationServiceContract,
    NonEmptyText,
    TrailNode,
} from "@ravenhill/content-core";

// @ts-expect-error Phase 2 removes this temporary Phase 1 public name.
import type { INavigationService } from "@ravenhill/content-core";
// @ts-expect-error Phase 2 removes this temporary Phase 1 public name.
import type { ILessonMetadataService } from "@ravenhill/content-core";

describe("content-core root API types", () => {
    test("exposes stabilized type contracts from the package root", () => {
        const navigationResult: NavigationResult = {
            next: { title: "Next", href: "/notes/next/" },
        };
        const trailNode: TrailNode = { title: "Trail", href: "/notes/" };
        const metadata: LessonMetadataDto = { authors: [], changes: [] };
        const issue = {
            path: "authors[0].name",
            field: "name",
            message: "Expected non-empty text.",
        } satisfies LessonMetadataIssue;
        const lookup = undefined as unknown as LessonMetadataLookupResult;
        const resolution = undefined as unknown as LessonMetadataResolutionResult;
        const text = undefined as unknown as NonEmptyText;
        const url = undefined as unknown as AbsoluteUrl;
        const hash = undefined as unknown as GitCommitHash;
        const date = undefined as unknown as IsoShortDate;
        const sourceFile = undefined as unknown as LessonSourceFile;

        const navigationService = undefined as unknown as NavigationServiceContract;
        const metadataService = undefined as unknown as LessonMetadataServiceContract;
        const navigationRepository = undefined as unknown as LessonNavigationRepository;
        const metadataRepository = undefined as unknown as LessonMetadataRepository;

        expect(navigationResult.next?.href).toBe("/notes/next/");
        expect(trailNode.title).toBe("Trail");
        expect(metadata.authors).toEqual([]);
        expect(lookup).toBeUndefined();
        expect(resolution).toBeUndefined();
        expect(text).toBeUndefined();
        expect(url).toBeUndefined();
        expect(hash).toBeUndefined();
        expect(date).toBeUndefined();
        expect(sourceFile).toBeUndefined();
        expect(navigationService).toBeUndefined();
        expect(metadataService).toBeUndefined();
        expect(navigationRepository).toBeUndefined();
        expect(metadataRepository).toBeUndefined();
    });
});
