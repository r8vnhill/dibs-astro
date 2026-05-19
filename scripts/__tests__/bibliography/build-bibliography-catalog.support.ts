import { buildCatalogArtifactFromTurtle } from "../../lib/bibliography-catalog-builder.mjs";

export type GraphNode = Record<string, unknown> & { "@id": string; "@type": string };
export type CatalogArtifact = {
    "@context": unknown[];
    "@graph": GraphNode[];
};

export const prefixBlock = `
@prefix schema: <https://schema.org/> .
@prefix dibs: <https://dibs.ravenhill.cl/vocab#> .
@prefix ref: <https://dibs.ravenhill.cl/bibliography/ref/> .
@prefix person: <https://dibs.ravenhill.cl/bibliography/person/> .
@prefix work: <https://dibs.ravenhill.cl/bibliography/work/> .
@prefix usage: <https://dibs.ravenhill.cl/bibliography/usage/> .
`;

export const personAda = `
person:ada a schema:Person ;
  schema:givenName "Ada" ;
  schema:familyName "Lovelace" .
`;

export const workBook1 = `
work:book-1 a schema:CreativeWork ;
  schema:name "Foundations of Pipelines" ;
  schema:author person:ada .
`;

export const referenceChapter1 = `
ref:chapter-1 a schema:Book ;
  schema:name "Chapter One" ;
  schema:author person:ada ;
  schema:isPartOf work:book-1 ;
  schema:pageStart 10 ;
  schema:pageEnd 20 .
`;

export const referenceVideo1 = `
ref:video-1 a schema:VideoObject ;
  schema:name "A new type of shell!" ;
  schema:url "https://www.youtube.com/watch?v=GPqV6rLfKR4" ;
  schema:author person:ada .
`;

export const lessonNode = (lessonId: string, title: string) => `
<https://dibs.ravenhill.cl${lessonId}> a schema:LearningResource ;
  schema:name "${title}" ;
  schema:url "${lessonId}" .
`;

export const usageNode = (
    id: string,
    lessonId: string,
    referenceId: string,
    tags: string | string[],
) => `
usage:${id} a dibs:ReferenceUsage ;
  dibs:lesson <https://dibs.ravenhill.cl${lessonId}> ;
  dibs:reference ${referenceId} ;
${[]
    .concat(tags)
    .map((tag) => `  dibs:tag "${tag}" ;`)
    .join("\n")
    .replace(/;$/, ".")}
`;

export const validBaseFixture = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${referenceVideo1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${usageNode("lesson-a-chapter-1", "/notes/lesson-a/", "ref:chapter-1", "recommended")}
${usageNode("lesson-a-video-1", "/notes/lesson-a/", "ref:video-1", "additional")}
`;

export const buildArtifact = (ttl: string, sourceLabel = "test-catalog.ttl"): CatalogArtifact =>
    buildCatalogArtifactFromTurtle(ttl, { sourceLabel }) as CatalogArtifact;

export const graphOf = (ttl: string, sourceLabel?: string): GraphNode[] =>
    buildArtifact(ttl, sourceLabel)["@graph"];

export const idsOf = (artifactOrGraph: CatalogArtifact | GraphNode[]): string[] => {
    const graph = Array.isArray(artifactOrGraph)
        ? artifactOrGraph
        : artifactOrGraph["@graph"];
    return graph.map((node) => node["@id"]);
};

export const findNode = (
    artifactOrGraph: CatalogArtifact | GraphNode[],
    id: string,
): GraphNode | undefined => {
    const graph = Array.isArray(artifactOrGraph)
        ? artifactOrGraph
        : artifactOrGraph["@graph"];
    return graph.find((node) => node["@id"] === id);
};

export const semanticGraph = (artifact: CatalogArtifact): string =>
    JSON.stringify(
        [...artifact["@graph"]].sort((left, right) => left["@id"].localeCompare(right["@id"])),
    );

export const shuffleStatements = (ttl: string, order: number[]): string => {
    const statements = ttl
        .trim()
        .split(/\n\s*\n/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
    const [prefixes, ...body] = statements;
    return [prefixes, ...order.map((index) => body[index])].join("\n\n");
};
