import {
    getWebsiteRepoRef as getConfiguredWebsiteRepoRef,
    WEBSITE_PRIMARY_AUTHOR,
    WEBSITE_REPO_REFS,
} from "~/data/site";
import type { RepoPlatform, RepoRef } from "~/utils/git";

export { WEBSITE_PRIMARY_AUTHOR, WEBSITE_REPO_REFS };

export function getWebsiteRepoRef(platform: RepoPlatform): RepoRef | undefined {
    return getConfiguredWebsiteRepoRef(platform);
}
