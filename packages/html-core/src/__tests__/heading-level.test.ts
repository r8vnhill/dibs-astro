import type { HeadingLevel } from "@ravenhill/html-core";
import { assertType, expectTypeOf, suite, test } from "vitest";

suite("given the HeadingLevel public type", () => {
    test("then it accepts the six standard HTML heading levels", () => {
        const validHeadingLevels = [
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
        ] as const;

        for (const level of validHeadingLevels) {
            assertType<HeadingLevel>(level);
        }
    });

    test("then it excludes non-heading and non-canonical heading strings", () => {
        expectTypeOf<"h7">().not.toExtend<HeadingLevel>();
        expectTypeOf<"section">().not.toExtend<HeadingLevel>();
        expectTypeOf<"H1">().not.toExtend<HeadingLevel>();
    });
});
