# Temario Propuesto para Diseño de Bibliotecas de Software

Este documento propone un temario completo, desde la unidad 1 hasta la unidad 7, con un enfoque agnóstico al lenguaje, al toolchain y al proyecto de referencia. El hilo conductor puede ser cualquier biblioteca reusable orientada al procesamiento, transformación o integración de datos, pero el temario no depende de una implementación, ecosistema o sistema de build específico.

La intención es que el curso siga siendo transferible aunque cambien el lenguaje principal, las herramientas de automatización, el mecanismo de publicación o el caso de estudio concreto.

## Unidad 1. Fundamentos de bibliotecas, automatización y scripting

**Foco:** introducir qué es una biblioteca de software, por qué se diseña como artefacto reusable y cómo la automatización y el scripting permiten construir flujos de trabajo predecibles.

**Tópicos principales:**

- bibliotecas de software como contratos de uso;
- reutilización, encapsulación y composición;
- automatización de tareas técnicas y operativas;
- propósito de un sistema de build;
- scripting como herramienta de integración;
- entrada, salida y manejo básico de errores;
- pipelines introductorios;
- scripts seguros, reproducibles y mantenibles.

**Resultados pedagógicos esperados:**

- el estudiantado distingue bibliotecas, aplicaciones, herramientas y paquetes;
- comprende por qué la automatización mejora calidad, repetibilidad y colaboración;
- reconoce el sistema de build como parte del ciclo de vida de una biblioteca y no solo como una herramienta de compilación;
- puede describir un pipeline simple como una secuencia de transformación de datos;
- reconoce el scripting como una base útil para preparar el terreno de bibliotecas más robustas.

----

## Unidad 2. Diseño del problema y límites del dominio

**Foco:** formalizar el problema desde una mirada DDD, identificando lenguaje, límites y decisiones de modelado antes de bajar a detalles de implementación.

**Tópicos principales:**

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
- organización inicial del proyecto y separación modular básica.

**Resultados pedagógicos esperados:**

- el estudiantado identifica reglas del dominio, coordinación de casos de uso y efectos externos sin mezclarlos;
- adquiere un vocabulario estable para hablar de entidades, capacidades e invariantes;
- puede modelar alternativas, estados válidos y restricciones del problema con tipos y contratos;
- entiende que varias decisiones de diseño son, antes que nada, decisiones de modelado del dominio.

## Unidad 3. Núcleo de la biblioteca y contratos del dominio

**Foco:** transformar el modelo del dominio en un núcleo coherente de contratos, servicios y límites arquitectónicos.

**Tópicos principales:**

- contratos del dominio;
- servicios de dominio;
- servicios de aplicación;
- puertos, repositorios y adaptadores;
- agregados o raíces de consistencia cuando el problema lo justifique;
- abstracciones núcleo del procesamiento;
- iterator pattern;
- functional core, imperative shell;
- diseño de una API mínima para el núcleo;
- modularización inicial del proyecto;
- tareas básicas de build, test y verificación;
- manejo inicial de dependencias y estructura del proyecto.

**Resultados pedagógicos esperados:**

- el estudiantado distingue con claridad dominio, aplicación e infraestructura;
- puede formular contratos estables para representar responsabilidades y transformaciones;
- entiende cómo proteger el núcleo del dominio frente a efectos y detalles externos;
- construye una primera arquitectura reusable sin depender todavía de mecanismos avanzados;
- entiende cómo el sistema de build ayuda a sostener la organización técnica del núcleo.

## Unidad 4. Composición y propiedades del diseño

**Foco:** enriquecer el núcleo con mecanismos de composición que preserven el modelo del dominio y hagan explícitas sus propiedades.

**Tópicos principales:**

- transformaciones del dominio;
- composición de operaciones;
- reglas de paso entre estados válidos;
- restricciones del modelo expresadas en tipos;
- tipos algebraicos como base de modelado y composición;
- abstracciones de composición funcional;
- propiedades y leyes de composición;
- diseño de combinadores y validación de invariantes.

**Resultados pedagógicos esperados:**

- el estudiantado entiende la composición como una herramienta de diseño, no solo de implementación;
- puede relacionar tipos, restricciones del modelo y combinaciones válidas;
- reconoce propiedades e invariantes que deben preservarse al componer operaciones;
- adquiere criterios más sólidos para evaluar correctitud y expresividad del diseño.

## Unidad 5. Diseño de APIs expresivas

**Foco:** diseñar interfaces públicas que comuniquen intención, restricciones y modos de uso de manera clara.

**Tópicos principales:**

