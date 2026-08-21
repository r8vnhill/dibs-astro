/**
 * Candidate-independent conformance requirements for the future proportional DIBS font.
 *
 * This module describes observable requirements without coupling them to a font family, CSS
 * feature, OpenType table, or browser implementation.
 */

export type LigatureCategory = "common" | "technical";

export type LigatureCase = Readonly<{
    id: string;
    source: string;
    category: LigatureCategory;
}>;

export type TypographyWeight = 400 | 500 | 600 | 700;

export type TypographyState = Readonly<{
    weight: TypographyWeight;
    style: "normal" | "italic";
}>;

export type ConformanceEvidence = "static-metadata" | "browser" | "visual-review" | "license-review";

export type ConformanceRequirement = Readonly<{
    id:
        | "proportional-metrics"
        | "long-form-readability"
        | "source-preservation"
        | "spanish-coverage"
        | "native-styles"
        | "license-compatible-delivery";
    description: string;
    evidence: readonly ConformanceEvidence[];
}>;

export type ProportionalTypographyContract = Readonly<{
    ligatures: readonly LigatureCase[];
    spanishCoverage: readonly string[];
    specimenText: readonly string[];
    states: readonly TypographyState[];
    requirements: readonly ConformanceRequirement[];
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

const requiredStates = [
    { weight: 400, style: "normal" },
    { weight: 400, style: "italic" },
    { weight: 500, style: "normal" },
    { weight: 600, style: "normal" },
    { weight: 700, style: "normal" },
] as const satisfies readonly TypographyState[];

const conformanceRequirements = [
    {
        id: "proportional-metrics",
        description: "The family uses proportional metrics rather than fixed-width metrics.",
        evidence: ["browser", "visual-review"],
    },
    {
        id: "long-form-readability",
        description: "The family remains suitable for extended university-level lesson prose.",
        evidence: ["visual-review"],
    },
    {
        id: "source-preservation",
        description: "Ligatures are presentation only; DOM, selection, and copied text preserve the source string.",
        evidence: ["browser"],
    },
    {
        id: "spanish-coverage",
        description: "The selected family itself supplies the required Spanish and Latin characters.",
        evidence: ["static-metadata", "browser"],
    },
    {
        id: "native-styles",
        description: "Required weights and styles are genuine font instances or variable-axis positions.",
        evidence: ["static-metadata", "browser"],
    },
    {
        id: "license-compatible-delivery",
        description: "The production delivery model permits reproducible webfont use in the repository and site.",
        evidence: ["license-review"],
    },
] as const satisfies readonly ConformanceRequirement[];

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
        "¿Álvaro explicó la configuración? ¡Sí! La solución requiere precisión, inclusión y revisión: «útil».",
        "En el diagrama, A -> B; result != null; x <= limit; input => output.",
        "La relación A <-> B también puede expresarse con <-, >=, == y ===.",
    ],
    states: requiredStates,
    requirements: conformanceRequirements,
} as const satisfies ProportionalTypographyContract;
