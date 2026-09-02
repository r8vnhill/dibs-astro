import { proportionalFontContract, type TypographyState } from "./proportional-font-contract";

export type BodyEvaluationSurface = Readonly<{
    id:
        | "long-prose"
        | "inline-semantics"
        | "unordered-list"
        | "ordered-list"
        | "navigation"
        | "metadata"
        | "callout"
        | "technical-prose";
    label: string;
}>;

export type BodyEvaluationFamily = Readonly<{
    id: "dibs-sans" | "inter-reference";
    kind: "candidate" | "reference";
    label: string;
    cssFamily: string;
    states: readonly TypographyState[];
}>;

export const bodyEvaluationFamilies = [
    {
        id: "dibs-sans",
        kind: "candidate",
        label: "DIBS Sans",
        cssFamily: "DIBS Sans",
        states: proportionalFontContract.roles.body.states,
    },
    {
        id: "inter-reference",
        kind: "reference",
        label: "Inter Reference 4.1",
        cssFamily: "Inter Reference 4.1",
        states: proportionalFontContract.roles.body.states,
    },
] as const satisfies readonly BodyEvaluationFamily[];

export const bodyEvaluationSurfaces = [
    { id: "long-prose", label: "Lectura extensa" },
    { id: "inline-semantics", label: "Énfasis, enlaces y puntuación" },
    { id: "unordered-list", label: "Lista no ordenada" },
    { id: "ordered-list", label: "Lista ordenada" },
    { id: "navigation", label: "Etiquetas de navegación" },
    { id: "metadata", label: "Metadatos de la lección" },
    { id: "callout", label: "Contenido de callout" },
    { id: "technical-prose", label: "Notación técnica en prosa" },
] as const satisfies readonly BodyEvaluationSurface[];

export const bodyEvaluationText = {
    longProse: [
        "Una lección clara permite que el alumnado siga una idea, vuelva sobre un detalle y conecte cada decisión con el problema que intenta resolver. La explicación necesita ritmo: las frases deben respirar, los párrafos deben conservar su forma y la lectura no debería sentirse como una sucesión de instrucciones de código.",
        "En una interfaz educativa, la tipografía acompaña tanto la lectura pausada como la consulta rápida. Álvaro puede revisar una definición, encontrar una referencia y continuar con la actividad sin perderse entre signos, números o palabras técnicas. ¿La composición mantiene esa continuidad? ¡Sí, cuando cada elemento conserva una jerarquía legible y una textura estable!",
        "La precisión también aparece en los detalles: «configuración», «señal» y «pingüino» deben mostrar sus caracteres completos; los paréntesis y las comillas deben mantener un espaciado natural; y una palabra como cooperación no debería adquirir un aspecto extraño cuando aparece junto a énfasis o enlaces.",
    ],
    inlineSemantics: {
        before: "La explicación combina ",
        emphasis: "énfasis semántico",
        middle: " con ",
        strong: "una conclusión importante",
        after: "; también puede enlazar con ",
        link: "la documentación de referencia",
        end: " sin interrumpir el ritmo de lectura.",
    },
    unorderedList: [
        "Identificar el concepto que organiza la explicación.",
        "Comparar una alternativa breve con una solución más completa y explícita.",
        "Revisar que los ejemplos mantengan sus acentos, signos y palabras técnicas cuando se leen en varias líneas.",
    ],
    orderedList: [
        "Leer el párrafo completo antes de examinar la notación.",
        "Relacionar cada operador con la idea que representa en el texto.",
        "Volver a la conclusión y comprobar que la jerarquía visual siga siendo evidente.",
    ],
    navigation: ["Inicio", "Apuntes", "Lecciones", "Programa", "Tareas", "Anterior", "Siguiente", "En esta página"],
    metadata: [
        "Metadatos de la lección",
        "≈ 15 min",
        "Actualizado 2 sept 2026",
        "Historial de cambios",
        "María Ñanculef · revisión editorial",
    ],
    callout: {
        title: "Sugerencia",
        body:
            "Cuando una explicación incluye una decisión técnica, conviene mantenerla cerca de la prosa que la justifica. Así, una persona puede leer «A -> B» o «result != null» como parte del argumento sin que la ligadura desplace la atención del mensaje principal.",
    },
    technicalProse: [
        "En el ejemplo, A -> B describe el flujo principal y result != null indica que la respuesta existe. La condición x <= limit mantiene el límite explícito, mientras que input => output resume la transformación.",
        "La relación A <-> B también puede expresarse con <-, >=, == y ===; estos signos deben integrarse en la frase sin convertir un párrafo de lectura en un bloque monoespaciado.",
    ],
    spanishCoverage: proportionalFontContract.spanishCoverage.join(" "),
    technicalLigatures: proportionalFontContract.ligatures
        .filter(({ category }) => category === "technical")
        .map(({ source }) => source),
} as const;

export const bodyEvaluationViewportNames = ["desktop", "mobile"] as const;
