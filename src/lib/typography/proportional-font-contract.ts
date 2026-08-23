/**
 * Candidate-independent conformance requirements for the DIBS proportional typography system.
 *
 * This module describes observable requirements without coupling them to a font family, CSS
 * feature, OpenType table, or browser implementation. The canonical ligature/Spanish corpus has
 * exactly one identity here; body and heading roles each declare which parts of that corpus and
 * which additional role-specific requirements they must satisfy, instead of duplicating it.
 */

export type LigatureCategory = "common" | "technical";

export type LigatureCase = Readonly<{
    id: string;
    source: string;
    category: LigatureCategory;
}>;

export type TypographyWeight = 400 | 500 | 700;

export type TypographyState = Readonly<{
    weight: TypographyWeight;
    style: "normal" | "italic";
}>;

export type ConformanceEvidence = "static-metadata" | "browser" | "visual-review" | "license-review";

export type TypographyRole = "body" | "heading";

export type RoleRequirement = Readonly<{
    id:
        | "non-monospaced-reading-metrics"
        | "zero-cost-production"
        | "spanish-coverage"
        | "common-ligatures"
        | "technical-ligatures"
        | "native-styles"
        | "long-form-readability"
        | "ui-readability"
        | "genuine-italic"
        | "source-preservation"
        | "heading-readability"
        | "distinction-from-body"
        | "heading-wrapping";
    description: string;
    evidence: readonly ConformanceEvidence[];
}>;

export type TypographyRoleProfile = Readonly<{
    role: TypographyRole;
    states: readonly TypographyState[];
    requirements: readonly RoleRequirement[];
}>;

export type PairRequirement = Readonly<{
    id:
        | "distinct-family"
        | "clear-hierarchy"
        | "visual-coherence"
        | "layout-compatibility"
        | "license-compatible-delivery";
    description: string;
    evidence: readonly ConformanceEvidence[];
}>;

export type ProportionalTypographyContract = Readonly<{
    ligatures: readonly LigatureCase[];
    spanishCoverage: readonly string[];
    specimenText: readonly string[];
    roles: Readonly<{
        body: TypographyRoleProfile;
        heading: TypographyRoleProfile;
    }>;
    pairRequirements: readonly PairRequirement[];
}>;

const commonLigatures = [
    { id: "common-fi", source: "fi", category: "common" },
    { id: "common-fl", source: "fl", category: "common" },
    { id: "common-ffi", source: "ffi", category: "common" },
    { id: "common-ffl", source: "ffl", category: "common" },
] as const satisfies readonly LigatureCase[];

const technicalLigatures = [
    { id: "technical-arrow-right", source: "->", category: "technical" },
    { id: "technical-arrow-left", source: "<-", category: "technical" },
    { id: "technical-implies", source: "=>", category: "technical" },
    { id: "technical-less-than-or-equal", source: "<=", category: "technical" },
    { id: "technical-greater-than-or-equal", source: ">=", category: "technical" },
    { id: "technical-not-equal", source: "!=", category: "technical" },
    { id: "technical-equal", source: "==", category: "technical" },
    { id: "technical-strict-equal", source: "===", category: "technical" },
    { id: "technical-bidirectional", source: "<->", category: "technical" },
] as const satisfies readonly LigatureCase[];

/**
 * The audit found no independent semantic requirement for a native 600 state. Strong emphasis can use 700 while
 * ordinary UI emphasis uses 500, so the candidate must provide only these future body states.
 */
const bodyStates = [
    { weight: 400, style: "normal" },
    { weight: 400, style: "italic" },
    { weight: 500, style: "normal" },
    { weight: 700, style: "normal" },
] as const satisfies readonly TypographyState[];

/**
 * The future heading profile uses medium and bold as distinct native hierarchy states. Production still renders its
 * existing Inter/Space Grotesk stack and global 600 rule.
 */
const headingStates = [
    { weight: 500, style: "normal" },
    { weight: 700, style: "normal" },
] as const satisfies readonly TypographyState[];

type SharedRequirementId =
    | "non-monospaced-reading-metrics"
    | "zero-cost-production"
    | "spanish-coverage"
    | "native-styles";

const sharedRequirementTemplates: Record<
    SharedRequirementId,
    Readonly<{ describe: (roleLabel: string) => string; evidence: readonly ConformanceEvidence[] }>
> = {
    "non-monospaced-reading-metrics": {
        describe: (roleLabel) =>
            `The ${roleLabel} family does not impose fixed-width cells on ordinary prose and produces a reading`
            + " texture suitable for lesson text.",
        evidence: ["browser", "visual-review"],
    },
    "zero-cost-production": {
        describe: (roleLabel) =>
            `The ${roleLabel} family permits development, deployment, web embedding, and required redistribution`
            + " without license fees; evaluation-only or development-only licenses do not satisfy this requirement.",
        evidence: ["license-review"],
    },
    "spanish-coverage": {
        describe: (roleLabel) => `The ${roleLabel} family itself supplies the required Spanish and Latin characters.`,
        evidence: ["static-metadata", "browser"],
    },
    "native-styles": {
        describe: (roleLabel) =>
            `Required ${roleLabel} weights and styles are genuine font instances or variable-axis positions, never`
            + " a browser-synthesized approximation.",
        evidence: ["static-metadata", "browser"],
    },
};

