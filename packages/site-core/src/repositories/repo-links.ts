import { REPO_PLATFORM_HOST, REPO_PLATFORM_LABEL, type RepoPlatform } from "./repo-platform";
import type { RepoRef } from "./repo-ref";

/**
 * Options for {@link buildRepoUrl}.
 */
export interface BuildRepoUrlOptions {
    /**
     * Optional repository subpath. Leading slashes are normalized.
     */
    path?: string;
}

/**
 * Builds the canonical HTTPS repository URL.
 */
export function buildRepoUrl(
    ref: RepoRef,
    platform: RepoPlatform,
    options?: BuildRepoUrlOptions,
): string {
    const baseUrl = `https://${REPO_PLATFORM_HOST[platform]}/${ref.user}/${ref.repo}`;
    const rawPath = options?.path?.trim();

    if (!rawPath) {
        return baseUrl;
    }

    const normalizedPath = rawPath.replace(/^\/+/, "");
    return `${baseUrl}/${normalizedPath}`;
}

/**
 * Options for {@link buildRepoLinkText}.
 */
export interface BuildRepoLinkTextOptions {
    /**
     * Optional visible label override.
     */
    label?: string;

    /**
     * Whether to append the platform name.
     */
    showPlatform?: boolean;
}

/**
 * Builds consistent, user-facing link text for repository links.
 */
export function buildRepoLinkText(
    ref: RepoRef,
    platform: RepoPlatform,
    options?: BuildRepoLinkTextOptions,
): string {
    const trimmedLabel = options?.label?.trim();
    const baseLabel = trimmedLabel && trimmedLabel.length > 0
        ? trimmedLabel
        : `${ref.user}/${ref.repo}`;

    return options?.showPlatform
        ? `${baseLabel} (${REPO_PLATFORM_LABEL[platform]})`
        : baseLabel;
}

/**
 * Optional configuration for {@link buildCommitUrl}.
 */
export interface BuildCommitUrlOptions {
    /**
     * Optional subpath appended after the commit route.
     */
    path?: string;
}

/**
 * Builds the canonical commit URL for a repository.
 */
export function buildCommitUrl(
    ref: RepoRef,
    platform: RepoPlatform,
    hash: string,
    options?: BuildCommitUrlOptions,
): string {
    const safeHash = hash.trim();

    const commitPath = platform === "gitlab"
        ? `-/commit/${safeHash}`
        : `commit/${safeHash}`;

    const extraPath = options?.path?.trim().replace(/^\/+/, "");
    const path = extraPath ? `${commitPath}/${extraPath}` : commitPath;

    return buildRepoUrl(ref, platform, { path });
}
