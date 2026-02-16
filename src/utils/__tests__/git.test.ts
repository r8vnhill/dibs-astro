import fc from "fast-check";
import { DEFAULT_REPO_PLATFORMS, isRepoPlatform, normalizePlatforms } from "../git";

describe.concurrent("isRepoPlatform", () => {
    test.each(DEFAULT_REPO_PLATFORMS)("accepts valid platform: %s", (platform) => {
        expect(isRepoPlatform(platform)).toBe(true);
    });

    test.each(["", "codeberg", "bitbucket", "GITHUB", null, undefined, 42])(
        "rejects invalid platform: %s",
        (platform) => {
            expect(isRepoPlatform(platform)).toBe(false);
        },
    );

    test("property: true iff the value belongs to the platform union", () => {
        const expectedSet = new Set(DEFAULT_REPO_PLATFORMS);

        fc.assert(
            fc.property(fc.string(), (value) => {
                expect(isRepoPlatform(value)).toBe(expectedSet.has(value as never));
            }),
        );
    });
});

describe.concurrent("normalisePlatforms", () => {
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
});
