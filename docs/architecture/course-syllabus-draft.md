# Temario Propuesto para Diseño de Bibliotecas de Software

Este documento propone un temario completo, desde la unidad 1 hasta la unidad 7, con un enfoque
agnóstico al lenguaje, al toolchain y al proyecto de referencia. El hilo conductor no es enseñar
una biblioteca concreta ni una herramienta específica, sino estudiar cómo se diseñan bibliotecas y
APIs orientadas a otras personas desarrolladoras.

La pregunta conductora del curso pasa a ser:

**¿Cómo diseñar bibliotecas para otras personas desarrolladoras cuyas APIs representen bien el dominio, orienten el uso correcto y permitan crecer en expresividad sin perder claridad ni estabilidad?**

Desde esa perspectiva, el curso ya no se organiza principalmente como una progresión del lifecycle
de una biblioteca, sino como una exploración de decisiones de modelado, diseño del núcleo,
composición, abstracciones avanzadas y sus tradeoffs. La publicación, el versionado, la
extensibilidad y la evolución siguen siendo importantes, pero aparecen como consecuencia del diseño
de la interfaz pública y no como eje pedagógico inicial.

Esta versión del temario asume explícitamente un semestre con prioridades pedagógicas. No todos los
temas tendrán la misma profundidad: el núcleo del curso está en modelado del dominio, diseño del
núcleo de la biblioteca, composición y abstracciones avanzadas, mientras que otros temas quedan
reservados para cierre o profundización futura. A lo largo del semestre conviene que cada unidad
deje visible una decisión de diseño, un tradeoff o una forma de API sobre una misma biblioteca o
caso de estudio, para que el aprendizaje no se disperse en ejemplos aislados.

La intención es que el curso siga siendo transferible aunque cambien el lenguaje principal, las
herramientas de automatización, el mecanismo de publicación o el caso de estudio concreto.

## Unidad 1. Bibliotecas para otras personas desarrolladoras y APIs reusables

**Foco:** instalar el curso como un espacio de diseño de interfaces públicas para otras personas
desarrolladoras, mostrando qué distingue a una biblioteca reusable de una aplicación, herramienta o
script aislado.

**Tópicos principales:**

- bibliotecas de software como contratos de uso para otras personas desarrolladoras;
- diferencia entre biblioteca, aplicación, paquete, herramienta y script;
- reusabilidad, ergonomía y composición como propiedades de una buena API;
- experiencia de uso de una interfaz pública;
- automatización y scripting como contexto de integración;
- propósito de un sistema de build en el trabajo cotidiano sobre bibliotecas;
- build, test y verificación mínimos para sostener el trabajo del curso.

**Resultados pedagógicos esperados:**

- el estudiantado distingue bibliotecas, aplicaciones, herramientas, scripts y paquetes;
- comprende que una API pública está diseñada para otras personas desarrolladoras, no para
  usuarias finales;
- reconoce que claridad, composición y ergonomía son parte del diseño de una interfaz reusable;
- entiende que automatización, build y testing son soportes del diseño de bibliotecas, no fines en
  sí mismos;
- puede describir qué hace que una interfaz sea más fácil o más difícil de consumir.

----

## Unidad 2. Modelado del dominio y representación del problema

**Foco:** estudiar cómo las decisiones fundamentales de modelado del dominio habilitan o limitan
distintos estilos de API.

**Tópicos principales:**

- lenguaje ubicuo;
- lógica de negocio vs. lógica de aplicación;
- entidades y value objects;
- invariantes y reglas del dominio;
- estados válidos, alternativas y restricciones;
- tipos algebraicos;
- separación entre reglas, coordinación y efectos;
- delegación y composición de comportamiento cuando ayuden a clarificar el modelo.

**Resultados pedagógicos esperados:**

- el estudiantado identifica reglas del dominio, coordinación de casos de uso y efectos externos
  sin mezclarlos;
- adquiere un vocabulario estable para hablar de entidades, invariantes, estados y restricciones;
- puede comparar cómo cambia una futura API según se modele con identidad, valor, estados
  explícitos o transformaciones sobre datos;
- entiende que varias decisiones de diseño de interfaz son, antes que nada, decisiones de
  representación del problema;
- reconoce que el modelado del dominio condiciona la experiencia de uso de la biblioteca.

## Unidad 3. Núcleo de la biblioteca y contratos

**Foco:** transformar el modelado del dominio en una arquitectura mínima de biblioteca, con
contratos claros y límites explícitos entre responsabilidades.

**Tópicos principales:**

