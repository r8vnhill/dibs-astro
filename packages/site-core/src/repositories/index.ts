/**
 * @file Internal repository export surface.
 *
 * This module gathers the repository-related primitives used by the package root. It exists to keep `src/index.ts` 
 * focused while preserving a single public import path for consumers.
 *
 * @remarks
 * This barrel is an implementation detail. Consumers should not import from this module or from any other package 
 * subpath.
 *
 * Prefer:
 *
 * ```ts
 * import { buildRepoUrl } from "@ravenhill/site-core";
 * ```
 *
 * Avoid:
 *
 * ```ts
 * import { buildRepoUrl } from "@ravenhill/site-core/repositories";
 * ```
 *
 * The package root re-exports the stable public contract. Internal files may be renamed, split, merged, or reorganized
 * without a breaking-change guarantee.
 *
 * Repository exports are grouped by concern:
 *
 * - Platform metadata and predicates from `repo-platform`.
 * - Platform input normalization from `repo-platform-normalization`.
 * - Repository reference types from `repo-ref`.
 * - Repository and commit URL builders from `repo-links`.
 *
 * @internal
 */

export { DEFAULT_REPO_PLATFORMS, isRepoPlatform, REPO_PLATFORM_HOST, REPO_PLATFORM_LABEL } from "./repo-platform";

export type { RepoPlatform } from "./repo-platform";

export { normalizePlatforms } from "./repo-platform-normalization";

export { buildCommitUrl, buildRepoLinkText, buildRepoUrl } from "./repo-links";

export type { BuildCommitUrlOptions, BuildRepoLinkTextOptions, BuildRepoUrlOptions } from "./repo-links";

export type { RepoRef } from "./repo-ref";
