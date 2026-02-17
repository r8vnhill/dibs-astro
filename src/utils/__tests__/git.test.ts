/**
 * @file git.test.ts
 *
 * Test suite for {@link ../git | utils/git.ts}.
 *
 * ## Purpose
 *
 * This suite validates the correctness, safety, and invariants of the repository utilities used
 * across UI components.
 *
 * The module under test sits at a boundary:
 *
 * - It receives values from loosely-typed sources (frontmatter, JSON, etc.).
 * - It produces strongly-typed, deterministic outputs used by UI components.
 *
 * Because of this boundary role, tests are intentionally defensive.
 *
 * ## Testing Strategy
 *
 * We combine:
 *
 * 1. Deterministic example-based tests (DDT style)
 *    - Validate specific known behaviors.
 *    - Protect against regressions in canonical scenarios.
 * 2. Property-based testing (PBT) via `fast-check`
 *    - Validate structural invariants.
 *    - Protect against edge cases not covered by example-based tests.
 *    - Enforce contracts rather than single scenarios.
 *
 * ## Core Guarantees Enforced by This Suite
 *
 * - {@link isRepoPlatform} is a correct and stable type guard.
 * - {@link normalizePlatforms} always returns:
 *      - a non-empty array
 *      - containing only valid {@link RepoPlatform} values
 *      - without duplicates
 * - {@link buildRepoUrl} produces canonical HTTPS URLs.
 * - {@link buildRepoLinkText} correctly handles label fallbacks.
 *
 * ### These guarantees are relied upon by:
 *
 * - RepoLink.astro
 * - LessonRepoPanel.astro
 * - Any UI rendering repository links
 *
 * If these invariants break, UI safety and determinism break.
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
     * Ensures every platform declared in DEFAULT_REPO_PLATFORMS is accepted by the type guard.
     *
     * This protects against drift between:
     * - The RepoPlatform union
     * - DEFAULT_REPO_PLATFORMS
     * - The guard implementation
     *
     * If a new platform is added, this test automatically adapts.
     */
    test.each(DEFAULT_REPO_PLATFORMS)(
        "accepts valid platform: %s",
        (platform) => {
            expect(isRepoPlatform(platform)).toBe(true);
        },
    );

    /**
     * Ensures clearly invalid values are rejected.
     *
     * Covers:
     * - Unsupported platforms
     * - Case mismatches
     * - Empty strings
     * - Non-string values
     *
     * This is important because inputs may originate from JSON or frontmatter.
     */
    test.each(["", "codeberg", "bitbucket", "GITHUB", null, undefined, 42])(
        "rejects invalid platform: %p",
        (platform) => {
            expect(isRepoPlatform(platform)).toBe(false);
        },
    );

    /**
     * Property-based invariant:
     *
     * ## For any input value:
     *
     *     isRepoPlatform(value) ===
     *       (typeof value === "string" &&
     *         value ∈ DEFAULT_REPO_PLATFORMS)
     *
     * ## This enforces that:
     *
     * - The guard logic remains purely membership-based.
     * - No hidden heuristics are introduced.
     * - The type guard cannot accidentally widen.
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
     * When input is missing, the function must return defaults.
     *
     * This guarantees that UI components never receive:
     * - undefined
     * - an empty array
     *
     * The output contract is always "non-empty array of RepoPlatform".
     */
    test("returns defaults when the input is missing", () => {
        expect(normalizePlatforms()).toEqual([...DEFAULT_REPO_PLATFORMS]);
    });

    /**
     * Valid entries are preserved. Invalid entries are removed.
     *
     * Order must match first appearance.
     */
    test("keeps valid values and removes invalid values", () => {
        expect(normalizePlatforms(["gitlab", "invalid", "github"])).toEqual([
            "gitlab",
            "github",
        ]);
    });

    /**
     * If filtering results in an empty selection, the function must fall back to
     * DEFAULT_REPO_PLATFORMS.
     *
     * This prevents downstream components from rendering nothing.
     */
    test("returns defaults when all provided values are invalid", () => {
        expect(normalizePlatforms(["invalid", "codeberg"])).toEqual([
            ...DEFAULT_REPO_PLATFORMS,
        ]);
    });

    /**
     * Duplicate removal must:
     * - Remove repeated entries.
     * - Preserve first-seen order.
     *
     * This enforces predictable rendering order.
     */
    test("deduplicates while preserving first-seen order", () => {
        expect(normalizePlatforms(["github", "gitlab", "github"])).toEqual([
            "github",
            "gitlab",
        ]);
    });

    /**
     * Non-array input must safely degrade.
     *
     * normalizePlatforms is intentionally forgiving. It is designed to absorb malformed
     * configuration.
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
     * Property-based invariant:
     *
     * For any input:
     *
     * - The output must be non-empty.
     * - All values must be valid RepoPlatform values.
     * - All values must be unique.
     *
     * This is the core contract relied upon by UI.
     *
     * If this test fails, normalization guarantees are broken.
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
    /**
     * Validates canonical base URL construction.
     *
     * Ensures:
     * - HTTPS scheme is used.
     * - Host matches platform.
     * - Path structure is correct.
     */
    test.each([
        ["github", "octocat", "hello-world", "https://github.com/octocat/hello-world"],
        ["gitlab", "dibs-team", "astro-website", "https://gitlab.com/dibs-team/astro-website"],
    ] as const)(
        "builds canonical URL for %s",
        (platform, user, repo, expected) => {
            expect(buildRepoUrl({ user, repo }, platform)).toBe(expected);
        },
    );

    /**
     * Property-based invariant:
     *
     * For any valid user/repo:
     *
     * - URL starts with https://
     * - URL contains correct hostname
     * - URL contains "/user/repo"
     *
     * This protects against accidental string format changes.
     */
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

    /**
     * Validates support for optional subpaths.
     *
     * Ensures:
     * - Leading slashes are normalized.
     * - Path is appended correctly.
     */
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
    /**
     * Whitespace-only labels must not override the default.
     *
     * This prevents subtle UI issues where `"   "` would otherwise render as empty text.
     */
    test("falls back to user/repo when label is blank", () => {
        expect(
            buildRepoLinkText(
                { user: "octocat", repo: "hello-world" },
                "github",
                { label: "   " },
            ),
        ).toBe("octocat/hello-world");
    });

    /**
     * showPlatform must append a human-readable platform label.
     *
     * This ensures accessibility and clarity in multi-platform contexts.
     */
    test("formats text with platform when showPlatform is enabled", () => {
        expect(
            buildRepoLinkText(
                { user: "octocat", repo: "hello-world" },
                "github",
                { showPlatform: true },
            ),
        ).toBe(`octocat/hello-world (${REPO_PLATFORM_LABEL.github})`);
    });

    /**
     * Property-based invariant:
     *
     * Any label consisting solely of whitespace must fall back to "user/repo".
     *
     * This ensures:
     * - Consistent trimming behavior
     * - No accidental blank rendering
     */
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