- contratos del dominio;
- servicios de dominio;
- servicios de aplicación;
- diseño de una API mínima para el núcleo;
- puertos, repositorios y adaptadores;
- separación entre dominio, aplicación e infraestructura;
- protección del núcleo frente a detalles de integración.

**Resultados pedagógicos esperados:**

- el estudiantado distingue con claridad núcleo, aplicación e infraestructura;
- puede formular contratos estables para representar operaciones y colaboraciones;
- entiende cómo proteger el dominio frente a efectos y detalles externos;
- reconoce que una buena API pública también depende de buenos límites internos;
- dispone de una base arquitectónica sobre la cual luego componer, hacer más expresiva y
  evolucionar la biblioteca.

## Unidad 4. APIs de composición

**Foco:** mostrar cómo se diseñan APIs componibles, es decir, interfaces que permiten encadenar
operaciones, preservar propiedades e incorporar reglas del dominio sin perder legibilidad.

**Tópicos principales:**

- pipelines;
- transformaciones del dominio;
- composición de operaciones;
- combinadores;
- iterator pattern cuando sea útil como API de recorrido o procesamiento;
- functional core, imperative shell;
- reglas de paso entre estados válidos;
- propiedades y leyes básicas de composición;
- validación de invariantes al combinar operaciones.

**Resultados pedagógicos esperados:**

- el estudiantado entiende la composición como una herramienta de diseño de APIs más expresivas y
  reutilizables;
- puede relacionar transformaciones, combinadores y restricciones del modelo con experiencia de uso
  de la interfaz;
- reconoce qué propiedades deben preservarse al componer operaciones;
- evalúa cómo cambia la claridad de una biblioteca cuando favorece composición frente a secuencias
  más rígidas;
- adquiere criterios para juzgar correctitud, expresividad y mantenibilidad en APIs componibles.

## Unidad 5. APIs expresivas y guiadas por uso

**Foco:** estudiar cómo se diseñan APIs más expresivas, guiadas por intención y apoyadas en
abstracciones avanzadas que ayuden a prevenir errores de uso y a comunicar mejor el dominio.

**Tópicos principales:**

- diseño de interfaces orientadas a claridad y expresividad;
- DSLs internas o mecanismos equivalentes de expresividad;
- builders;
- funciones de extensión o mecanismos similares para mejorar ergonomía;
- capacidades contextuales;
- typeclasses o mecanismos análogos cuando aporten una mejora real al diseño;
- restricciones declarativas sobre el uso de la API;
- escenarios de uso legibles y consistentes con el lenguaje del dominio;
- tradeoffs entre expresividad, complejidad y mantenibilidad.

**Resultados pedagógicos esperados:**

- el estudiantado comprende que las abstracciones avanzadas se justifican por problemas concretos de
  diseño de interfaz, no por sofisticación técnica;
- puede explicar qué gana quien consume una biblioteca cuando una API usa builders, DSLs,
  capacidades contextuales o mecanismos equivalentes;
- reconoce qué complejidad agrega cada estilo de abstracción y cuándo vale la pena introducirlo;
- diseña APIs que comuniquen intención, orienten el uso correcto y hagan visibles las restricciones
  relevantes;
- compara distintos mecanismos expresivos como decisiones de experiencia para otras personas
  desarrolladoras.

## Unidad 6. Contratos públicos, estabilidad y evolución

**Foco:** analizar qué implica publicar, estabilizar y evolucionar APIs para otras personas
desarrolladoras una vez que ya se han explorado distintos estilos de interfaz.

**Tópicos principales:**

- interfaz interna vs. API pública;
- contratos públicos;
- publicación y distribución de artefactos;
- versionado;
- estabilidad de APIs;
- compatibilidad hacia atrás;
- deprecación;
- evolución controlada de interfaces;
- consumo de bibliotecas publicadas;
- empaquetado, registries y resolución de dependencias.

**Resultados pedagógicos esperados:**

- el estudiantado comprende que publicar una biblioteca obliga a pensar en compatibilidad, costo de
  ruptura y evolución de contratos;
- entiende cómo cambian las decisiones de mantenimiento cuando una interfaz ya es consumida por
  otras personas desarrolladoras;
- puede discutir estabilidad y evolución de APIs sin quedar atada a un mecanismo particular de
  publicación;
- reconoce la distribución como parte del diseño de la biblioteca, no solo como un paso operativo;
- relaciona claridad del contrato, decisiones del núcleo y costo de evolución a lo largo del
  tiempo.

## Unidad 7. Extensibilidad, integración y ecosistema

