/**
 * @file Curated lesson reading guides. Each entry pairs a bibliography `referenceId` (resolved against the
 * shared catalog by `~/lib/readings/lesson-readings-contract`) with lesson-specific editorial guidance: what
 * to read, why, what to focus on, a guiding question, and — where known — `effort` evidence.
 *
 * None of these readings currently set `effort`, so their readings page renders "No disponible" for estimated
 * effort. When adding real evidence for a reading, set exactly the fields you actually know on `effort`
 * (`durationMinutes` for a video's own length, `pageCount` for the pages the recommended excerpt spans,
 * `wordCount` for an approximate word count of that excerpt) — not the whole cited work. Resolution picks the
 * highest-priority value automatically (video duration → page count → word count), so setting more than one
 * field is fine; see `~/lib/readings/reading-effort` for the exact priority order.
 */
import type { ConfiguredLessonReading, LessonReadingSectionHeadings } from "~/lib/readings/lesson-readings-contract";

export type LessonReading = ConfiguredLessonReading;

export type LessonReadings = Readonly<{
    lessonPath: string;
    title: string;
    essential: readonly LessonReading[];
    practice: readonly LessonReading[];
    deeper: readonly LessonReading[];
    sectionHeadings?: LessonReadingSectionHeadings;
}>;

export const taskGraphsReadings: LessonReadings = {
    lessonPath: "/notes/scripting/task-graphs/",
    title: "Dependencias y grafos de tareas",
    sectionHeadings: {
        essential: "Para acompañar la lección",
        practice: "Para conectar con sistemas de construcción",
        deeper: "Si quieres profundizar",
    },
    essential: [
        {
            referenceId: "introduction-to-algorithms-2022",
            role: "Base conceptual",
            difficulty: "Intermedia",
            whatToRead: "Capítulo 20, §§20.1 y 20.4.",
            why: "Presenta el vocabulario de grafos dirigidos y la relación entre DAGs y órdenes topológicos.",
            focus: "Cómo se representan los grafos dirigidos y por qué un DAG admite un orden topológico.",
            guidingQuestion:
                "¿Por qué la ausencia de ciclos permite ordenar los nodos respetando la dirección de las aristas?",
        },
    ],
    practice: [
        {
            referenceId: "build-systems-a-la-carte-2018",
            role: "Sistemas de construcción",
            difficulty: "Intermedia",
            whatToRead: "§4.1.1, “Topological”.",
            why: "Conecta el modelo de DAG de la lección con un planificador de un sistema de construcción.",
            focus: "Cómo el resultado solicitado determina un grafo acíclico de dependencias alcanzables y cómo ese"
                + " grafo puede ordenarse topológicamente.",
            guidingQuestion:
                "Si solicitamos un resultado concreto, ¿qué dependencias necesita considerar un planificador"
                + " topológico antes de ordenar el trabajo?",
        },
    ],
    deeper: [
        {
            referenceId: "mathematics-for-computer-science-2018",
            role: "Profundización",
            purpose: "Profundiza en órdenes parciales",
            difficulty: "Intermedia",
            whatToRead: "Capítulo 10, especialmente §§10.5–10.8.",
            why: "Conecta el scheduling de DAGs con órdenes parciales, elementos incomparables y linealizaciones.",
            focus: "Distingue las restricciones parciales de una secuencia lineal que las respeta.",
            guidingQuestion:
                "¿Qué diferencia hay entre que dos tareas no tengan una arista directa y que no exista un camino"
                + " entre ellas en ningún sentido?",
        },
        {
            referenceId: "build-scripts-perfect-dependencies-2020",
            role: "Profundización",
            purpose: "Profundiza en la corrección de las dependencias",
            difficulty: "Avanzada",
            whatToRead: "Las secciones sobre corrección de dependencias y trabajo innecesario.",
            why: "Profundiza en cómo dependencias incompletas o excesivas afectan la corrección y el paralelismo"
                + " de un build.",
            focus: "La relación entre dependencias declaradas, resultados correctos y trabajo innecesario.",
            guidingQuestion:
                "¿Qué puede salir mal si una dependencia real falta del grafo o si se agrega una que no existe?",
        },
    ],
};

