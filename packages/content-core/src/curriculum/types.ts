export type CurriculumFacets = Readonly<Record<string, readonly string[]>>;

export type CurriculumConcept = Readonly<{
    id: string;
    title: string;
}>;

export type CurriculumUnit<Metadata = unknown> = Readonly<{
    id: string;
    title: string;
    conceptIds: readonly string[];
    facets: CurriculumFacets;
    metadata?: Metadata;
}>;
