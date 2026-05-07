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
    LessonNavigationRepository,
    LessonSourceFile,
    NavigationResult,
    NavigationServiceContract,
    NonEmptyText,
    TrailNode,
} from "@ravenhill/content-core";
import { assertType, expectTypeOf, test } from "vitest";

test("exposes stabilized type contracts from the package root", () => {
    assertType<TrailNode>({
        title: "Trail",
        href: "/notes/",
    });

    assertType<NavigationResult>({
        next: {
            title: "Next",
            href: "/notes/next/",
        },
    });

    assertType<LessonMetadataDto>({
        authors: [],
        changes: [],
    });

    assertType<LessonMetadataIssue>({
        path: "authors[0].name",
        field: "name",
        message: "Expected non-empty text.",
    });

    expectTypeOf<LessonMetadataLookupResult>().toMatchTypeOf<
        | { kind: "found" }
        | { kind: "missing" }
        | { kind: "invalid" }
    >();

    expectTypeOf<LessonMetadataResolutionResult>().toMatchTypeOf<
        | { kind: "found" }
        | { kind: "missing" }
        | { kind: "invalid" }
    >();

    expectTypeOf<NavigationServiceContract>().not.toBeAny();
    expectTypeOf<LessonMetadataServiceContract>().not.toBeAny();
    expectTypeOf<LessonNavigationRepository>().not.toBeAny();
    expectTypeOf<LessonMetadataRepository>().not.toBeAny();

    expectTypeOf<NonEmptyText>().toMatchTypeOf<string>();
    expectTypeOf<AbsoluteUrl>().toMatchTypeOf<string>();
    expectTypeOf<GitCommitHash>().toMatchTypeOf<string>();
    expectTypeOf<IsoShortDate>().toMatchTypeOf<string>();
    expectTypeOf<LessonSourceFile>().toMatchTypeOf<string>();
});
