import { expect, suite, test } from "vitest";
import { buildHeadPageMeta, type HeadPageMeta, type PageMeta } from "../page-meta";
import articleComplete from "./fixtures/article-complete.json";
import articleMinimal from "./fixtures/article-minimal.json";
import blankAuthors from "./fixtures/blank-authors.json";
import canonicalInvalid from "./fixtures/canonical-invalid.json";
import canonicalOmitted from "./fixtures/canonical-omitted.json";
import canonicalWhitespace from "./fixtures/canonical-whitespace.json";
import languageOmitted from "./fixtures/language-omitted.json";
import lastModified from "./fixtures/last-modified.json";
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
    { name: "last-modified.json", fixture: lastModified as MetadataFixture },
];

function projectMetadata(result: HeadPageMeta): MetadataEvidence {
    const articleJsonLd = result.jsonLd as {
        headline: string;
        author: Array<{ name: string; url?: string }>;
        inLanguage: string;
        mainEntityOfPage: string;
        dateModified?: string;
    } | undefined;
    const authors = articleJsonLd
        ? articleJsonLd.author.map(({ name, url }) => ({ name, ...(url ? { url } : {}) }))
        : result.citationAuthors.map((name) => ({ name }));

    return {
        type: result.type,
        canonicalUrl: result.canonicalUrl,
        language: result.citationLanguage,
        authors,
        ...(result.citationDate ? { publicationDate: result.citationDate } : {}),
        ...(result.citationLastModifiedDate
            ? { modificationDate: result.citationLastModifiedDate }
            : {}),
        ...(articleJsonLd
            ? {
                articleJsonLd: {
                    headline: articleJsonLd.headline,
                    authors,
                    inLanguage: articleJsonLd.inLanguage,
                    mainEntityOfPage: articleJsonLd.mainEntityOfPage,
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

        expect(projectMetadata(buildHeadPageMeta(input))).toEqual(expected);
    });
});
