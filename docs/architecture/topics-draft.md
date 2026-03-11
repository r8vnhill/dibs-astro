Una biblioteca para **definir, transformar y ejecutar pipelines de procesamiento de datos**.

Este plan comienza **después del cierre efectivo de la unidad 1**. Para esta reorganización, se asume que la unidad 1 ya instaló una base en:

- bibliotecas de software;
- automatización de tareas;
- scripting;
- pipelines introductorios y laboratorios asociados.

En cambio, **no** se asumen como ya cubiertos los siguientes temas, aunque aparezcan en el árbol actual del curso:

- build systems introductorios;
- lógica de negocio vs. lógica de aplicación;
- modelos de dominio.

Esos contenidos pasan a formar parte explícita del plan que sigue. El caso de estudio mantiene **Kotlin + Gradle** como camino principal para mostrar cómo evoluciona una biblioteca real, con comparaciones puntuales a otros ecosistemas cuando ayuden a aclarar el diseño.

## Caso de estudio

El hilo conductor es una biblioteca para procesamiento de datos con una API de este estilo:

```kotlin
data
  .source(csv("users.csv"))
  .filter { it.age > 18 }
  .map { it.email }
  .distinct()
  .collect()
```

Este caso permite introducir abstracciones, tooling y testing cuando el diseño los vuelve necesarios, no como bloques aislados.

## Plan en unidades temáticas

### Unidad 2. Diseño del problema y límites del dominio

**Foco:** formalizar el problema de la biblioteca desde una mirada DDD, identificando lenguaje, límites y decisiones de modelado antes de bajar a detalles de implementación.

**Temas principales:**

- lenguaje ubicuo;
- subdominios y bounded contexts;
- lógica de negocio vs. lógica de aplicación;
- modelos de dominio;
- entidades y value objects;
- tipos algebraicos;
- herencia múltiple cuando ayude a modelar capacidades o roles;
- delegación como mecanismo de composición de comportamiento;
- invariantes y reglas del dominio;
- separación entre reglas, coordinación y efectos;
- introducción mínima a Gradle como soporte para organizar el proyecto;
- primeras nociones de separación modular entre núcleo y adaptadores.

**Resultados pedagógicos esperados:**

- el estudiantado identifica reglas de negocio, flujos de aplicación y efectos externos sin mezclarlos;
- el caso de estudio adquiere un lenguaje ubicuo estable para hablar de entidades, capacidades e invariantes;
- el modelado del dominio empieza a expresarse con tipos que hagan visibles alternativas, estados y combinaciones válidas;
- las relaciones entre capacidades, roles y comportamiento compartido pueden discutirse como decisiones de modelado, no solo de implementación;
- queda definido un núcleo conceptual y una estructura inicial de proyecto sobre los que luego se construyen API, ejecución y extensibilidad.

**Tooling y testing que entran naturalmente aquí:**

- Gradle en su versión mínima, no todavía como tema de automatización avanzada sino como soporte para hacer visible la separación del proyecto;
- BDD para formular comportamiento esperado, lenguaje del dominio y ejemplos ejecutables antes de bajar a tests más técnicos;
- primeros escenarios que distingan reglas del dominio, coordinación y efectos externos.

**Piezas del caso de estudio que conviene introducir aquí:**

- una primera versión del lenguaje del dominio para describir pipelines, etapas, fuentes y destinos;
- primeras decisiones sobre qué objetos pertenecen al dominio y cuáles son solo detalles de coordinación;
- ejemplos de tipos producto y tipos suma para modelar etapas, resultados o errores del dominio;
- ejemplos de composición por delegación y combinación de capacidades en el modelo;
- modelado de entradas, salidas y transformaciones con foco en significado, no en optimización.

### Unidad 3. Núcleo de la biblioteca y contratos de procesamiento

**Foco:** transformar el modelo del dominio en un núcleo coherente de contratos, servicios y límites arquitectónicos.

**Temas principales:**

- contratos del dominio;
- servicios de dominio;
- servicios de aplicación;
- puertos y repositorios;
- agregados o raíces de consistencia cuando el problema lo justifique;
- abstracciones núcleo del procesamiento;
- iterator pattern;
- functional core, imperative shell;
- diseño de API mínima para el núcleo.

**Resultados pedagógicos esperados:**

