import { describe, expect, test } from "vitest";

import { validateDependencySpecifier } from "../../lib/package-resolution/specifier.mjs";

describe("given an exact-version resolution contract of 0.1.0", () => {
    test.each([
        ["0.1.0", true],
        ["^0.1.0", false],
        ["~0.1.0", false],
        ["workspace:*", false],
        ["workspace:^", false],
        ["link:packages/site-core", false],
        ["file:../site-core", false],
        ["git+https://gitlab.com/r8vnhill/site-core.git", false],
    ])("then specifier %j is accepted=%p", (specifier, expected) => {
        expect(validateDependencySpecifier(specifier, "0.1.0").valid).toBe(expected);
    });

    test("then a rejected specifier reports why", () => {
        const result = validateDependencySpecifier("^0.1.0", "0.1.0");
        expect(result.valid).toBe(false);
        expect(result.reason).toContain("0.1.0");
    });
});
