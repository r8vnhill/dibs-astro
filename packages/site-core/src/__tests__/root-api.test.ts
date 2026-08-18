import {
    buildCommitUrl,
    buildRepoLinkText,
    buildRepoUrl,
    DEFAULT_REPO_PLATFORMS,
    isRepoPlatform,
    normalizePlatforms,
    REPO_PLATFORM_HOST,
    REPO_PLATFORM_LABEL,
    SITE_CORE_PACKAGE_NAME,
    SITE_CORE_VERSION,
} from "@ravenhill/site-core";
import { describe, expect, test } from "vitest";

describe("site-core root API values", () => {
    test("exposes package identity values", () => {
        expect(SITE_CORE_PACKAGE_NAME).toBe("@ravenhill/site-core");
        expect(SITE_CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/u);
    });

    test("exposes repository platform metadata", () => {
        expect(DEFAULT_REPO_PLATFORMS).toEqual(["gitlab", "github"]);
        expect(REPO_PLATFORM_HOST).toEqual({
            github: "github.com",
            gitlab: "gitlab.com",
        });
        expect(REPO_PLATFORM_LABEL).toEqual({
            github: "GitHub",
            gitlab: "GitLab",
        });
    });

    test("validates and normalizes platforms through the root import", () => {
        expect(isRepoPlatform("github")).toBe(true);
        expect(isRepoPlatform("codeberg")).toBe(false);
        expect(normalizePlatforms(["github", "invalid", "github"])).toEqual(["github"]);
    });

    test("builds repository URLs and link text through the root import", () => {
        const repo = { user: "octocat", repo: "hello-world" };

        expect(buildRepoUrl(repo, "github", { path: "tree/main" }))
            .toBe("https://github.com/octocat/hello-world/tree/main");
        expect(buildCommitUrl(repo, "gitlab", "abc1234"))
            .toBe("https://gitlab.com/octocat/hello-world/-/commit/abc1234");
        expect(buildRepoLinkText(repo, "github", { showPlatform: true }))
            .toBe("octocat/hello-world (GitHub)");
    });
});
