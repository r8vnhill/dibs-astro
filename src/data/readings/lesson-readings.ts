import type { ReadingDifficulty, ReadingExtent, ReadingType } from "~/lib/readings/lesson-readings-contract";

export type LessonReading = Readonly<{
    referenceId: string;
    type: ReadingType;
    difficulty: ReadingDifficulty;
    extent: ReadingExtent;
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

export const libraryWhatIsReadings: LessonReadings = {
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
};

export const supportScriptsNushellReadings: LessonReadings = {
    lessonPath: "/notes/scripting/support-scripts/nushell/",
    title: "Scripts de apoyo reusables en Nushell",
    essential: [
        {
            referenceId: "greenberg-unix-shell-next-50-years-2021",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            extent: "Corta",
            why:
                "Ubica la composición de comandos que motiva esta lección dentro de una tradición mucho más antigua que Nushell: la composición universal y el procesamiento por streams del shell Unix.",
            focus:
                "Identifica qué propiedades del shell Unix sobreviven en Nushell y cuáles cambian cuando el pipeline interno pasa a transportar valores en lugar de bytes.",
            afterReading:
                "Deberías poder explicar por qué Nushell extiende el modelo de composición de Unix en lugar de inventarlo.",
            guidingQuestion:
                "¿Qué propiedad del shell Unix sigue siendo la misma en Nushell, y cuál cambia al reemplazar bytes por valores estructurados?",
        },
        {
            referenceId: "sippel-process-composition-typed-unix-pipes-2023",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            extent: "Corta",
            why:
                "Explica por qué un flujo de bytes no comunica por sí mismo qué tipo o representación espera el siguiente comando, motivando la necesidad de contratos de tipo en la composición de pipelines.",
            focus:
                "Concéntrate en la distinción entre un pipe que solo transporta bytes y uno cuyas etapas exponen información de tipo de entrada y salida.",
            afterReading:
                "Deberías poder justificar por qué exponer tipos de entrada y salida entre etapas de un pipeline es una mejora sobre el contrato de stdin/stdout.",
            guidingQuestion:
                "¿Qué puede diagnosticar un pipeline tipado antes de ejecutarse que un pipeline de bytes no puede?",
        },
        {
            referenceId: "nushell-pipelines",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            extent: "Media",
            why:
                "Documenta la mecánica exacta que distingue esta lección: cómo se comportan los pipelines de Nushell entre comandos internos, hacia procesos externos y entre procesos externos.",
            focus:
                "Lee la sección que distingue interno→interno, interno→externo, externo→interno y externo→externo.",
            afterReading:
                "Deberías poder predecir si una etapa concreta de un pipeline de Nushell recibirá un valor estructurado o texto.",
        },
    ],
    practice: [
        {
            referenceId: "nushell-loading-data",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            extent: "Media",
            why:
                "Detalla cómo `open` reconoce la extensión de un archivo e invoca el conversor `from ...` correspondiente, la base del ejemplo con `album.json` de esta lección.",
            focus: "Revisa qué formatos reconoce `open` de forma nativa y qué ocurre con formatos no reconocidos.",
            afterReading:
                "Deberías poder explicar la diferencia entre un formato que Nushell reconoce automáticamente y uno que requiere análisis manual.",
        },
        {
            referenceId: "nushell-v0-114-0-blog",
            type: "Referencia técnica",
            difficulty: "Intermedia",
            extent: "Media",
            why:
                "Es la fuente primaria sobre `run` y sobre el fortalecimiento de la inferencia y verificación de tipos en pipelines a partir de la versión 0.114.",
            focus: "Busca las secciones sobre `run` y sobre inferencia y verificación de tipos de pipeline.",
            afterReading:
                "Deberías poder situar en qué versión concreta de Nushell dejaron de ser opcionales las verificaciones de tipo usadas en esta lección.",
        },
    ],
    deeper: [
        {
            referenceId: "handa-order-aware-dataflow-pipelines-2021",
            type: "Fuente primaria",
            difficulty: "Avanzada",
            extent: "Secciones seleccionadas",
            why:
                "Profundiza en un modelo de dataflow para pipelines Unix paralelos; relevante para el tratamiento de pipelines como composición de etapas, aunque el orden de ejecución paralelo excede el alcance de esta lección.",
            focus: "No necesitas seguir el modelo de paralelismo completo; concéntrate en cómo describen una etapa de pipeline como una unidad de composición.",
            afterReading:
                "Deberías poder relacionar una etapa de pipeline con una unidad de composición, más allá de si su ejecución es secuencial o paralela.",
        },
        {
            referenceId: "sorva-notional-machines-2013",
            type: "Conceptual",
            difficulty: "Intermedia",
            extent: "Secciones seleccionadas",
            why:
                "Argumenta por qué explicitar el modelo de ejecución (una \"máquina nocional\") ayuda a quien aprende a razonar sobre la dinámica de un sistema, justificando los diagramas de esta lección.",
            focus:
                "Lee por qué los modelos mentales de la dinámica de ejecución son una fuente frecuente de dificultad para quienes aprenden a programar.",
            afterReading:
                "Deberías poder explicar por qué esta lección presenta un modelo explícito del pipeline antes de mostrar sintaxis.",
        },
    ],
};

export const publishedReadings = [libraryWhatIsReadings, supportScriptsNushellReadings] as const;
