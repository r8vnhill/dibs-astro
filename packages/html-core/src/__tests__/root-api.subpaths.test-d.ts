import { expectTypeOf, test } from "vitest";

test("does not expose heading-level as a public subpath", () => {
    // @ts-expect-error Consumers must import from @ravenhill/html-core.
    expectTypeOf<typeof import("@ravenhill/html-core/heading-level")>().not.toBeAny();
});