- la biblioteca ya cuenta con un núcleo funcional y un vocabulario más claro para separar dominio, aplicación e infraestructura;
- el estudiantado trabaja con contratos explícitos para representar responsabilidades, transformaciones y composición básica;
- el diseño expresa con claridad qué pertenece al dominio, qué coordina casos de uso y qué se delega a adaptadores;
- la distinción entre núcleo puro y shell imperativo deja de ser solo conceptual y se vuelve visible en la organización del proyecto.

**Tooling y testing que entran naturalmente aquí:**

- Gradle básico: wrapper, estructura del proyecto, primeros pasos hacia multi-módulo y tareas como `{sh} build`, `{sh} test` y `{sh} check`;
- DDT sobre invariantes, contratos pequeños y tablas de casos, construyendo sobre escenarios ya expresados con BDD.

### Unidad 4. Composición funcional y leyes de transformación

**Foco:** enriquecer el núcleo con mecanismos de composición que preserven el modelo del dominio y hagan explícitas sus propiedades.

**Temas principales:**

- transformaciones del dominio;
- composición de operaciones;
- reglas de paso entre estados válidos;
- restricciones del modelo expresadas en tipos;
- tipos algebraicos como base de modelado y composición;
- functors;
- monads;
- propiedades y leyes de composición.

**Resultados pedagógicos esperados:**

- el pipeline deja de ser solo una secuencia de pasos y se transforma en una abstracción reusable;
- el estudiantado conecta teoría de tipos con decisiones concretas de modelado y diseño de API;
- la relación entre tipos algebraicos, composición y restricciones del modelo se vuelve explícita;
- aparecen criterios más sólidos para evaluar correctitud más allá de ejemplos puntuales.

**Tooling y testing que entran naturalmente aquí:**

- modularización inicial en Gradle cuando el núcleo ya no cabe cómodamente en un solo módulo;
- PBT y law testing para identidad, composición, asociatividad y propiedades similares.

### Unidad 5. Diseño de APIs expresivas

**Foco:** mejorar la ergonomía de uso de la biblioteca y discutir cómo una API comunica intención, restricciones y fluidez.

**Temas principales:**

- diseño de interfaces orientadas a claridad;
- internal DSL;
- builders;
- funciones de extensión;
- typeclasses mediante context parameters;
- type-safe DSL;
- escenarios de uso legibles.

**Ejemplo de dirección deseada:**

```kotlin
pipeline {
    source(csv("users.csv"))
    filter { it.age > 18 }
    map { it.email }
}
```

```kotlin
fun Pipeline<User>.adultEmails(): Pipeline<String> =
    filter { it.age > 18 }.map { it.email }
```

```kotlin
context(Serializer<T>)
fun Pipeline<T>.toJson(): String
```

**Resultados pedagógicos esperados:**

- el estudiantado diseña interfaces que favorecen expresividad y mantenibilidad;
- el proyecto deja ver que una biblioteca no solo resuelve problemas, también guía a quienes la usan;
- las funciones de extensión permiten introducir composición orientada a ergonomía antes de llegar a abstracciones implícitas;
- los context parameters aparecen como una extensión natural de esa idea cuando hace falta inyectar capacidades de forma declarativa;
- el diseño del DSL se apoya en las abstracciones ya construidas, en vez de reemplazarlas.

**Tooling y testing que entran naturalmente aquí:**

- profundización de BDD para describir comportamiento y reglas del DSL en un lenguaje cercano al dominio;
- Gradle como soporte para ejemplos, convenciones comunes y tareas auxiliares de calidad.

### Unidad 6. Publicación, versionado y estabilidad de APIs

**Foco:** entender qué cambia cuando una biblioteca pasa a tener una interfaz pública, distribuible y consumida por otras personas o equipos.

**Temas principales:**

- publicación y distribución de artefactos;
- contratos públicos;
- versionado;
- estabilidad de APIs;
- compatibilidad hacia atrás;
- evolución controlada de interfaces.

**Resultados pedagógicos esperados:**

- el estudiantado comprende que publicar una biblioteca obliga a pensar en compatibilidad, versionado y costo de ruptura;
- la noción de API pública deja de ser solo de diseño y pasa a tener consecuencias de mantenimiento y distribución;
- el sistema de build se entiende como soporte para empaquetado, publicación y consumo.

**Tooling y testing que entran naturalmente aquí:**

