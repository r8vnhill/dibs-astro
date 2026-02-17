/**
 * @file page-meta.ts
 *
 * Utilities and type definitions for building normalized, SEO-friendly metadata for HTML <head>
 * generation.
 *
 * ## This module:
 *
 * - Defines structured metadata contracts for pages (`PageMeta`).
 * - Normalizes loosely-typed input (e.g. frontmatter, CMS data).
 * - Produces a strict `HeadPageMeta` model for head rendering.
 * - Optionally generates Schema.org JSON-LD for articles.
 *
 * ## Design goals
 *
 * - Be tolerant of incomplete or slightly malformed input.
 * - Normalize and sanitize early.
 * - Keep rendering logic simple by exposing a fully-derived model.
 * - Avoid leaking optional/dirty data into the UI layer.
 *
 * All normalization logic is intentionally internal to this module.
 */

export interface PageMetaAuthor {
    /**
     * Display name of the author.
     *
     * This value is trimmed during normalization.
     */
    name: string;

    /**
     * Optional absolute URL to the author's profile.
     *
     * Empty or whitespace-only values are removed during normalization.
     */
    url?: string;
}

export interface PageMetaChange {
    /**
     * ISO-8601 date string representing the change date.
     */
    date: string;

    /**
     * Name of the author responsible for the change.
     */
    author: string;

    /**
     * Short description of the change.
     */
    subject: string;

    /**
     * Commit hash or unique change identifier.
     */
    hash: string;
}

/**
 * Raw page metadata.
 *
 * This is typically sourced from:
 * - Frontmatter
 * - CMS data
 * - Static configuration
 *
 * All fields are optional and will be normalized.
 */
export interface PageMeta {
    /**
     * Page classification.
     *
     * Defaults to `"website"` when omitted.
     */
    type?: "website" | "article";

    /**
     * Canonical absolute URL.
     *
     * If omitted, the input URL passed to the builder is used.
     */
    canonicalUrl?: string;

    /**
     * Page authors.
     *
     * Empty names are removed during normalization.
     */
    authors?: PageMetaAuthor[];

    /**
     * ISO-8601 last modified date.
     *
     * Used for:
     * - citation metadata
     * - JSON-LD `dateModified`
     */
    lastModified?: string;

    /**
     * Optional change history.
     *
     * Not currently used for head generation, but preserved for future extensions.
     */
    changes?: PageMetaChange[];

    /**
     * BCP 47 language tag (e.g. "es", "en-GB").
     *
     * Defaults to `"es"` when omitted.
     */
    language?: string;
}

/**
 * Input contract for metadata generation.
 */
export interface BuildHeadPageMetaInput {
    /**
     * Page title (used in JSON-LD headline).
     */
    title: string;

    /**
     * Current absolute page URL.
     *
     * Used as fallback canonical URL.
     */
    url: string;

    /**
     * Optional raw metadata.
     */
    pageMeta?: PageMeta;
}

/**
 * Fully normalized metadata ready for <head> rendering.
 *
 * This type contains:
 * - Canonical URL
 * - Citation-ready fields
 * - Optional JSON-LD object
 */
export interface HeadPageMeta {
    type: "website" | "article";
    canonicalUrl: string;
    citationAuthors: string[];
    citationDate?: string;
    citationLastModifiedDate?: string;
    citationLanguage: string;
    jsonLd?: ArticleJsonLd;
}

/**
 * Normalized author representation.
 *
 * Internal use only.
 */
interface NormalizedAuthor {
    name: string;
    url?: string;
}

/**
 * JSON-LD author representation.
 */
interface ArticleJsonLdAuthor {
    "@type": "Person";
    name: string;
    url?: string;
}

/**
 * Schema.org JSON-LD for Article.
 *
 * See: https://schema.org/Article
 */
interface ArticleJsonLd {
    "@context": "https://schema.org";
    "@type": "Article";
    headline: string;
    author: ArticleJsonLdAuthor[];
    inLanguage: string;
    mainEntityOfPage: string;
    dateModified?: string;
}

/**
 * Fully normalized metadata.
 *
 * Internal intermediate representation.
 */
