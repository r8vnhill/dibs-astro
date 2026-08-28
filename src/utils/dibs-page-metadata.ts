import type { PageMetadata } from "@ravenhill/astro-head";
import type { PageMeta } from "./page-meta";

export interface DibsPageMetadataInput {
    title: string;
    description: string;
    url: string;
    type?: PageMetadata["type"];
    openGraphLocale?: string;
    pageMeta?: PageMeta;
}

/** Maps DIBS content metadata onto the published generic page contract. */
export function toDibsPageMetadata(input: DibsPageMetadataInput): PageMetadata {
    const language = input.pageMeta?.language?.trim() || "es";
    const lastModified = input.pageMeta?.lastModified?.trim();
    const authors = (input.pageMeta?.authors ?? []).map(({ name, url }) => ({
        name,
        ...(url !== undefined ? { url } : {}),
    }));

    return {
        title: input.title,
        description: input.description,
        url: input.url,
        language,
        type: input.pageMeta?.type ?? input.type ?? "website",
        ...(input.openGraphLocale ? { openGraphLocale: input.openGraphLocale } : {}),
        ...(input.pageMeta?.canonicalUrl !== undefined
            ? { canonicalUrl: input.pageMeta.canonicalUrl }
            : {}),
        ...(authors.length > 0 ? { authors } : {}),
        ...(lastModified
            ? { publishedAt: lastModified, modifiedAt: lastModified }
            : {}),
    };
}
