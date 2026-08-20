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

export const taskGraphsReadings: LessonReadings = {
    lessonPath: "/notes/scripting/task-graphs/",
    title: "Grafos de tareas y sistemas de construcción",
    essential: [
        {
            referenceId: "gradle-build-lifecycle",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            extent: "Corta",
            why: "Conecta el ciclo de vida de Gradle con la construcción del grafo de tareas antes de la ejecución.",
            focus: "Observa cómo Gradle configura el build, identifica las tareas y prepara la ejecución solicitada.",
            afterReading: "Deberías poder ubicar el grafo de tareas dentro del ciclo de vida de un build de Gradle.",
            guidingQuestion: "¿En qué momento necesita Gradle conocer las tareas y sus dependencias?",
        },
        {
            referenceId: "gradle-controlling-task-execution",
            type: "Referencia técnica",
            difficulty: "Intermedia",
            extent: "Secciones seleccionadas",
            why: "Explica cómo las dependencias entre tareas controlan qué trabajo puede ejecutarse y en qué condiciones.",
            focus:
                "Busca la relación entre dependsOn, las tareas solicitadas y las dependencias que Gradle selecciona.",
            afterReading: "Deberías poder relacionar una arista del grafo con una dependencia declarada en Gradle.",
            guidingQuestion: "¿Qué tareas selecciona Gradle cuando una tarea solicitada depende de otras?",
        },
        {
            referenceId: "gradle-command-line-interface",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            extent: "Corta",
            why: "Documenta la invocación de tareas desde la línea de comandos y las opciones para inspeccionar un build.",
            focus: "Relaciona la tarea solicitada en la terminal con el subconjunto del grafo que se prepara.",
            afterReading:
                "Deberías poder distinguir el objetivo de una invocación de las tareas que ese objetivo requiere.",
            guidingQuestion: "¿Qué evidencia aporta una inspección del grafo antes de ejecutar las tareas?",
        },
    ],
    practice: [
        {
            referenceId: "build-systems-a-la-carte-2018",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            extent: "Secciones seleccionadas",
            why: "Compara distintas ideas de diseño de sistemas de construcción y amplía el modelo de tareas y dependencias.",
            focus: "Lee la introducción y observa qué capacidades puede combinar un sistema de construcción.",
            afterReading:
                "Deberías poder explicar por qué un sistema de construcción es más que una lista de comandos.",
            guidingQuestion: "¿Qué decisiones del diseño de un build quedan representadas en su grafo?",
        },
        {
            referenceId: "introduction-to-algorithms-2022",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            extent: "Secciones seleccionadas",
            why: "Presenta el vocabulario de grafos dirigidos y la relación entre DAGs y órdenes topológicos.",
            focus: "Lee el capítulo 20, §§20.1 y 20.4, y concéntrate en las definiciones y el resultado conceptual.",
            afterReading: "Deberías poder explicar por qué un DAG admite un orden que respeta sus dependencias.",
            guidingQuestion: "¿Qué propiedad del grafo permite ordenar sus nodos respetando las aristas dirigidas?",
        },
    ],
    deeper: [
        {
            referenceId: "build-scripts-perfect-dependencies-2020",
            type: "Fuente primaria",
            difficulty: "Avanzada",
            extent: "Secciones seleccionadas",
            why: "Profundiza en cómo dependencias incompletas o excesivas afectan la corrección y el paralelismo de un build.",
            focus:
                "Concéntrate en la relación entre dependencias declaradas, resultados correctos y trabajo innecesario.",
            afterReading:
                "Deberías poder identificar por qué el grafo debe representar las dependencias relevantes sin agregar restricciones arbitrarias.",
            guidingQuestion:
                "¿Qué puede salir mal si una dependencia real falta del grafo o si se agrega una que no existe?",
        },
    ],
};

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
            referenceId: "nushell-pipelines",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            extent: "Media",
            why: "Documenta la mecánica exacta que distingue esta lección: cómo se comportan los pipelines de Nushell entre comandos internos, hacia procesos externos y entre procesos externos.",
            focus:
                "Compara qué circula por el pipeline cuando conectamos comandos internos y qué cambia al cruzar la frontera hacia o desde un programa externo. Intenta reconocer dónde seguimos trabajando con valores y dónde aparece una representación textual.",
            afterReading:
                "Un pipeline de Nushell no transporta siempre la misma clase de información: entre comandos internos puede conservar valores estructurados y, al interactuar con procesos externos, aparecen fronteras de representación.",
            guidingQuestion:
                "Si observas dos etapas consecutivas de un pipeline, ¿cómo decidirías si la segunda recibe un valor estructurado o texto?",
        },
        {
            referenceId: "nushell-loading-data",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            extent: "Media",
            why: "Detalla cómo `open` reconoce la extensión de un archivo e invoca el conversor `from ...` correspondiente, la base del ejemplo con `album.json` de esta lección.",
            focus:
                "Sigue el ejemplo de `open` y observa qué cambia entre abrir un formato que Nushell reconoce y trabajar con uno que no reconoce automáticamente. Relaciónalo con `album.json` de la lección.",
            afterReading:
                "Al abrir un formato reconocido, Nushell puede integrar la decodificación al flujo normal del shell y entregar valores sobre los que podemos seguir aplicando transformaciones.",
            guidingQuestion:
                "¿Qué trabajo hace `open` por nosotros antes de que podamos usar comandos como `get`, `where` o `select`?",
        },
    ],
    practice: [
        {
            referenceId: "greenberg-unix-shell-next-50-years-2021",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            extent: "Corta",
            why: "Ubica la composición de comandos que motiva esta lección dentro de una tradición mucho más antigua que Nushell: la composición universal y el procesamiento por streams del shell Unix.",
            focus:
                "No leas el artículo pensando todavía en la sintaxis de Nushell. Identifica primero qué hace atractiva la composición del shell Unix: programas pequeños pueden conectarse mediante una interfaz común. Después pregúntate qué limitaciones aparecen cuando esa interfaz solo transporta streams de bytes.",
            afterReading:
                "Nushell conserva la idea de construir programas mayores componiendo etapas pequeñas, pero cambia qué información puede conservarse entre esas etapas.",
            guidingQuestion:
                "¿Qué propiedad del shell Unix sigue siendo la misma en Nushell, y cuál cambia al reemplazar bytes por valores estructurados?",
        },
        {
            referenceId: "sippel-process-composition-typed-unix-pipes-2023",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            extent: "Corta",
            why: "Explica por qué un flujo de bytes no comunica por sí mismo qué tipo o representación espera el siguiente comando, motivando la necesidad de contratos de tipo en la composición de pipelines.",
            focus:
                "Concéntrate en el problema: un stream de bytes no indica por sí mismo qué tipo de entrada espera la siguiente etapa. Observa qué información adicional aparece cuando las etapas declaran tipos de entrada y salida.",
            afterReading:
                "Hacer explícitos los contratos entre etapas permite detectar algunas composiciones incompatibles antes de intentar ejecutarlas.",
            guidingQuestion:
                "¿Qué puede diagnosticar un pipeline tipado antes de ejecutarse que un pipeline de bytes no puede?",
        },
        {
            referenceId: "nushell-v0-114-0-blog",
            type: "Referencia técnica",
            difficulty: "Intermedia",
            extent: "Media",
            why: "Aporta contexto histórico sobre cómo Nushell ha hecho más explícitas y exigentes las comprobaciones de tipos que observamos en la lección.",
            focus:
                "Lee únicamente las secciones relacionadas con `run` y con la inferencia y verificación de tipos en pipelines. El objetivo no es estudiar todas las novedades de la versión.",
            afterReading:
                "Parte del comportamiento de tipos que observamos en la lección también tiene una historia dentro de Nushell.",
            guidingQuestion:
                "¿Qué comportamiento de la lección depende de las reglas modernas de tipos de pipeline y no solo de la sintaxis de `|`?",
        },
    ],
    deeper: [
        {
            referenceId: "handa-order-aware-dataflow-pipelines-2021",
            type: "Fuente primaria",
            difficulty: "Avanzada",
            extent: "Secciones seleccionadas",
            why: "Profundiza en un modelo de dataflow para pipelines Unix paralelos; relevante para el tratamiento de pipelines como composición de etapas, aunque el orden de ejecución paralelo excede el alcance de esta lección.",
            focus:
                "No necesitas seguir el modelo formal completo ni los detalles de paralelización. Fíjate en cómo el artículo trata un pipeline como una composición de etapas y qué propiedades deben conservarse cuando cambia la forma de ejecutarlas.",
            afterReading:
                "Pensar en pipelines como una composición de transformaciones es útil más allá de una implementación concreta del shell o de si las etapas se ejecutan secuencialmente.",
            guidingQuestion:
                "¿Qué propiedades de una etapa necesitamos conocer para poder razonar sobre su composición con otras etapas?",
        },
    ],
};

export const publishedReadings = [libraryWhatIsReadings, supportScriptsNushellReadings, taskGraphsReadings] as const;