export const selectedTaskGraphsReadings: LessonReadings = {
    lessonPath: "/notes/scripting/selected-task-graphs/",
    title: "Grafo seleccionado y Gradle",
    essential: [
        {
            referenceId: "gradle-build-lifecycle",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            whatToRead: "La documentación del ciclo de vida del build (Build Lifecycle), completa.",
            why: "Conecta el ciclo de vida de Gradle con la construcción del grafo de tareas antes de la ejecución.",
            focus: "Cómo Gradle configura el build, identifica las tareas y prepara la ejecución solicitada.",
            guidingQuestion: "¿En qué momento necesita Gradle conocer las tareas y sus dependencias?",
        },
        {
            referenceId: "gradle-command-line-interface",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            whatToRead: "La documentación de la interfaz de línea de comandos (Command-Line Interface), completa.",
            why: "Documenta la invocación de tareas desde la línea de comandos y las opciones para inspeccionar"
                + " un build.",
            focus: "Cómo se relaciona la tarea solicitada en la terminal con el subconjunto del grafo que se prepara.",
            guidingQuestion: "¿Qué evidencia aporta una inspección del grafo antes de ejecutar las tareas?",
        },
    ],
    practice: [
        {
            referenceId: "gradle-task-configuration-avoidance",
            type: "Referencia técnica",
            difficulty: "Intermedia",
            whatToRead: "Las secciones sobre `dependsOn` y la evitación de configuración de tareas.",
            why: "Explica cómo Gradle sigue las dependencias fuertes entre tareas al construir el conjunto de"
                + " trabajo requerido.",
            focus: "La relación entre `dependsOn`, el grafo de tareas y el recorrido transitivo de sus dependencias.",
            guidingQuestion: "¿Qué tareas debe considerar Gradle cuando una tarea depende de otra que, a su vez, tiene"
                + " dependencias?",
        },
    ],
    deeper: [
        {
            referenceId: "gradle-controlling-task-execution",
            type: "Referencia técnica",
            difficulty: "Intermedia",
            whatToRead:
                "Las secciones sobre control de la ejecución de tareas (`dependsOn` y selección de dependencias).",
            why: "Explica cómo las dependencias entre tareas controlan qué trabajo puede ejecutarse y en qué"
                + " condiciones.",
            focus: "La relación entre `dependsOn`, las tareas solicitadas y las dependencias que Gradle selecciona.",
            guidingQuestion: "¿Qué tareas selecciona Gradle cuando una tarea solicitada depende de otras?",
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
            whatToRead: "La introducción de la guía de autoría de bibliotecas de Kotlin, completa.",
            why: "Conecta la distinción entre implementación, API y contrato con decisiones reales al publicar"
                + " una biblioteca Kotlin.",
            focus: "Cómo relaciona el diseño de la API con usabilidad, mantenibilidad y evolución.",
            guidingQuestion:
                "¿Qué responsabilidades aparecen al pasar de escribir una aplicación a publicar una capacidad"
                + " para consumidores desconocidos?",
        },
        {
            referenceId: "parnas-decomposing-systems-1972",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            whatToRead: "El artículo completo (lectura corta).",
            why: "Presenta la formulación fundacional del ocultamiento de decisiones susceptibles de cambiar.",
            focus: "El criterio que usa Parnas para establecer una frontera modular, comparado con dividir por"
                + " etapas de procesamiento.",
            guidingQuestion:
                "¿Qué decisión de nuestra biblioteca ficticia esconderías detrás de la frontera y por qué?",
        },
        {
            referenceId: "ousterhout-philosophy-software-design-2021",
            type: "Conceptual",
            difficulty: "Intermedia",
            whatToRead: "Capítulos 4 y 5: “Modules Should Be Deep” e “Information Hiding (and Leakage)”.",
            why: "Los capítulos 4 y 5 ofrecen un puente moderno entre ocultamiento de información y diseño de"
                + " módulos.",
            focus: "Cómo se relaciona una interfaz pequeña con la complejidad que oculta detrás.",
            guidingQuestion: "¿Qué haría que `detectParasite` fuera una interfaz profunda en el sentido de Ousterhout?",
        },
        {
            referenceId: "software-engineering-google-hyrums-law",
            type: "Conceptual",
            difficulty: "Intermedia",
            whatToRead: "Los capítulos “Time and Change” y “Hyrum's Law”, incluyendo el ejemplo del orden de los"
                + " hashes.",
            why: "Muestra por qué el comportamiento observable puede convertirse en una dependencia aunque nunca"
                + " se prometa como API.",
            focus: "Qué hace que un comportamiento no documentado termine funcionando como una dependencia.",
            guidingQuestion: "¿Qué comportamiento de `detectParasite` podría empezar a utilizar alguien aunque nunca lo"
                + " documentemos?",
        },
    ],
    practice: [
        {
            referenceId: "kotlin-backward-compatibility-guidelines",
            type: "Aplicada",
            difficulty: "Intermedia",
            whatToRead: "Las secciones sobre compatibilidad de fuente y compatibilidad binaria.",
            why: "Distingue formas de compatibilidad que una biblioteca publicada puede necesitar preservar.",
            focus: "Por qué compatibilidad de fuente y compatibilidad binaria son propiedades diferentes.",
            guidingQuestion: "¿Puede un cambio preservar compatibilidad de fuente y aun así cambiar el comportamiento"
                + " esperado? Da un ejemplo.",
        },
        {
            referenceId: "bloch-how-to-design-good-api-2006",
            type: "Aplicada",
            difficulty: "Intermedia",
            whatToRead: "La charla completa (lectura corta).",
            why: "Presenta principios prácticos para diseñar APIs pequeñas, comprensibles y difíciles de usar"
                + " incorrectamente.",
            focus: "Los criterios concretos de diseño del autor para una API pequeña y difícil de usar"
                + " incorrectamente.",
            guidingQuestion:
                "¿Qué otro criterio, además de la corrección de la implementación, usarías para evaluar una"
                + " superficie de API?",
        },
    ],
    deeper: [
        {
            referenceId: "kotlin-evolution-principles",
            type: "Referencia técnica",
            difficulty: "Avanzada",
            whatToRead: "Las secciones sobre `@Deprecated` y `@RequiresOptIn`.",
            why: "Amplía las decisiones de evolución y compatibilidad del ecosistema Kotlin.",
            focus: "Cómo estos mecanismos comunican y gestionan cambios de una API publicada.",
            guidingQuestion:
                "¿Qué estrategia usarías para comunicar un cambio incompatible sin romper el código de quienes"
                + " ya usan la API?",
        },
        {
            referenceId: "nim-manual-effect-system",
            type: "Referencia técnica",
            difficulty: "Avanzada",
            whatToRead: "Las secciones sobre `raises` y `noSideEffect`.",
            why: "Permite comparar cuánto del contrato puede expresar directamente una declaración en distintos"
                + " lenguajes.",
            focus: "Qué parte del contrato queda expresada directamente en la declaración, sin leer la"
                + " implementación.",
            guidingQuestion: "¿Qué información contractual expresan `raises` y `noSideEffect` sin que necesites leer la"
                + " implementación?",
        },
        {
            referenceId: "java-language-specification-binary-compatibility",
            type: "Referencia técnica",
            difficulty: "Avanzada",
            whatToRead: "Capítulo 13 de la especificación del lenguaje Java.",
            why: "Ofrece una referencia formal para analizar compatibilidad binaria.",
            focus: "Qué cambios preservan la compatibilidad binaria según la especificación.",
            guidingQuestion:
                "¿Dónde buscarías una definición normativa si un cambio afecta a consumidores ya compilados?",
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
            whatToRead: "La documentación de pipelines de Nushell, completa (lectura media).",
            why: "Documenta la mecánica exacta que distingue esta lección: cómo se comportan los pipelines de"
                + " Nushell entre comandos internos, hacia procesos externos y entre procesos externos.",
            focus: "Compara qué circula por el pipeline cuando conectamos comandos internos y qué cambia al cruzar"
                + " la frontera hacia o desde un programa externo. Intenta reconocer dónde seguimos trabajando"
                + " con valores y dónde aparece una representación textual.",
            guidingQuestion:
                "Si observas dos etapas consecutivas de un pipeline, ¿cómo decidirías si la segunda recibe un"
                + " valor estructurado o texto?",
        },
        {
            referenceId: "nushell-loading-data",
            type: "Referencia técnica",
            difficulty: "Introductoria",
            whatToRead: "La documentación sobre carga de datos (`open` y los conversores `from ...`), completa.",
            why: "Detalla cómo `open` reconoce la extensión de un archivo e invoca el conversor `from ...`"
                + " correspondiente, la base del ejemplo con `album.json` de esta lección.",
            focus: "Sigue el ejemplo de `open` y observa qué cambia entre abrir un formato que Nushell reconoce y"
                + " trabajar con uno que no reconoce automáticamente. Relaciónalo con `album.json` de la"
                + " lección.",
            guidingQuestion:
                "¿Qué trabajo hace `open` por nosotros antes de que podamos usar comandos como `get`, `where`"
                + " o `select`?",
        },
    ],
    practice: [
        {
            referenceId: "greenberg-unix-shell-next-50-years-2021",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            whatToRead: "El artículo completo (lectura corta).",
            why: "Ubica la composición de comandos que motiva esta lección dentro de una tradición mucho más"
                + " antigua que Nushell: la composición universal y el procesamiento por streams del shell"
                + " Unix.",
            focus: "No leas el artículo pensando todavía en la sintaxis de Nushell. Identifica primero qué hace"
                + " atractiva la composición del shell Unix: programas pequeños pueden conectarse mediante una"
                + " interfaz común. Después pregúntate qué limitaciones aparecen cuando esa interfaz solo"
                + " transporta streams de bytes.",
            guidingQuestion:
                "¿Qué propiedad del shell Unix sigue siendo la misma en Nushell, y cuál cambia al reemplazar"
                + " bytes por valores estructurados?",
        },
        {
            referenceId: "sippel-process-composition-typed-unix-pipes-2023",
            type: "Fuente primaria",
            difficulty: "Intermedia",
            whatToRead: "El artículo completo (lectura corta).",
            why: "Explica por qué un flujo de bytes no comunica por sí mismo qué tipo o representación espera el"
                + " siguiente comando, motivando la necesidad de contratos de tipo en la composición de"
                + " pipelines.",
            focus: "Concéntrate en el problema: un stream de bytes no indica por sí mismo qué tipo de entrada"
                + " espera la siguiente etapa. Observa qué información adicional aparece cuando las etapas"
                + " declaran tipos de entrada y salida.",
            guidingQuestion:
                "¿Qué puede diagnosticar un pipeline tipado antes de ejecutarse que un pipeline de bytes no"
                + " puede?",
        },
        {
            referenceId: "nushell-v0-114-0-blog",
            type: "Referencia técnica",
            difficulty: "Intermedia",
            whatToRead: "Las secciones sobre `run` y sobre la inferencia y verificación de tipos en pipelines.",
            why: "Aporta contexto histórico sobre cómo Nushell ha hecho más explícitas y exigentes las"
                + " comprobaciones de tipos que observamos en la lección.",
            focus: "Qué cambió en la inferencia y verificación de tipos en pipelines; no es necesario revisar"
                + " todas las novedades de la versión.",
            guidingQuestion:
                "¿Qué comportamiento de la lección depende de las reglas modernas de tipos de pipeline y no"
                + " solo de la sintaxis de `|`?",
        },
    ],
    deeper: [
        {
            referenceId: "handa-order-aware-dataflow-pipelines-2021",
            type: "Fuente primaria",
            difficulty: "Avanzada",
            whatToRead: "Las secciones que describen el pipeline como composición de etapas (sin el modelo formal"
                + " completo ni los detalles de paralelización).",
            why: "Profundiza en un modelo de dataflow para pipelines Unix paralelos; relevante para el"
                + " tratamiento de pipelines como composición de etapas, aunque el orden de ejecución paralelo"
                + " excede el alcance de esta lección.",
            focus: "Qué propiedades deben conservarse cuando cambia la forma de ejecutar las etapas.",
            guidingQuestion:
                "¿Qué propiedades de una etapa necesitamos conocer para poder razonar sobre su composición con"
                + " otras etapas?",
        },
    ],
};

export const publishedReadings = [
    libraryWhatIsReadings,
    supportScriptsNushellReadings,
    taskGraphsReadings,
    selectedTaskGraphsReadings,
] as const;
