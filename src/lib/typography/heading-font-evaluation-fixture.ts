/**
 * @fileoverview Data model for the DIBS Slab heading-evaluation fixture.
 *
 * The heading experiment compares the in-house candidate (`DIBS Slab`) against a pinned, local-only
 * reference (`Space Grotesk Reference 2.0.0`) so a human can make the final typography call from
 * screenshots. This module owns every fact the fixture page and its tests need: the canonical set of
 * heading specimens, the two families under review, and the size/weight/style conventions applied to
 * each specimen. The `.astro` page renders these tables; it never invents its own cases.
 *
 * For course readers: the heading role only needs two native states (500 and 700, upright). Italics
 * and other weights are intentionally out of scope, which is why every family here derives its state
 * list from {@link proportionalFontContract} instead of listing states locally.
 */

import { proportionalFontContract, type TypographyState } from "./proportional-font-contract";

/** One heading specimen: fixed semantic level, source text, and the weight it is shown at. */
export type HeadingEvaluationCase = Readonly<{
    id:
        | "h1-short"
        | "h1-long"
        | "h2-short"
        | "h2-long"
        | "h3"
        | "h4"
        | "spanish-coverage"
        | "common-ligatures"
        | "technical-notation";
    /** HTML heading element the specimen renders as, so hierarchy is evaluated with real semantics. */
    semanticLevel: "h1" | "h2" | "h3" | "h4";
    text: string;
    /** `hierarchy` cases model real lesson headings; `diagnostic` cases stress a specific glyph set. */
    kind: "hierarchy" | "diagnostic";
    representativeWeight: 500 | 700;
}>;

/** One family in the stacked comparison: the candidate or the pinned local reference. */
export type HeadingEvaluationFamily = Readonly<{
    id: "dibs-slab" | "space-grotesk-reference";
    kind: "candidate" | "reference";
    label: "DIBS Slab" | "Space Grotesk Reference 2.0.0";
    /** Exact `font-family` name declared by the fixture's local `@font-face` rules. */
    cssFamily: "DIBS Slab" | "Space Grotesk Reference 2.0.0";
    states: readonly TypographyState[];
}>;

const technicalSequences = proportionalFontContract.ligatures
    .filter(({ category }) => category === "technical")
    .map(({ source }) => source)
    .join(" / ");

/** Canonical, ordered heading specimens. Index-free: reference cases through {@link headingCaseById}. */
export const headingEvaluationCases = [
    {
        id: "h1-short",
        semanticLevel: "h1",
        text: "Diseñar APIs",
        kind: "hierarchy",
        representativeWeight: 700,
    },
    {
        id: "h1-long",
        semanticLevel: "h1",
        text: "Diseñar una API estable para evolucionar una biblioteca sin perder claridad",
        kind: "hierarchy",
        representativeWeight: 700,
    },
    {
        id: "h2-short",
        semanticLevel: "h2",
        text: "Tipos y valores",
        kind: "hierarchy",
        representativeWeight: 700,
    },
    {
        id: "h2-long",
        semanticLevel: "h2",
        text: "Cómo modelar una decisión explícita cuando el contexto técnico cambia",
        kind: "hierarchy",
        representativeWeight: 700,
    },
    {
        id: "h3",
        semanticLevel: "h3",
        text: "Configuración y cooperación",
        kind: "hierarchy",
        representativeWeight: 500,
    },
    {
        id: "h4",
        semanticLevel: "h4",
        text: "Flujo: A -> B; result != null",
        kind: "hierarchy",
        representativeWeight: 500,
    },
    {
        id: "spanish-coverage",
        semanticLevel: "h2",
        text: proportionalFontContract.spanishCoverage.join(" "),
        kind: "diagnostic",
        representativeWeight: 700,
    },
    {
        id: "common-ligatures",
        semanticLevel: "h2",
        text: "Una definición eficiente y flexible: fi fl ffi ffl",
        kind: "diagnostic",
        representativeWeight: 700,
    },
    {
        id: "technical-notation",
        semanticLevel: "h2",
        text: technicalSequences,
        kind: "diagnostic",
        representativeWeight: 700,
    },
] as const satisfies readonly HeadingEvaluationCase[];

/** The candidate first, then the pinned reference. Order is asserted by the fixture tests. */
export const headingEvaluationFamilies = [
    {
        id: "dibs-slab",
        kind: "candidate",
        label: "DIBS Slab",
        cssFamily: "DIBS Slab",
        states: proportionalFontContract.roles.heading.states,
    },
    {
        id: "space-grotesk-reference",
        kind: "reference",
        label: "Space Grotesk Reference 2.0.0",
        cssFamily: "Space Grotesk Reference 2.0.0",
        states: proportionalFontContract.roles.heading.states,
    },
] as const satisfies readonly HeadingEvaluationFamily[];

/** Tailwind size utilities per semantic level, so paired specimens always share a type scale. */
export const headingEvaluationSizeClasses = {
    h1: "text-2xl sm:text-3xl",
    h2: "text-xl sm:text-2xl",
    h3: "text-lg sm:text-xl",
    h4: "text-base sm:text-lg",
} as const;

/** Hierarchy cases with their weight, for tests that pin the "H1/H2 bold, H3/H4 medium" convention. */
export const headingEvaluationRepresentativeStates = headingEvaluationCases
    .filter(({ kind }) => kind === "hierarchy")
    .map(({ id, representativeWeight }) => ({ id, representativeWeight }));

/** Look a canonical case up by id instead of by array position. Throws on an unknown id. */
export const headingCaseById = (id: HeadingEvaluationCase["id"]): HeadingEvaluationCase => {
    const found = headingEvaluationCases.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`Unknown heading evaluation case: ${id}`);
    return found;
};

/**
 * Specimen reused across every family in the "native states" matrix. `common-ligatures` is the widest
 * diagnostic string, so it exposes state-to-state differences in fit at a glance.
 */
export const headingStateMatrixSample = headingCaseById("common-ligatures");

/** Inline style shared by every heading specimen, keeping paired candidate/reference cells identical. */
export const headingSpecimenStyle = (
    cssFamily: HeadingEvaluationFamily["cssFamily"] | "DIBS Slab",
    weight: number,
    style: TypographyState["style"],
): string => `font-family:"${cssFamily}";font-weight:${weight};font-style:${style};`;
