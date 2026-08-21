import { describe, expect, suite, test } from "vitest";
import { calloutVariants } from "../shared";

const semanticVariants = [
    ["explanation", "cyan", "normal"],
    ["question", "purple", "subtle"],
    ["solution", "green", "normal"],
] as const;

suite("given the semantic callout color system", () => {
    describe("when reading the pedagogical callout defaults", () => {
        test.each(semanticVariants)(
            "then %s separates its %s accent from its %s surface intensity",
            (variant, accent, surface) => {
                expect(calloutVariants[variant].accent).toBe(accent);
                expect(calloutVariants[variant].surface).toBe(surface);
            },
        );
    });
});
