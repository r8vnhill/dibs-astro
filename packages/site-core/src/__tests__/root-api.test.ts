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

    test("exposes repository value symbols and helpers", () => {
        expect(DEFAULT_REPO_PLATFORMS).toEqual(["gitlab", "github"]);
        expect(REPO_PLATFORM_HOST.gitlab).toBe("gitlab.com");
        expect(REPO_PLATFORM_LABEL.github).toBe("GitHub");
        expect(buildRepoUrl).toBeTypeOf("function");
        expect(buildRepoLinkText).toBeTypeOf("function");
        expect(buildCommitUrl).toBeTypeOf("function");
        expect(isRepoPlatform).toBeTypeOf("function");
        expect(normalizePlatforms).toBeTypeOf("function");
    });
});
