/**
 * Presentation adapter for static website metadata and utilities.
 *
 * Exposes website configuration (repository references, author info, utility functions)
 * through a stable presentation boundary. This keeps UI components free from direct
 * imports of infrastructure static-data modules.
 *
 * @see {@link "$infrastructure/adapters/site-data-adapter"} for the infrastructure implementation
 */

import {
    getWebsiteRepoRef,
    getWebsiteRepoRefs,
    WEBSITE_PRIMARY_AUTHOR,
} from "$infrastructure/adapters/site-data-adapter";

export { getWebsiteRepoRef, getWebsiteRepoRefs, WEBSITE_PRIMARY_AUTHOR };
