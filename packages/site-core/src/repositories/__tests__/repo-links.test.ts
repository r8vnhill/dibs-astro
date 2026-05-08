import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
    buildCommitUrl,
    buildRepoLinkText,
    buildRepoUrl,
    DEFAULT_REPO_PLATFORMS,
    REPO_PLATFORM_LABEL,
} from "../../index";

describe("buildRepoUrl", () => {
    test.each(
        [
            ["github", "octocat", "hello-world", "https://github.com/octocat/hello-world"],
            ["gitlab", "dibs-team", "astro-website", "https://gitlab.com/dibs-team/astro-website"],
        ] as const,
    )("builds canonical URL for %s", (platform, user, repo, expected) => {
        expect(buildRepoUrl({ user, repo }, platform)).toBe(expected);
    });

    test.each(
        [
            [
                "github",
                "octocat",
                "hello-world",
                "tree/main",
                "https://github.com/octocat/hello-world/tree/main",
            ],
            [
                "gitlab",
                "dibs-team",
                "astro-website",
                "/-/blob/main/README.md",
                "https://gitlab.com/dibs-team/astro-website/-/blob/main/README.md",
            ],
        ] as const,
    )("supports optional path for %s", (platform, user, repo, path, expected) => {
        expect(buildRepoUrl({ user, repo }, platform, { path })).toBe(expected);
    });

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
                    expect(url).toContain(platform === "github" ? "github.com" : "gitlab.com");
                },
            ),
        );
    });
});

describe("buildCommitUrl", () => {
    test.each(
        [
            [
                "github",
                { user: "octocat", repo: "hello-world" },
                "abc1234",
                "https://github.com/octocat/hello-world/commit/abc1234",
            ],
            [
                "gitlab",
                { user: "dibs-team", repo: "astro-website" },
                "def5678",
                "https://gitlab.com/dibs-team/astro-website/-/commit/def5678",
            ],
        ] as const,
    )("builds canonical commit URL for %s", (platform, ref, hash, expected) => {
        expect(buildCommitUrl(ref, platform, hash)).toBe(expected);
    });

    test("property: preserves hash and uses platform-specific commit route", () => {
        const repoSegment = fc.stringMatching(/^[A-Za-z0-9._-]{1,30}$/);
        const hashSegment = fc.stringMatching(/^[A-Za-z0-9]{7,40}$/);

        fc.assert(
            fc.property(
                fc.constantFrom(...DEFAULT_REPO_PLATFORMS),
                repoSegment,
                repoSegment,
                hashSegment,
                (platform, user, repo, hash) => {
                    const url = buildCommitUrl({ user, repo }, platform, hash);

                    expect(url).toContain(hash);
                    expect(url.includes("//commit/")).toBe(false);
                    expect(url).toContain(platform === "github" ? `/commit/${hash}` : `/-/commit/${hash}`);
                },
            ),
        );
    });
});

describe("buildRepoLinkText", () => {
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
                    const text = buildRepoLinkText({ user, repo }, platform, { label });

                    expect(text).toBe(`${user}/${repo}`);
                },
            ),
        );
    });
});
