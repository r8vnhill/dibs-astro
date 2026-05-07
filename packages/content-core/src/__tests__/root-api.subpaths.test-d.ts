import { expectTypeOf, test } from "vitest";

test("does not expose lesson-navigation as a public subpath", () => {
    // @ts-expect-error Consumers must import from @ravenhill/content-core.
    expectTypeOf<typeof import("@ravenhill/content-core/navigation")>().not.toBeAny();
});

test("does not expose lesson-metadata as a public subpath", () => {
    // @ts-expect-error Consumers must import from @ravenhill/content-core.
    expectTypeOf<typeof import("@ravenhill/content-core/lesson-metadata")>().not.toBeAny();
});