**Foco:** cerrar el curso estudiando cómo una biblioteca pasa de una API estable a una pieza que se
integra con otras, admite extensión y participa en un ecosistema reusable.

**Tópicos principales:**

- integración con adaptadores o colaboraciones externas;
- extensibilidad por módulos o plugins;
- modularización avanzada cuando el crecimiento del proyecto lo requiera;
- convenciones compartidas y automatización avanzada;
- integración continua y validación automatizada;
- evolución del ecosistema a partir de contratos ya publicados.

**Resultados pedagógicos esperados:**

- el estudiantado distingue entre diseño abstracto de una API y su integración efectiva con el
  entorno;
- puede analizar costos y beneficios de distintos mecanismos de extensión para una API pública;
- entiende cómo una biblioteca madura hacia un ecosistema reusable y sostenible;
- relaciona extensibilidad, modularización y evolución del proyecto sin quedar atada a un stack
  particular;
- comprende cómo build, CI y automatización acompañan la evolución del diseño de la interfaz.

## Ejes transversales

### Testing como conversación con el tipo de API

El testing acompaña el crecimiento del diseño y se elige según el tipo de API y el tipo de contrato
que se quiere proteger:

1. BDD para expresar comportamiento esperado y lenguaje del dominio.
2. DDT para reglas simples, matrices de casos, contratos e invariantes tempranos.
3. mock testing para aislar colaboraciones, dependencias y efectos.
4. testing de integración para validar ensamblaje, consumo y coordinación entre componentes.
5. smoke testing para verificar flujos representativos de punta a punta.
6. PBT para capturar propiedades, leyes de composición e invariantes de abstracciones principales.
7. contract testing cuando existan puntos de extensión o integraciones externas.
8. mutation testing cuando ya exista una suite madura y sea útil evaluar su fortaleza real.

### Build systems y evolución del proyecto

Las herramientas de build y automatización se tratan como soporte del diseño de la API y de la
evolución técnica del proyecto:

1. estructura base y tareas mínimas para comenzar a trabajar con una biblioteca;
2. modularización cuando el crecimiento del dominio o de la API lo exija;
3. convenciones y calidad cuando aparezca fricción de mantenimiento;
4. empaquetado, publicación y distribución cuando la interfaz pública ya exista;
5. automatización más avanzada cuando la biblioteca deba sostener un ecosistema reusable.

## Posibles extensiones del temario

Los siguientes temas no forman parte del núcleo obligatorio de una primera versión semestral del
curso, pero conviene preservarlos como posibles integraciones futuras si el caso de estudio, el
tiempo disponible o la profundidad del proyecto los vuelven especialmente relevantes:

- comparaciones más amplias entre familias de APIs o entre estilos orientados a objetos, centrados
  en datos y funcionales;
- subdominios y bounded contexts cuando el problema requiera una delimitación más sofisticada;
- herencia múltiple cuando realmente sea útil para modelar capacidades o roles;
- reflexión o introspección cuando aporten valor real al diseño de la biblioteca;
- metadata declarativa cuando el caso de estudio la necesite como parte central de la API;
- estrategias de ejecución y evaluación cuando afecten de forma directa la experiencia de uso;
- separación entre núcleo puro y shell imperativo como profundización adicional cuando la biblioteca
  alcance suficiente complejidad.

## Criterios de diseño del temario

- El foco principal es diseño de bibliotecas y APIs para otras personas desarrolladoras, no
  enseñanza de herramientas aisladas.
- Los conceptos se introducen cuando el problema de diseño de interfaz los vuelve necesarios.
- El temario debe seguir siendo válido aunque cambien el lenguaje, el sistema de build o el
  mecanismo de publicación.
- El caso de estudio puede variar, siempre que permita discutir modelado del dominio, contratos del
  núcleo, expresividad, publicación y extensibilidad.
- Las abstracciones avanzadas deben enseñarse como herramientas para resolver problemas de diseño de
  interfaces, no como un catálogo de técnicas.
- El curso tiene un núcleo prioritario y una periferia opcional: no todos los temas requieren la
  misma profundidad en un semestre.
- Conviene que el recorrido del curso haga visibles decisiones de diseño, prototipos de API o
  tradeoffs sobre una misma biblioteca o caso de estudio, sin convertir esa continuidad en una
  estructura evaluativa rígida.
- La progresión esperada del curso es: fundamentos de bibliotecas para otras personas
  desarrolladoras, modelado del dominio, núcleo y contratos, composición, abstracciones avanzadas,
  estabilidad pública y evolución del ecosistema.