- diseño de interfaces orientadas a claridad;
- DSLs internas o mecanismos equivalentes de expresividad;
- builders;
- funciones de extensión o mecanismos de composición similares;
- typeclasses o capacidades contextuales;
- restricciones declarativas sobre el uso de la API;
- escenarios de uso legibles y consistentes con el lenguaje del dominio.

**Resultados pedagógicos esperados:**

- el estudiantado diseña APIs que favorecen expresividad y mantenibilidad;
- comprende cómo una biblioteca guía a quienes la usan a través de su interfaz;
- reconoce cuándo conviene introducir mecanismos más expresivos y cuándo añaden complejidad innecesaria;
- puede alinear el lenguaje del dominio con la interfaz pública de la biblioteca.

## Unidad 6. Publicación, versionado y estabilidad de APIs

**Foco:** entender qué cambia cuando una biblioteca pasa a tener una interfaz pública, distribuible y consumida por otras personas o equipos.

**Tópicos principales:**

- publicación y distribución de artefactos;
- contratos públicos;
- versionado;
- estabilidad de APIs;
- compatibilidad hacia atrás;
- evolución controlada de interfaces;
- consumo de bibliotecas publicadas;
- empaquetado y resolución de dependencias;
- registries o mecanismos de distribución de artefactos;
- criterios de deprecación y ruptura de compatibilidad.

**Resultados pedagógicos esperados:**

- el estudiantado comprende que publicar una biblioteca obliga a pensar en compatibilidad, versionado y costo de ruptura;
- entiende la diferencia entre una interfaz interna y una API pública;
- puede discutir estabilidad y evolución de contratos sin depender de una herramienta concreta de publicación;
- reconoce la distribución como parte del diseño de la biblioteca, no solo como un paso operativo;
- comprende que el sistema de build también gestiona empaquetado, publicación y consumo.

## Unidad 7. Ejecución, extensibilidad y evolución del ecosistema

**Foco:** estudiar cómo la biblioteca ejecuta trabajo real, se integra con otros componentes y crece mediante mecanismos de extensión.

**Tópicos principales:**

- estrategias de evaluación y ejecución;
- separación entre núcleo puro y shell imperativo;
- integración con adaptadores o colaboraciones externas;
- metadata declarativa;
- reflexión o introspección;
- extensibilidad por módulos o plugins;
- sistemas de build como herramienta de evolución del diseño;
- modularización avanzada;
- convenciones compartidas y automatización avanzada;
- integración continua y validación automatizada;
- evolución del ecosistema a partir de contratos ya publicados.

**Resultados pedagógicos esperados:**

- el estudiantado distingue entre diseño abstracto, ejecución concreta e integración con el entorno;
- puede analizar costos y beneficios de distintos mecanismos de extensión;
- entiende cómo una biblioteca madura hacia un ecosistema reusable y sostenible;
- relaciona extensibilidad, modularización y evolución del proyecto sin quedar atada a un stack particular;
- comprende cómo el sistema de build acompaña la evolución del proyecto más allá del empaquetado inicial.

## Ejes transversales

### Testing como progresión de aseguramiento

El testing se introduce como una progresión que acompaña el crecimiento del diseño:

1. BDD para expresar comportamiento esperado y lenguaje del dominio.
2. DDT para reglas simples, contratos e invariantes tempranos.
3. mock testing para aislar colaboraciones y dependencias.
4. testing de integración para validar ensamblaje y consumo entre componentes.
5. smoke testing para verificar flujos representativos de punta a punta.
6. PBT para capturar propiedades y leyes de las abstracciones principales.
7. contract testing cuando existan puntos de extensión o integraciones externas.
8. mutation testing cuando ya exista una suite madura y sea útil evaluar su fortaleza real.

### Build systems y evolución del proyecto

Las herramientas de build y automatización se tratan como soporte de evolución del diseño:

1. estructura base y tareas mínimas del proyecto;
2. modularización cuando el crecimiento del dominio lo exija;
3. convenciones y calidad cuando aparezca fricción de mantenimiento;
4. empaquetado, publicación y distribución;
5. automatización más avanzada cuando la biblioteca ya deba circular como producto reusable.

## Criterios de diseño del temario

- El foco principal sigue siendo diseño e implementación de bibliotecas, no enseñanza de herramientas aisladas.
- Los conceptos se introducen cuando el problema los vuelve necesarios.
- El temario debe seguir siendo válido aunque cambien el lenguaje, el sistema de build o el mecanismo de publicación.
- El caso de estudio puede variar, siempre que permita discutir modelado del dominio, diseño de API, publicación y extensibilidad.
- La progresión esperada del curso es: fundamentos, modelado del dominio, núcleo y contratos, composición, diseño de API, publicación y estabilidad, ejecución y evolución.
