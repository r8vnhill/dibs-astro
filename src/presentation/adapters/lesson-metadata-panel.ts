import { getWebsiteRepoRef, getWebsiteRepoRefs } from "$presentation/adapters/site-data";
import { DEFAULT_LOCALE_PROFILE } from "$presentation/i18n/locale-profile";
import { type LessonMetadataDto, resolveLessonDate } from "@ravenhill/content-core";
import {
    buildCommitUrl,
    normalizePlatforms,
    REPO_PLATFORM_LABEL,
    type RepoPlatform,
    type RepoRef,
} from "@ravenhill/site-core";
import { m } from "~/generated/i18n/messages";
import type { PartialRecord } from "~/types/records";

export type LessonMetaPanelMetadata = LessonMetadataDto;

export type LessonMetaPanelInput = {
    metadata: LessonMetaPanelMetadata;
    websiteRepoRefs?: PartialRecord<RepoPlatform, RepoRef>;
    platforms?: unknown;
};

export type LessonMetaPanelChangeLink = {
    platform: RepoPlatform;
    label: string;
    href: string;
};

export type LessonMetaPanelChange = LessonMetaPanelMetadata["changes"][number] & {
    shortHash: string;
    formattedDate: string;
    links: LessonMetaPanelChangeLink[];
};

export type LessonMetaPanelViewModel = {
    authorsText: string;
    lastModified: string;
    recentChanges: LessonMetaPanelChange[];
};

export function buildLessonMetaPanelViewModel({
    metadata,
    websiteRepoRefs = getWebsiteRepoRefs(),
    platforms,
}: LessonMetaPanelInput): LessonMetaPanelViewModel {
    const selectedPlatforms = normalizePlatforms(platforms);
    const availablePlatforms = selectedPlatforms.filter(
        (platform) => Boolean(websiteRepoRefs[platform] ?? getWebsiteRepoRef(platform)),
    );

    return {
        authorsText: formatAuthors(metadata.authors),
        lastModified: formatLessonDate(metadata.lastModified),
        recentChanges: metadata.changes.slice(0, 3).map((change) => ({
            ...change,
            shortHash: change.hash.slice(0, 7),
            formattedDate: formatLessonDate(change.date),
            links: buildChangeLinks(change.hash, availablePlatforms, websiteRepoRefs),
        })),
    };
}

function formatLessonDate(date?: string): string {
    const resolved = resolveLessonDate(date);

    if (resolved.kind === "missing") return m.lesson_metadata_unknown_date();
    if (resolved.kind === "passthrough") return resolved.value;

    return new Intl.DateTimeFormat(DEFAULT_LOCALE_PROFILE.formatLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    }).format(resolved.value);
}

function formatAuthors(authors: LessonMetaPanelMetadata["authors"]): string {
    return authors
        .map((author) => author.name.trim())
        .filter(Boolean)
        .join(", ");
}

function buildChangeLinks(
    hash: string,
    platforms: readonly RepoPlatform[],
    websiteRepoRefs: PartialRecord<RepoPlatform, RepoRef>,
): LessonMetaPanelChangeLink[] {
    return platforms.flatMap((platform) => {
        const repoRef = websiteRepoRefs[platform] ?? getWebsiteRepoRef(platform);

        if (!repoRef) {
            return [];
        }

        return [{
            platform,
            label: REPO_PLATFORM_LABEL[platform],
            href: buildCommitUrl(repoRef, platform, hash),
        }];
    });
}
