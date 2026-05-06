import { describe, expect, test } from "vitest";
import type {
    LessonMetadataDto,
    LessonMetadataRepository,
    LessonMetadataServiceContract,
    LessonNavigationRepository,
    NavigationResult,
    NavigationServiceContract,
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

        const navigationService = undefined as unknown as NavigationServiceContract;
        const metadataService = undefined as unknown as LessonMetadataServiceContract;
        const navigationRepository = undefined as unknown as LessonNavigationRepository;
        const metadataRepository = undefined as unknown as LessonMetadataRepository;

        expect(navigationResult.next?.href).toBe("/notes/next/");
        expect(trailNode.title).toBe("Trail");
        expect(metadata.authors).toEqual([]);
        expect(navigationService).toBeUndefined();
        expect(metadataService).toBeUndefined();
        expect(navigationRepository).toBeUndefined();
        expect(metadataRepository).toBeUndefined();
    });
});
