/**
 * @file git.test.ts
 *
 * Test suite for {@link ../git | utils/git.ts}.
 *
 * This file validates both:
 *
 * - Deterministic behavior through example-based tests (DDT style).
 * - Structural invariants through property-based testing (PBT) using `fast-check`.
 *
 * The goal is to ensure:
 *
 * - {@link isRepoPlatform} behaves as a correct type guard for {@link RepoPlatform}.
 * - {@link normalizePlatforms} is safe against untrusted input and always returns a valid,
 *   non-empty platform list.
 *
 * These tests are intentionally defensive: the functions under test are used at UI boundaries
 * where values may come from frontmatter, JSON, or other loosely-typed sources.
 */

import fc from "fast-check";
import {
    buildRepoLinkText,
    buildRepoUrl,
    DEFAULT_REPO_PLATFORMS,
    isRepoPlatform,
    normalizePlatforms,
    REPO_PLATFORM_LABEL,
} from "../git";

describe.concurrent("isRepoPlatform", () => {
    /**
     * Ensures that every literal defined in DEFAULT_REPO_PLATFORMS is accepted by the type guard.
     *
     * This test automatically adapts if the union grows.
     */
    test.each(DEFAULT_REPO_PLATFORMS)(
        "accepts valid platform: %s",
        (platform) => {
            expect(isRepoPlatform(platform)).toBe(true);
        },
    );

    /**
     * Verifies that common invalid values are rejected.
     *
     * Covers:
     * - Empty string
     * - Unsupported platforms
     * - Case mismatches
     * - Non-string values
     */
    test.each(["", "codeberg", "bitbucket", "GITHUB", null, undefined, 42])(
        "rejects invalid platform: %p",
        (platform) => {
            expect(isRepoPlatform(platform)).toBe(false);
        },
    );

    /**
     * Property-based test:
     *
     * `isRepoPlatform(value)` must return true
     * if and only if the value is a string that belongs to
     * the DEFAULT_REPO_PLATFORMS set.
     *
     * This ensures the type guard and the platform union
     * never drift apart.
     */
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

describe.concurrent("normalizePlatforms", () => {
    /**
     * If no input is provided, defaults must be returned.
     *
     * This ensures the UI always has a stable, non-empty platform list.
     */
    test("returns defaults when the input is missing", () => {
        expect(normalizePlatforms()).toEqual([...DEFAULT_REPO_PLATFORMS]);
    });

    /**
     * Valid platforms are kept. Invalid ones are removed.
     */
    test("keeps valid values and removes invalid values", () => {
        expect(normalizePlatforms(["gitlab", "invalid", "github"])).toEqual([
            "gitlab",
            "github",
        ]);
    });

    /**
     * If all values are invalid, the function must fall back to DEFAULT_REPO_PLATFORMS.
     */
    test("returns defaults when all provided values are invalid", () => {
        expect(normalizePlatforms(["invalid", "codeberg"])).toEqual([
            ...DEFAULT_REPO_PLATFORMS,
        ]);
    });

    /**
     * Duplicate platforms should be removed while preserving first-seen order.
     */
    test("deduplicates while preserving first-seen order", () => {
        expect(normalizePlatforms(["github", "gitlab", "github"])).toEqual([
            "github",
            "gitlab",
        ]);
    });

    /**
     * Any non-array input must safely fall back to defaults.
     *
     * This guards against untrusted or malformed configuration sources.
     */
    test.each([null, undefined, 123, "github", { platforms: ["github"] }])(
        "returns defaults for non-array input: %p",
        (value) => {
            expect(normalizePlatforms(value as never)).toEqual([
                ...DEFAULT_REPO_PLATFORMS,
            ]);
        },
    );

    /**
     * Property-based test:
     *
     * For any input value:
     *
     * - The output must be non-empty.
     * - All values must be valid RepoPlatform values.
     * - All values must be unique.
     *
     * This enforces the core contract relied upon by UI components.
     */
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

describe.concurrent("buildRepoUrl", () => {
    test.each([
        ["github", "octocat", "hello-world", "https://github.com/octocat/hello-world"],
        ["gitlab", "dibs-team", "astro-website", "https://gitlab.com/dibs-team/astro-website"],
    ] as const)(
        "builds canonical URL for %s",
        (platform, user, repo, expected) => {
            expect(buildRepoUrl({ user, repo }, platform)).toBe(expected);
        },
    );

    test("property: output starts with https:// and contains host + user/repo", () => {
        const repoSegment = fc.stringMatching(/^[A-Za-z0-9._-]{1,30}$/);

        fc.assert(
            fc.property(
                fc.constantFrom(...DEFAULT_REPO_PLATFORMS),
                repoSegment,
                repoSegment,
                (platform, user, repo) => {
                    const url = buildRepoUrl({ user, repo }, platform);

                    expect(url.startsWith("https://")).toBe(true);
                    expect(url).toContain(`/${user}/${repo}`);
                    expect(url).toContain(
                        platform === "github" ? "github.com" : "gitlab.com",
                    );
                },
            ),
        );
    });

    test.each([
        ["github", "octocat", "hello-world", "tree/main", "https://github.com/octocat/hello-world/tree/main"],
        ["gitlab", "dibs-team", "astro-website", "/-/blob/main/README.md", "https://gitlab.com/dibs-team/astro-website/-/blob/main/README.md"],
    ] as const)(
        "supports optional path for %s",
        (platform, user, repo, path, expected) => {
            expect(buildRepoUrl({ user, repo }, platform, { path })).toBe(expected);
        },
    );
});

describe.concurrent("buildRepoLinkText", () => {
    test("falls back to user/repo when label is blank", () => {
        expect(
            buildRepoLinkText(
                { user: "octocat", repo: "hello-world" },
                "github",
                { label: "   " },
            ),
        ).toBe("octocat/hello-world");
    });

    test("formats text with platform when showPlatform is enabled", () => {
        expect(
            buildRepoLinkText(
                { user: "octocat", repo: "hello-world" },
                "github",
                { showPlatform: true },
            ),
        ).toBe(`octocat/hello-world (${REPO_PLATFORM_LABEL.github})`);
    });

    test("property: whitespace-only labels always fall back to user/repo", () => {
        const whitespaceLabel = fc.stringMatching(/^\s+$/);
        const userSegment = fc.stringMatching(/^[A-Za-z0-9._-]{1,30}$/);
        const repoSegment = fc.stringMatching(/^[A-Za-z0-9._-]{1,30}$/);

        fc.assert(
            fc.property(
                fc.constantFrom(...DEFAULT_REPO_PLATFORMS),
                userSegment,
                repoSegment,
                whitespaceLabel,
                (platform, user, repo, label) => {
                    const text = buildRepoLinkText(
                        { user, repo },
                        platform,
                        { label },
                    );

                    expect(text).toBe(`${user}/${repo}`);
                },
            ),
        );
    });
});