- Gradle como soporte para empaquetado, publicación, consumo y automatización básica de entrega;
- smoke testing para verificar que los artefactos publicados siguen funcionando en escenarios representativos.

### Unidad 7. Ejecución, extensibilidad y evolución del ecosistema

**Foco:** estudiar cómo la biblioteca ejecuta trabajo real, se integra con otros componentes y crece mediante mecanismos de extensión.

**Temas principales:**

- estrategias eager, lazy y parallel;
- separación entre núcleo puro y shell imperativo;
- integración con adaptadores o colaboraciones externas;
- annotations;
- reflection;
- plugins;
- build systems como herramienta de evolución del diseño;
- modularización avanzada con Gradle;
- evolución del ecosistema a partir de contratos ya publicados.

**Ejemplos de extensibilidad que conviene usar aquí:**

```kotlin
class LoggingStage<T>(private val stage: Stage<T>) : Stage<T> by stage
```

```kotlin
@Pipeline
class EmailExtraction {
    @Stage
    fun filterAdults(u: User) = u.age > 18

    @Stage
    fun extractEmail(u: User) = u.email
}
```

**Resultados pedagógicos esperados:**

- la biblioteca adquiere un motor de ejecución explícito y una estrategia más clara para integrar efectos;
- el estudiantado distingue entre diseño abstracto, ejecución concreta y mecanismos de extensión;
- la biblioteca evoluciona desde una API publicada hacia un ecosistema extensible.

**Tooling y testing que entran naturalmente aquí:**

- mock testing para aislar motores, adaptadores y colaboraciones;
- testing de integración para validar wiring y comportamiento entre capas;
- contract testing para extensiones;
- mutation testing al cierre, cuando la suite ya sea suficientemente madura.

## Ejes transversales

### Gradle y build systems

Gradle aparece de manera incremental y siempre ligado a una necesidad visible del proyecto:

1. estructura base, wrapper y tareas estándar;
2. modularización cuando el crecimiento del dominio lo haga necesario;
3. convenciones y calidad cuando aparezca duplicación o fricción de mantenimiento;
4. automatización y distribución cuando existan varios módulos o integraciones;
5. publicación realista de artefactos cuando la biblioteca ya deba circular como producto reusable.

La idea no es enseñar Gradle como una lista de comandos, sino como una herramienta para sostener evolución, mantenimiento y distribución. En otros ecosistemas, esta conversación puede espejarse con CMake, MSBuild o Cargo sin cambiar el problema de fondo.

### Testing como progresión de aseguramiento

El testing también debe aparecer como progresión y no como inventario de técnicas:

1. BDD para expresar comportamiento esperado, lenguaje del dominio y ejemplos ejecutables desde temprano;
2. DDT para reglas simples, contratos e invariantes tempranos, tomando esos escenarios como base;
3. mock testing para aislar colaboraciones y dependencias;
4. testing de integración para validar ensamblaje, colaboración y consumo entre componentes;
5. smoke testing para verificar el flujo principal de punta a punta;
6. PBT para capturar propiedades y leyes de las abstracciones principales;
7. contract testing cuando existan puntos de extensión o integraciones externas;
8. mutation testing cuando ya exista una base madura y valga la pena discutir la fortaleza real de la suite.

La premisa es que no hace falta reintroducir unit testing desde cero: se toma como base previa, se organiza primero el comportamiento con BDD y, a partir de ahí, se amplía el repertorio cuando el diseño lo exige.

## Ventajas de este caso de estudio

- Es suficientemente realista para discutir diseño, integración y evolución.
- Permite introducir abstracciones de manera gradual.
- Permite conectar diseño de bibliotecas con APIs funcionales, DSLs y metaprogramación.
- Permite incorporar build systems y testing sin separarlos del trabajo real de construcción.
- Se parece a bibliotecas y marcos de trabajo conocidos como Java Streams, Kotlin Flow, Spark, Beam o Arrow.

## Criterios de diseño del plan

- Los conceptos se introducen cuando el diseño los vuelve necesarios.
- El foco principal sigue siendo diseño e implementación de bibliotecas, no enseñar tooling por separado.
- Build systems se tratan como soporte al crecimiento de la biblioteca, no como un bloque aislado de comandos.
- Testing aparece como respuesta a problemas concretos de correctitud, integración y mantenimiento.
- La progresión esperada del curso es: delimitación del problema, construcción del núcleo, composición, ergonomía de API, ejecución y extensibilidad.
