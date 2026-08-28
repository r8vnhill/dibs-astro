import { buildHeadPageMeta, type HeadPageMeta } from "@ravenhill/astro-head";
import { expect, suite, test } from "vitest";
import { toDibsPageMetadata } from "../dibs-page-metadata";
import type { PageMeta } from "../page-meta";
import articleComplete from "./fixtures/article-complete.json";
import articleMinimal from "./fixtures/article-minimal.json";
import blankAuthors from "./fixtures/blank-authors.json";
import canonicalInvalid from "./fixtures/canonical-invalid.json";
import canonicalOmitted from "./fixtures/canonical-omitted.json";
import canonicalWhitespace from "./fixtures/canonical-whitespace.json";
import languageOmitted from "./fixtures/language-omitted.json";
import modifiedAt from "./fixtures/modified-at.json";
import multipleAuthors from "./fixtures/multiple-authors.json";
import websiteDefault from "./fixtures/website-default.json";

interface AuthorEvidence {
    name: string;
    url?: string;
}

interface ArticleJsonLdEvidence {
    headline: string;
    authors: AuthorEvidence[];
    inLanguage: string;
    mainEntityOfPage: string;
    datePublished?: string;
    dateModified?: string;
}

interface MetadataEvidence {
    type: "website" | "article";
    canonicalUrl: string;
    language: string;
    authors: AuthorEvidence[];
    publicationDate?: string;
    modificationDate?: string;
    articleJsonLd?: ArticleJsonLdEvidence;
}

interface MetadataFixture {
    title: string;
    url: string;
    pageMeta?: PageMeta;
    expected: MetadataEvidence;
}

const fixtures: ReadonlyArray<{ name: string; fixture: MetadataFixture }> = [
    { name: "website-default.json", fixture: websiteDefault as MetadataFixture },
    { name: "article-minimal.json", fixture: articleMinimal as MetadataFixture },
    { name: "article-complete.json", fixture: articleComplete as MetadataFixture },
    { name: "blank-authors.json", fixture: blankAuthors as MetadataFixture },
    { name: "multiple-authors.json", fixture: multipleAuthors as MetadataFixture },
    { name: "canonical-omitted.json", fixture: canonicalOmitted as MetadataFixture },
    { name: "canonical-invalid.json", fixture: canonicalInvalid as MetadataFixture },
    { name: "canonical-whitespace.json", fixture: canonicalWhitespace as MetadataFixture },
    { name: "language-omitted.json", fixture: languageOmitted as MetadataFixture },
    { name: "modified-at.json", fixture: modifiedAt as MetadataFixture },
];

function projectMetadata(result: HeadPageMeta): MetadataEvidence {
    const authors = result.authors.map(({ name, url }) => ({ name, ...(url ? { url } : {}) }));
    const articleJsonLd = result.jsonLd;

    return {
        type: result.type,
        canonicalUrl: result.canonicalUrl,
        language: result.language,
        authors,
        ...(result.modifiedAt ? { modificationDate: result.modifiedAt } : {}),
        ...(articleJsonLd
            ? {
                articleJsonLd: {
                    headline: articleJsonLd.headline,
                    authors,
                    inLanguage: articleJsonLd.inLanguage,
                    mainEntityOfPage: articleJsonLd.mainEntityOfPage,
                    ...(articleJsonLd.datePublished
                        ? { datePublished: articleJsonLd.datePublished }
                        : {}),
                    ...(articleJsonLd.dateModified
                        ? { dateModified: articleJsonLd.dateModified }
                        : {}),
                },
            }
            : {}),
    };
}

suite("given the neutral cross-site metadata fixture matrix", () => {
    test.each(fixtures)("then $name has the frozen normalized semantics", ({ fixture }) => {
        const { expected, ...input } = fixture;

        const page = toDibsPageMetadata({
            title: input.title,
            description: input.title,
            url: input.url,
            ...(input.pageMeta ? { pageMeta: input.pageMeta } : {}),
        });

        expect(projectMetadata(buildHeadPageMeta(page))).toEqual(expected);
    });
});
