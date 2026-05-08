/**
 * @packageDocumentation
 *
 * Public API for `@ravenhill/site-core`.
 *
 * This package provides pure helpers for describing source-code repositories and building repository URLs. Consumers 
 * provide repository metadata, such as owner, repository name, platform, and commit identifiers. The package returns
 * normalized repository links, platform metadata, and display text.
 *
 * The package is intentionally framework-agnostic. It does not depend on Astro, generated lesson metadata, site 
 * configuration, rendering components, or course-specific data.
 *
 * ## Import policy
 *
 * Import only from the package root:
 *
 * ```ts
 * import { buildRepoUrl } from "@ravenhill/site-core";
 * ```
 *
 * Subpath imports are not part of the public contract:
 *
 * ```ts
 * // Do not do this.
 * import { buildRepoUrl } from "@ravenhill/site-core/repositories";
 * ```
 *
 * Keeping a single entry point allows the package to reorganize its internal modules without breaking consumers.
 *
 * ## Boundary with application code
 *
 * Site-specific values, such as configured repository references, primary authors, course metadata, or local 
 * presentation adapters, should remain in the consuming application. This package should only contain reusable 
 * repository primitives and pure URL-building behavior.
 */

import packageJson from "../package.json" with { type: "json" };

/**
 * Canonical package name.
 *
 * Use this constant when runtime code needs to identify this package in logs, diagnostics, telemetry, or compatibility 
 * messages.
 *
 * @example
 * ```ts
 * console.info(`Loaded ${SITE_CORE_PACKAGE_NAME}`);
 * ```
 */
export const SITE_CORE_PACKAGE_NAME = "@ravenhill/site-core";

/**
 * Runtime package version.
 *
 * The value is read from the package manifest and follows semantic versioning. Consumers can use it for diagnostics, 
 * compatibility checks, or support output.
 *
 * @example
 * ```ts
 * console.info(`${SITE_CORE_PACKAGE_NAME}@${SITE_CORE_VERSION}`);
 * ```
 */
export const SITE_CORE_VERSION = packageJson.version;

/**
 * Repository platform metadata and predicates.
 *
 * These exports describe the repository hosting platforms supported by the package. Use {@link isRepoPlatform} to 
 * validate unknown input before passing it to URL builders.
 *
 * Exported members:
 *
 * - {@link DEFAULT_REPO_PLATFORMS}: default ordered list of supported platforms.
 * - {@link REPO_PLATFORM_HOST}: canonical host URL by platform.
 * - {@link REPO_PLATFORM_LABEL}: human-readable platform label by platform.
 * - {@link isRepoPlatform}: type guard for platform values.
 */
export { DEFAULT_REPO_PLATFORMS, isRepoPlatform, REPO_PLATFORM_HOST, REPO_PLATFORM_LABEL } from "./repositories";

/**
 * Repository URL and display-text builders.
 *
 * These functions are pure. They do not read site configuration, environment variables, generated data, or global 
 * application state.
 *
 * Exported members:
 *
 * - {@link buildRepoUrl}: builds a URL for a repository root.
 * - {@link buildCommitUrl}: builds a URL for a specific commit.
 * - {@link buildRepoLinkText}: builds stable display text for a repository link.
 * - {@link normalizePlatforms}: validates and normalizes platform input.
 */
export { buildCommitUrl, buildRepoLinkText, buildRepoUrl, normalizePlatforms } from "./repositories";

/**
 * Public repository types.
 *
 * These types describe repository references, supported platforms, and builder options. They are exported from the 
 * package root so consumers do not need to depend on the internal module layout.
 *
 * Exported types:
 *
 * - {@link RepoRef}: minimal repository reference.
 * - {@link RepoPlatform}: supported repository-hosting platform.
 * - {@link BuildRepoUrlOptions}: options for {@link buildRepoUrl}.
 * - {@link BuildCommitUrlOptions}: options for {@link buildCommitUrl}.
 * - {@link BuildRepoLinkTextOptions}: options for {@link buildRepoLinkText}.
 */
export type {
    BuildCommitUrlOptions,
    BuildRepoLinkTextOptions,
    BuildRepoUrlOptions,
    RepoPlatform,
    RepoRef,
} from "./repositories";
