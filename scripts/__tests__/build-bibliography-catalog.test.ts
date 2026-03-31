import { describe, expect, it } from "vitest";
import { buildCatalogArtifactFromTurtle } from "../lib/bibliography-catalog-builder.mjs";

const VALID_TTL = `
@prefix schema: <https://schema.org/> .
@prefix dibs: <https://dibs.ravenhill.cl/vocab#> .
@prefix ref: <https://dibs.ravenhill.cl/bibliography/ref/> .
@prefix person: <https://dibs.ravenhill.cl/bibliography/person/> .
@prefix work: <https://dibs.ravenhill.cl/bibliography/work/> .
@prefix usage: <https://dibs.ravenhill.cl/bibliography/usage/> .

person:ada a schema:Person ;
  schema:givenName "Ada" ;
  schema:familyName "Lovelace" .

work:book-1 a schema:CreativeWork ;
  schema:name "Foundations of Pipelines" ;
  schema:author person:ada .

ref:chapter-1 a schema:Book ;
  schema:name "Chapter One" ;
  schema:author person:ada ;
  schema:isPartOf work:book-1 ;
  schema:pageStart 10 ;
  schema:pageEnd 20 .

ref:video-1 a schema:VideoObject ;
  schema:name "A new type of shell!" ;
  schema:url "https://www.youtube.com/watch?v=GPqV6rLfKR4" ;
  schema:author person:ada .

<https://dibs.ravenhill.cl/notes/lesson-a/> a schema:LearningResource ;
  schema:name "Lesson A" ;
  schema:url "/notes/lesson-a/" .

usage:lesson-a-chapter-1 a dibs:ReferenceUsage ;
  dibs:lesson <https://dibs.ravenhill.cl/notes/lesson-a/> ;
  dibs:reference ref:chapter-1 ;
  dibs:tag "recommended" .

usage:lesson-a-video-1 a dibs:ReferenceUsage ;
  dibs:lesson <https://dibs.ravenhill.cl/notes/lesson-a/> ;
  dibs:reference ref:video-1 ;
  dibs:tag "additional" .
`;

describe("buildCatalogArtifactFromTurtle", () => {
    it("builds a graph artifact consumable by the catalog loader", () => {
        const artifact = buildCatalogArtifactFromTurtle(VALID_TTL, {
            sourceLabel: "test-catalog.ttl",
        });

        expect(artifact["@graph"]).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    "@id": "person:ada",
                    "@type": "Person",
                    givenName: "Ada",
                    familyName: "Lovelace",
                }),
                expect.objectContaining({
                    "@id": "ref:chapter-1",
                    "@type": "Book",
                    name: "Chapter One",
                    isPartOf: { "@id": "work:book-1" },
                    author: [{ "@id": "person:ada" }],
                }),
                expect.objectContaining({
                    "@id": "ref:video-1",
                    "@type": "VideoObject",
                    name: "A new type of shell!",
                    url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
                    author: [{ "@id": "person:ada" }],
                }),
                expect.objectContaining({
                    "@id": "/notes/lesson-a/",
                    "@type": "LearningResource",
                    url: "/notes/lesson-a/",
                }),
                expect.objectContaining({
                    "@id": "usage:lesson-a-chapter-1",
                    "@type": "dibs:ReferenceUsage",
                    "dibs:reference": { "@id": "ref:chapter-1" },
                    "dibs:tags": ["recommended"],
                }),
                expect.objectContaining({
                    "@id": "usage:lesson-a-video-1",
                    "@type": "dibs:ReferenceUsage",
                    "dibs:reference": { "@id": "ref:video-1" },
                    "dibs:tags": ["additional"],
                }),
            ]),
        );
    });

    it("fails on invalid usage tags", () => {
        const invalid = `${VALID_TTL}
usage:lesson-a-bad-tag a dibs:ReferenceUsage ;
  dibs:lesson <https://dibs.ravenhill.cl/notes/lesson-a/> ;
  dibs:reference ref:chapter-1 ;
  dibs:tag "draft" .
`;

        expect(() =>
            buildCatalogArtifactFromTurtle(invalid, {
                sourceLabel: "invalid-tags.ttl",
            })
        ).toThrow(/unsupported tag "draft"/);
    });

    it("fails on missing referenced nodes", () => {
        const invalid = `
@prefix schema: <https://schema.org/> .
@prefix dibs: <https://dibs.ravenhill.cl/vocab#> .
@prefix ref: <https://dibs.ravenhill.cl/bibliography/ref/> .
@prefix usage: <https://dibs.ravenhill.cl/bibliography/usage/> .

ref:chapter-1 a schema:Book ;
  schema:name "Chapter One" .

usage:broken a dibs:ReferenceUsage ;
  dibs:lesson <https://dibs.ravenhill.cl/notes/missing/> ;
  dibs:reference ref:chapter-1 ;
  dibs:tag "recommended" .
`;

        expect(() =>
            buildCatalogArtifactFromTurtle(invalid, {
                sourceLabel: "missing-node.ttl",
            })
        ).toThrow(/points to missing node/);
    });

    it("ignores pending-revision usages that only reference unsupported nodes", () => {
        const pendingDraft = `
@prefix schema: <https://schema.org/> .
@prefix dibs: <https://dibs.ravenhill.cl/vocab#> .
@prefix ref: <https://dibs.ravenhill.cl/bibliography/ref/> .
@prefix usage: <https://dibs.ravenhill.cl/bibliography/usage/> .

ref:draft-video a schema:MediaObject ;
  schema:name "Internal draft video" .

<https://dibs.ravenhill.cl/notes/lesson-draft/> a schema:LearningResource ;
  schema:name "Draft lesson" ;
  schema:url "/notes/lesson-draft/" .

usage:lesson-draft-video a dibs:ReferenceUsage ;
  dibs:lesson <https://dibs.ravenhill.cl/notes/lesson-draft/> ;
  dibs:reference ref:draft-video ;
  dibs:tag "pending-revision" .
`;

        const artifact = buildCatalogArtifactFromTurtle(pendingDraft, {
            sourceLabel: "pending-draft.ttl",
        });

        expect(artifact["@graph"]).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ "@id": "ref:draft-video" }),
                expect.objectContaining({ "@id": "usage:lesson-draft-video" }),
            ]),
        );
    });
});
