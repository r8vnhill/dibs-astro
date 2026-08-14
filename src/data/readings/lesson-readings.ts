export type LessonReading = Readonly<{
    referenceId: string;
    type: "Conceptual" | "Aplicada" | "Fuente primaria" | "Referencia técnica";
    difficulty: "Introductoria" | "Intermedia" | "Avanzada";
    extent: "Corta" | "Media" | "Secciones seleccionadas";
    why: string;
    focus: string;
    afterReading: string;
    guidingQuestion?: string;
}>;

export type LessonReadings = Readonly<{
    lessonPath: string;
    title: string;
    essential: readonly LessonReading[];
    practice: readonly LessonReading[];
    deeper: readonly LessonReading[];
}>;

export const libraryWhatIsReadings = {
    lessonPath: "/notes/software-libraries/what-is/",
    title: "La biblioteca como artefacto de software",
    essential: [
        {
            referenceId: "kotlin-library-authors-guidelines-introduction",
            type: "Aplicada",
            difficulty: "Introductoria",
            extent: "Corta",
            why: "Conecta la distinción entre implementación, API y contrato con decisiones reales al publicar una biblioteca Kotlin.",
            focus: "Observa cómo relaciona el diseño de la API con usabilidad, mantenibilidad y evolución.",
            afterReading:
                "Deberías poder explicar por qué publicar una biblioteca exige pensar en quienes la consumirán.",
            guidingQuestion:
                "¿Qué responsabilidades aparecen al pasar de escribir una aplicación a publicar una capacidad para consumidores desconocidos?",
        },
        {
            referenceId: "parnas-decomposing-systems-1972",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            extent: "Corta",
            why: "Presenta la formulación fundacional del ocultamiento de decisiones susceptibles de cambiar.",
            focus:
                "Identifica el criterio que usa Parnas para establecer una frontera modular y compáralo con dividir por etapas de procesamiento.",
            afterReading:
                "Deberías poder justificar qué decisión de una biblioteca conviene esconder detrás de su frontera.",
            guidingQuestion:
                "¿Qué decisión de nuestra biblioteca ficticia esconderías detrás de la frontera y por qué?",
        },
        {
            referenceId: "ousterhout-philosophy-software-design-2021",
            type: "Conceptual",
            difficulty: "Intermedia",
            extent: "Secciones seleccionadas",
            why: "Los capítulos 4 y 5 ofrecen un puente moderno entre ocultamiento de información y diseño de módulos.",
            focus:
                "Lee “Modules Should Be Deep” e “Information Hiding (and Leakage)”. Relaciona interfaz pequeña con complejidad oculta.",
            afterReading:
                "Deberías poder distinguir una interfaz pequeña que oculta complejidad de una interfaz que solo desplaza esa complejidad.",
            guidingQuestion: "¿Qué haría que `detectParasite` fuera una interfaz profunda en el sentido de Ousterhout?",
        },
        {
            referenceId: "software-engineering-google-hyrums-law",
            type: "Conceptual",
            difficulty: "Intermedia",
            extent: "Secciones seleccionadas",
            why: "Muestra por qué el comportamiento observable puede convertirse en una dependencia aunque nunca se prometa como API.",
            focus: "Lee “Time and Change”, “Hyrum's Law” y el ejemplo del orden de los hashes.",
            afterReading: "Deberías poder anticipar qué observaciones de una biblioteca podrían limitar su evolución.",
            guidingQuestion:
                "¿Qué comportamiento de `detectParasite` podría empezar a utilizar alguien aunque nunca lo documentemos?",
        },
    ],
    practice: [
        {
            referenceId: "kotlin-backward-compatibility-guidelines",
            type: "Aplicada",
            difficulty: "Intermedia",
            extent: "Secciones seleccionadas",
            why: "Distingue formas de compatibilidad que una biblioteca publicada puede necesitar preservar.",
            focus:
                "Concéntrate en reconocer que compatibilidad de fuente y compatibilidad binaria son propiedades diferentes.",
            afterReading:
                "Deberías poder explicar por qué un cambio puede conservar una forma de compatibilidad y perder otra.",
            guidingQuestion:
                "¿Puede un cambio preservar compatibilidad de fuente y aun así cambiar el comportamiento esperado? Da un ejemplo.",
        },
        {
            referenceId: "bloch-how-to-design-good-api-2006",
            type: "Aplicada",
            difficulty: "Intermedia",
            extent: "Corta",
            why: "Presenta principios prácticos para diseñar APIs pequeñas, comprensibles y difíciles de usar incorrectamente.",
            focus: "Contrasta tus decisiones de superficie con los criterios concretos de diseño del autor.",
            afterReading:
                "Deberías poder evaluar una superficie de API con algo más que la corrección de su implementación.",
        },
    ],
    deeper: [
        {
            referenceId: "kotlin-evolution-principles",
            type: "Referencia técnica",
            difficulty: "Avanzada",
            extent: "Secciones seleccionadas",
            why: "Amplía las decisiones de evolución y compatibilidad del ecosistema Kotlin.",
            focus: "Busca mecanismos como `@Deprecated` y `@RequiresOptIn` y relaciónalos con una API publicada.",
            afterReading: "Deberías reconocer estrategias concretas para comunicar y gestionar cambios de una API.",
        },
        {
            referenceId: "nim-manual-effect-system",
            type: "Referencia técnica",
            difficulty: "Avanzada",
            extent: "Secciones seleccionadas",
            why: "Permite comparar cuánto del contrato puede expresar directamente una declaración en distintos lenguajes.",
            focus: "Concéntrate en `raises` y `noSideEffect`; no necesitas estudiar el sistema de efectos completo.",
            afterReading:
                "Deberías poder relacionar información contractual expresada en declaraciones con la superficie de una API.",
        },
        {
            referenceId: "java-language-specification-binary-compatibility",
            type: "Referencia técnica",
            difficulty: "Avanzada",
            extent: "Secciones seleccionadas",
            why: "Ofrece una referencia formal para analizar compatibilidad binaria.",
            focus: "Lee solo el capítulo 13 de la especificación del lenguaje Java.",
            afterReading:
                "Deberías poder buscar una definición normativa cuando una evolución afecta a consumidores compilados.",
        },
    ],
} satisfies LessonReadings;

export const publishedReadings = [libraryWhatIsReadings] as const;
