import { expectTypeOf, test } from "vitest";

test("does not expose repositories as a public subpath", () => {
    // @ts-expect-error Consumers must import from @ravenhill/site-core.
    expectTypeOf<typeof import("@ravenhill/site-core/repositories")>().not.toBeAny();
});
