import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { DEFAULT_REPO_PLATFORMS, isRepoPlatform, normalizePlatforms } from "../../index";

describe("isRepoPlatform", () => {
    test.each(DEFAULT_REPO_PLATFORMS)("accepts valid platform: %s", (platform) => {
        expect(isRepoPlatform(platform)).toBe(true);
    });

    test.each(["", "codeberg", "bitbucket", "GITHUB", null, undefined, 42])(
        "rejects invalid platform: %p",
        (platform) => {
            expect(isRepoPlatform(platform)).toBe(false);
        },
    );

    test("property: true iff the value belongs to the platform union", () => {
        const expectedSet = new Set(DEFAULT_REPO_PLATFORMS);

        fc.assert(
            fc.property(fc.anything(), (value) => {
                const expected = typeof value === "string"
                    && expectedSet.has(value as never);

                expect(isRepoPlatform(value)).toBe(expected);
            }),
        );
    });
});

describe("normalizePlatforms", () => {
    test("returns defaults when the input is missing", () => {
        expect(normalizePlatforms()).toEqual([...DEFAULT_REPO_PLATFORMS]);
    });

    test("keeps valid values and removes invalid values", () => {
        expect(normalizePlatforms(["gitlab", "invalid", "github"])).toEqual([
            "gitlab",
            "github",
        ]);
    });

    test("returns defaults when all provided values are invalid", () => {
        expect(normalizePlatforms(["invalid", "codeberg"])).toEqual([
            ...DEFAULT_REPO_PLATFORMS,
        ]);
    });

    test("deduplicates while preserving first-seen order", () => {
        expect(normalizePlatforms(["github", "gitlab", "github"])).toEqual([
            "github",
            "gitlab",
        ]);
    });

    test.each([null, undefined, 123, "github", { platforms: ["github"] }])(
        "returns defaults for non-array input: %p",
        (value) => {
            expect(normalizePlatforms(value as never)).toEqual([
                ...DEFAULT_REPO_PLATFORMS,
            ]);
        },
    );

    test("property: output is non-empty, valid, and unique", () => {
        fc.assert(
            fc.property(fc.anything(), (value) => {
                const out = normalizePlatforms(value);

                expect(out.length).toBeGreaterThan(0);
                expect(new Set(out).size).toBe(out.length);

                for (const platform of out) {
                    expect(isRepoPlatform(platform)).toBe(true);
                }
            }),
        );
    });
});