interface NormalizedHeadMeta {
    type: "website" | "article";
    canonicalUrl: string;
    authors: NormalizedAuthor[];
    lastModified?: string;
    language: string;
}

/**
 * Builds a fully normalized `HeadPageMeta` object.
 *
 * This function:
 *
 * - Normalizes raw metadata.
 * - Derives citation-ready fields.
 * - Generates Schema.org JSON-LD when `type === "article"`.
 *
 * ## Behavior
 *
 * - Missing `type` defaults to `"website"`.
 * - Missing `language` defaults to `"es"`.
 * - Invalid canonical URLs fall back to the provided `url`.
 * - Empty author names are removed.
 * - `jsonLd` is only generated for `"article"` pages.
 */
export function buildHeadPageMeta(input: BuildHeadPageMetaInput): HeadPageMeta {
    const normalized = normalizeHeadMeta(input);

    const jsonLd = normalized.type === "article"
        ? buildArticleJsonLd(input.title, normalized)
        : undefined;

    return {
        type: normalized.type,
        canonicalUrl: normalized.canonicalUrl,
        citationAuthors: normalized.authors.map((author) => author.name),
        citationLanguage: normalized.language,
        ...(normalized.lastModified ? { citationDate: normalized.lastModified } : {}),
        ...(normalized.lastModified
            ? { citationLastModifiedDate: normalized.lastModified }
            : {}),
        ...(jsonLd ? { jsonLd } : {}),
    };
}

/**
 * Normalizes raw metadata into a strict internal model.
 */
function normalizeHeadMeta(input: BuildHeadPageMetaInput): NormalizedHeadMeta {
    const type = input.pageMeta?.type ?? "website";
    const canonicalUrl = normalizeAbsoluteUrl(
        input.pageMeta?.canonicalUrl,
        input.url,
    );
    const authors = normalizeAuthors(input.pageMeta?.authors ?? []);
    const language = normalizeLanguage(input.pageMeta?.language);
    const lastModified = normalizeOptionalText(input.pageMeta?.lastModified);

    return {
        type,
        canonicalUrl,
        authors,
        language,
        ...(lastModified ? { lastModified } : {}),
    };
}

/**
 * Builds a Schema.org Article JSON-LD object.
 *
 * Only used when `type === "article"`.
 */
function buildArticleJsonLd(
    title: string,
    normalized: NormalizedHeadMeta,
): ArticleJsonLd {
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title.trim(),
        author: normalized.authors.map((author) => ({
            "@type": "Person",
            name: author.name,
            ...(author.url ? { url: author.url } : {}),
        })),
        ...(normalized.lastModified
            ? { dateModified: normalized.lastModified }
            : {}),
        inLanguage: normalized.language,
        mainEntityOfPage: normalized.canonicalUrl,
    };
}

/**
 * Normalizes and filters authors.
 *
 * - Trims names.
 * - Removes empty names.
 * - Normalizes URLs.
 */
const normalizeAuthors = (authors: PageMetaAuthor[]): NormalizedAuthor[] =>
    authors
        .map((author) => {
            const normalizedUrl = normalizeOptionalText(author.url);
            return {
                name: author.name.trim(),
                ...(normalizedUrl ? { url: normalizedUrl } : {}),
            };
        })
        .filter((author) => author.name.length > 0);

/**
 * Normalizes a language tag.
 *
 * Defaults to `"es"` if missing or invalid.
 */
const normalizeLanguage = (language?: string): string => normalizeOptionalText(language) ?? "es";

/**
 * Attempts to resolve and normalize an absolute URL.
 *
 * If parsing fails, the fallback URL is returned.
 */
function normalizeAbsoluteUrl(
    candidate: string | undefined,
    fallback: string,
): string {
    const preferred = normalizeOptionalText(candidate);
    const fallbackUrl = normalizeOptionalText(fallback) ?? fallback;
    const resolved = preferred ?? fallbackUrl;

    try {
        return new URL(resolved).href;
    } catch {
        return fallbackUrl;
    }
}

/**
 * Trims and validates optional text values.
 *
 * Returns `undefined` if:
 * - The value is undefined
 * - The value is empty after trimming
 */
function normalizeOptionalText(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
