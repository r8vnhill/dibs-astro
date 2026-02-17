import type { RepoPlatform, RepoRef } from "~/utils/git";

/**
 * Repository references for this website by hosting platform.
 */
export const WEBSITE_REPO_REFS: Record<RepoPlatform, RepoRef> = {
    github: { user: "r8vnhill", repo: "dibs-astro" },
    gitlab: { user: "r8vnhill", repo: "dibs-astro-website" },
};
