import { expectTypeOf, test } from "vitest";

test("does not expose removed Phase 1 service names from the package root", () => {
    // @ts-expect-error Phase 2 removed this temporary Phase 1 public name.
    expectTypeOf<import("@ravenhill/content-core").INavigationService>().not.toBeAny();

    // @ts-expect-error Phase 2 removed this temporary Phase 1 public name.
    expectTypeOf<import("@ravenhill/content-core").ILessonMetadataService>().not.toBeAny();

    // @ts-expect-error Phase 2 removed this temporary Phase 1 public name.
    expectTypeOf<import("@ravenhill/content-core").NavigationServiceImpl>().not.toBeAny();

    // @ts-expect-error Phase 2 removed this temporary Phase 1 public name.
    expectTypeOf<import("@ravenhill/content-core").LessonMetadataServiceImpl>().not.toBeAny();
});
