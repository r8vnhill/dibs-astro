import { describe, expect, it } from "vitest";
import type { RepoPlatform } from "@ravenhill/site-core";
import * as siteData from "../site-data";

describe("site data presentation adapter", () => {
    const configuredPlatforms = Object.keys(siteData.getWebsiteRepoRefs()) as RepoPlatform[];

    it.each(configuredPlatforms)("returns the configured %s repository reference", (platform) => {
        expect(siteData.getWebsiteRepoRef(platform)).toEqual(siteData.getWebsiteRepoRefs()[platform]);
    });

    it("returns undefined for unconfigured platforms", () => {
        expect(siteData.getWebsiteRepoRef("codeberg" as RepoPlatform)).toBeUndefined();
    });

    it("exposes repository references as a platform-keyed map", () => {
        expect(siteData.getWebsiteRepoRefs()).toEqual({
            github: { user: expect.any(String), repo: expect.any(String) },
            gitlab: { user: expect.any(String), repo: expect.any(String) },
        });
    });

    it("returns a defensive copy of the repository reference map", () => {
        const repoRefs = siteData.getWebsiteRepoRefs();
        const secondRepoRefs = siteData.getWebsiteRepoRefs();

        expect(repoRefs).not.toBe(secondRepoRefs);
        for (const platform of configuredPlatforms) {
            expect(repoRefs[platform]).not.toBe(secondRepoRefs[platform]);
        }
    });

    it("does not expose the raw repository reference constant", () => {
        expect("WEBSITE_REPO_REFS" in siteData).toBe(false);
    });
});
