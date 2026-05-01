/**
 * Presentation adapter for static website metadata and utilities.
 *
 * Exposes website configuration (repository references, author info, utility functions)
 * through a stable presentation boundary. This keeps UI components free from direct
 * imports of infrastructure static-data modules.
 *
 * @see {@link SiteDataAdapter} for the infrastructure implementation
 */

import {
    getWebsiteRepoRef,
    WEBSITE_PRIMARY_AUTHOR,
    WEBSITE_REPO_REFS,
} from "$infrastructure/adapters/SiteDataAdapter";

export { getWebsiteRepoRef, WEBSITE_PRIMARY_AUTHOR, WEBSITE_REPO_REFS };
