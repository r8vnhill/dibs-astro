export type LessonReading = Readonly<{
    referenceId: string;
    note?: string;
}>;

export type LessonReadings = Readonly<{
    lessonPath: string;
    readingsPath: string;
    title: string;
    recommended: readonly LessonReading[];
    additional: readonly LessonReading[];
}>;

export const libraryWhatIsReadings = {
    lessonPath: "/notes/software-libraries/what-is/",
    readingsPath: "/readings/software-libraries/what-is/",
    title: "La biblioteca como artefacto de software",
    recommended: [
        {
            referenceId: "parnas-decomposing-systems-1972",
            note:
                "La lectura fundacional para entender el ocultamiento de decisiones de diseño susceptibles de cambiar.",
        },
        {
            referenceId: "ousterhout-philosophy-software-design-2021",
            note:
                "Los capítulos 4 y 5 desarrollan la relación entre módulos profundos, dependencias y ocultamiento de información.",
        },
        {
            referenceId: "kotlin-library-authors-guidelines-introduction",
            note: "Conecta superficie, contrato y compatibilidad con la publicación de bibliotecas Kotlin.",
        },
        {
            referenceId: "kotlin-backward-compatibility-guidelines",
            note: "Introduce la compatibilidad que retomaremos al estudiar la evolución de APIs.",
        },
    ],
    additional: [
        {
            referenceId: "bloch-how-to-design-good-api-2006",
            note: "El capítulo sobre accesibilidad ayuda a evaluar qué elementos conviene exponer.",
        },
        {
            referenceId: "kotlin-evolution-principles",
            note: "Amplía las decisiones de evolución y compatibilidad del ecosistema Kotlin.",
        },
    ],
} satisfies LessonReadings;

export const publishedReadings = [libraryWhatIsReadings] as const;