function sharedRequirement(id: SharedRequirementId, roleLabel: string): RoleRequirement {
    const template = sharedRequirementTemplates[id];
    return { id, description: template.describe(roleLabel), evidence: template.evidence };
}

const bodyRequirements = [
    sharedRequirement("non-monospaced-reading-metrics", "body"),
    sharedRequirement("zero-cost-production", "body"),
    sharedRequirement("spanish-coverage", "body"),
    {
        id: "common-ligatures",
        description: "The body family shapes every canonical common ligature sequence in upright and italic prose.",
        evidence: ["browser", "visual-review"],
    },
    {
        id: "technical-ligatures",
        description: "The body family shapes every canonical technical ligature sequence embedded in prose.",
        evidence: ["browser", "visual-review"],
    },
    sharedRequirement("native-styles", "body"),
    {
        id: "long-form-readability",
        description: "The body family remains suitable for extended university-level lesson prose.",
        evidence: ["visual-review"],
    },
    {
        id: "ui-readability",
        description: "The body family remains legible at ordinary UI sizes such as labels and metadata.",
        evidence: ["visual-review"],
    },
    {
        id: "genuine-italic",
        description: "The body family provides a genuine italic style, not a browser-obliqued synthesis.",
        evidence: ["static-metadata", "visual-review"],
    },
    {
        id: "source-preservation",
        description: "Ligatures are presentation only; DOM, selection, and copied text preserve the source string.",
        evidence: ["browser"],
    },
] as const satisfies readonly RoleRequirement[];

const headingRequirements = [
    sharedRequirement("non-monospaced-reading-metrics", "heading"),
    sharedRequirement("zero-cost-production", "heading"),
    sharedRequirement("spanish-coverage", "heading"),
    {
        id: "common-ligatures",
        description: "The heading family shapes every canonical common ligature sequence at display sizes.",
        evidence: ["browser", "visual-review"],
    },
    {
        id: "technical-ligatures",
        description: "The heading family shapes every canonical technical ligature sequence at display sizes.",
        evidence: ["browser", "visual-review"],
    },
    sharedRequirement("native-styles", "heading"),
    {
        id: "heading-readability",
        description: "The heading family remains legible and retains its personality across H1-H4 sizes.",
        evidence: ["visual-review"],
    },
    {
        id: "distinction-from-body",
        description: "The heading family is immediately distinguishable from the body family in rendered prose.",
        evidence: ["visual-review"],
    },
    {
        id: "heading-wrapping",
        description: "Long Spanish headings wrap acceptably within DIBS layout widths, including constrained regions.",
        evidence: ["browser", "visual-review"],
    },
] as const satisfies readonly RoleRequirement[];

const pairRequirements = [
    {
        id: "distinct-family",
        description:
            "The body family and heading family are genuinely distinct typefaces, even if they belong to the"
            + " same larger type system.",
        evidence: ["static-metadata"],
    },
    {
        id: "clear-hierarchy",
        description: "The pair produces an immediately visible distinction between headings and body prose.",
        evidence: ["visual-review"],
    },
    {
        id: "visual-coherence",
        description:
            "The body and heading families read as one coherent type system rather than two unrelated choices.",
        evidence: ["visual-review"],
    },
    {
        id: "layout-compatibility",
        description:
            "The pair does not regress existing DIBS layout surfaces, such as navigation, TOC, or the reading column.",
        evidence: ["browser", "visual-review"],
    },
    {
        id: "license-compatible-delivery",
        description:
            "The production delivery model for both selected families permits reproducible webfont use in the"
            + " repository and site.",
        evidence: ["license-review"],
    },
] as const satisfies readonly PairRequirement[];

export const proportionalFontContract = {
    ligatures: [...commonLigatures, ...technicalLigatures],
    spanishCoverage: [
        "á",
        "é",
        "í",
        "ó",
        "ú",
        "Á",
        "É",
        "Í",
        "Ó",
        "Ú",
        "ü",
        "Ü",
        "ñ",
        "Ñ",
        "¿",
        "?",
        "¡",
        "!",
        "«",
        "»",
    ],
    specimenText: [
        "La afinidad entre un flujo flexible y una configuración difícil de leer merece una explicación clara.",
        "El texto puede incluir palabras como offline sin perder legibilidad en una lectura extensa.",
        "¿Álvaro explicó la configuración? ¡Sí! La solución requiere precisión, inclusión y revisión:"
            + " «útil».",
        "En el diagrama, A -> B; result != null; x <= limit; input => output.",
        "La relación A <-> B también puede expresarse con <-, >=, == y ===.",
    ],
    roles: {
        body: {
            role: "body",
            states: bodyStates,
            requirements: bodyRequirements,
        },
        heading: {
            role: "heading",
            states: headingStates,
            requirements: headingRequirements,
        },
    },
    pairRequirements,
} as const satisfies ProportionalTypographyContract;
