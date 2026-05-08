/**
 * @file Infrastructure adapter for site configuration.
 *
 * This module adapts concrete site configuration from `~/data/site` into a small query-oriented API. It lets
 * presentation adapters consume site metadata without depending directly on raw configuration objects.
 *
 * The adapter intentionally stays thin:
 *
 * - `WEBSITE_PRIMARY_AUTHOR` is re-exported while author metadata remains a simple site-wide value.
 * - {@link getWebsiteRepoRef} exposes optional platform-specific repository lookup.
 * - {@link getWebsiteRepoRefs} exposes the configured repository map through defensive copies instead of returning the
 *   raw configuration object.
 *
 * Presentation components should prefer importing from `$presentation/adapters/site-data`, not from this
 * infrastructure module. This keeps the presentation boundary stable if the configuration source or adapter
 * implementation changes.
 */

import type { RepoPlatform, RepoRef } from "@ravenhill/site-core";
import {
    getWebsiteRepoRef as getConfiguredWebsiteRepoRef,
    WEBSITE_PRIMARY_AUTHOR,
    WEBSITE_REPO_REFS,
} from "~/data/site";
import type { PartialRecord } from "~/types/records";

export { WEBSITE_PRIMARY_AUTHOR };

/**
 * Returns the configured repository reference for a hosting platform.
 *
 * Missing platform configuration is valid. Optional rendering flows can use an `undefined` result to omit
 * repository-specific links.
 *
 * @param platform - Repository hosting platform to resolve.
 * @returns The configured repository reference, or `undefined` when absent.
 */
export const getWebsiteRepoRef = (
    platform: RepoPlatform,
): RepoRef | undefined => getConfiguredWebsiteRepoRef(platform);

/**
 * Returns all configured repository references keyed by platform.
 *
 * The returned record is detached from the raw site configuration. Both the map object and each repository reference
 * are copied, so callers cannot mutate the shared configuration by accident.
 *
 * @returns A platform-keyed record of configured repository references.
 */
export const getWebsiteRepoRefs = (): PartialRecord<RepoPlatform, RepoRef> =>
    Object.fromEntries(
        Object.entries(WEBSITE_REPO_REFS)
            .map(([platform, repoRef]) => [
                platform,
                { ...repoRef },
            ]),
    ) as PartialRecord<RepoPlatform, RepoRef>;
