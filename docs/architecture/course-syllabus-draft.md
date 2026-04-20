# Temario Propuesto para Diseño de Bibliotecas de Software

Este documento propone un temario completo, desde la unidad 1 hasta la unidad 9, con un enfoque
agnóstico al lenguaje, al toolchain y al proyecto de referencia. El hilo conductor no es enseñar
una biblioteca concreta ni una herramienta específica, sino estudiar cómo se diseñan bibliotecas y
APIs orientadas a otras personas desarrolladoras.

La pregunta conductora del curso pasa a ser:

**¿Cómo diseñar bibliotecas para otras personas desarrolladoras cuyas APIs representen bien el dominio, orienten el uso correcto y permitan crecer en expresividad, ergonomía o capacidades sin deformar el núcleo del modelo ni perder claridad ni estabilidad?**

Desde esa perspectiva, el curso ya no se organiza principalmente como una progresión del lifecycle
de una biblioteca, sino como una exploración de decisiones de modelado, diseño del núcleo,
composición, enriquecimiento del modelo, diseño de superficies expresivas y sus tradeoffs. La
publicación, el versionado, la extensibilidad y la evolución siguen siendo importantes, pero no
aparecen solo al final del recorrido. El curso introduce tempranamente estos problemas cuando
resultan necesarios para comprender qué implica diseñar una interfaz pública, y luego los retoma
con mayor profundidad en unidades posteriores.

Esta versión del temario asume explícitamente un semestre con prioridades pedagógicas. No todos los
temas tendrán la misma profundidad: el núcleo del curso está en modelado del dominio, diseño del
núcleo de la biblioteca, composición, enriquecimiento de tipos y diseño de APIs expresivas,
mientras que otros temas quedan reservados para cierre o profundización futura. A lo largo del
semestre conviene que cada unidad deje visible una decisión de diseño, un tradeoff o una forma de
API sobre una misma biblioteca o caso de estudio, para que el aprendizaje no se disperse en
ejemplos aislados.

La intención es que el curso siga siendo transferible aunque cambien el lenguaje principal, las
herramientas de automatización, el mecanismos de publicación o el caso de estudio concreto.

## Unidad 1. Introducción conceptual a las bibliotecas de software

**Foco:** introducir qué distingue a una biblioteca de software de otros artefactos del
ecosistema, situarla como interfaz pública y contrato de uso para otras personas desarrolladoras, e
instalar un primer vocabulario para pensar tanto el diseño inicial de una API como sus compromisos
tempranos de estabilidad y evolución.

**Tópicos principales:**

- artefacto de software como unidad de uso, distribución y diseño;
- distinción entre biblioteca, aplicación, script, herramienta, plugin y paquete;
- biblioteca como API y contrato público para integración programática;
- claridad, coherencia, encapsulación, minimalidad útil, usabilidad y perspectiva de quien consume;
- publicación, compatibilidad, deprecación y evolución inicial de APIs.

**Resultados pedagógicos esperados:**

- el estudiantado distingue artefactos de software y reconoce sus distintas relaciones de uso,
  extensión y distribución;
- comprende que una biblioteca no es solo una implementación reusable, sino una interfaz pública
  diseñada para ser integrada desde código;
- puede usar un vocabulario inicial para evaluar la calidad de una API en términos de claridad,
  coherencia, protección de invariantes y facilidad de uso;
- reconoce que publicar una API introduce compromisos de compatibilidad, mantenimiento y evolución
  responsable;
- puede explicar por qué el diseño de una biblioteca exige decisiones distintas a las de una
  aplicación de uso final o de otros artefactos técnicos.

----

## Unidad 2. Bibliotecas de scripting y automatización

**Foco:** estudiar las bibliotecas de scripting como un primer caso concreto de diseño reusable, mostrando cómo encapsulan automatización, integran herramientas, estructuran tareas repetibles y obligan a pensar en interfaces claras, composición y validación.

**Tópicos principales:**

- scripting como forma de construir software reusable de apoyo;
- diferencia entre script aislado y biblioteca de scripting;
- comandos, funciones, módulos y tareas como superficies de API;
- automatización de flujos técnicos y operativos;
- composición de comandos o tareas;
- validación de entradas, salida estructurada y manejo de errores;
- propósito de un sistema de build como soporte de automatización;
- build, test y verificación mínimos para sostener bibliotecas de scripting;
- bibliotecas de scripting como puente entre diseño de API e integración con herramientas.

**Resultados pedagógicos esperados:**

- el estudiantado distingue un script puntual de una biblioteca reusable de scripting;
- comprende que incluso en contextos de automatización existe diseño de interfaz pública;
- puede analizar comandos, funciones o módulos como contratos de uso;
- reconoce la importancia de validación, composición y predictibilidad en bibliotecas de scripting;
- entiende que build, testing y automatización no son fines en sí mismos, sino soportes para diseñar y sostener una biblioteca usable;
- dispone de un primer caso de estudio donde el problema de API aparece temprano y de forma concreta.

----

## Unidad 3. Modelado del dominio y representación del problema

**Foco:** estudiar cómo las decisiones fundamentales de modelado del dominio habilitan o limitan
distintos estilos de API.

La unidad avanza desde mecanismos que solo mejoran el nombre hacia mecanismos que restringen,
componen, representan alternativas, distinguen identidad y separan el dominio de sus
representaciones de frontera.

**Tópicos principales:**

- lenguaje ubicuo;
- lógica de negocio vs. lógica de aplicación;
- type aliases como nombres de dominio sin seguridad adicional;
- value objects e inline value classes como encapsulación de invariantes pequeñas;
- tipos producto como composición de valores significativos en conceptos de dominio;
- tipos suma y ADTs para representar alternativas, estados válidos y restricciones;
- entidades vs. value objects;
- invariantes y reglas del dominio;
- separación entre reglas, coordinación y efectos;
- DTOs como representaciones de frontera para transporte, persistencia, serialización o integración;
- delegación y composición de comportamiento cuando ayuden a clarificar el modelo.

**Resultados pedagógicos esperados:**

- el estudiantado identifica reglas del dominio, coordinación de casos de uso y efectos externos
  sin mezclarlos;
- adquiere un vocabulario estable para hablar de aliases, value objects, tipos producto, tipos
  suma, entidades, invariantes, estados y restricciones;
- distingue entre nombrar un valor, restringirlo, componerlo, representar sus alternativas y darle
  identidad propia;
- puede comparar cómo cambia una futura API según se modele con identidad, valor, estados
  explícitos o transformaciones sobre datos;
- entiende que un DTO no reemplaza al modelo de dominio, sino que cumple una función de frontera
  cuando la biblioteca debe integrarse, persistir, transportar o serializar datos;
- entiende que varias decisiones de diseño de interfaz son, antes que nada, decisiones de
  representación del problema;
- reconoce que el modelado del dominio condiciona la experiencia de uso de la biblioteca.

## Unidad 4. Núcleo de la biblioteca y contratos

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

## Unidad 5. APIs de composición

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

## Unidad 6. Enriquecimiento de tipos y capacidades

**Foco:** estudiar cómo agregar comportamiento, ergonomía o capacidades a una API sin sobrecargar
el núcleo del modelo ni mezclar responsabilidades que conviene mantener separadas.

**Tópicos principales:**

- enriquecimiento de tipos como problema de diseño de API;
- comportamiento intrínseco vs. comportamiento derivado o contextual;
- decorator pattern como extensión por composición;
- funciones de extensión o mecanismos equivalentes;
- capacidades contextuales o requisitos contextuales;
- typeclasses o mecanismos análogos de polimorfismo ad hoc;
- resolución de capacidades sin acoplar el dominio a detalles accesorios;
- tradeoffs entre descubribilidad, claridad, magia implícita y mantenibilidad.

**Resultados pedagógicos esperados:**

- el estudiantado distingue entre comportamiento que pertenece al núcleo del modelo y
  comportamiento que conviene agregar externamente;
- puede comparar decorator, extensiones, capacidades contextuales y mecanismos análogos como
  estrategias distintas de enriquecimiento;
- comprende cuándo una API gana claridad al mover capacidades fuera del tipo principal;
- reconoce los riesgos de ocultar dependencias o volver opaca la interfaz;
- diseña mecanismos de enriquecimiento que aumentan expresividad sin deteriorar el contrato público.

## Unidad 7. APIs expresivas y guiadas por uso

**Foco:** estudiar cómo se diseñan superficies de API más expresivas, legibles y guiadas por
intención, distinguiendo esa expresividad de alto nivel del enriquecimiento del núcleo del modelo.

**Tópicos principales:**

- diseño de interfaces orientadas a claridad y expresividad;
- DSLs internas o mecanismos equivalentes de expresividad;
- DSLs de aserción: matchers, constraints y fluent assertions como superficies expresivas de testing;
- builders;
- restricciones declarativas sobre el uso de la API;
- escenarios de uso legibles y consistentes con el lenguaje del dominio;
- diseño de superficies de uso orientadas a intención;
- tradeoffs entre expresividad, complejidad y mantenibilidad.

**Resultados pedagógicos esperados:**

- el estudiantado comprende que las abstracciones expresivas se justifican por problemas concretos
  de diseño de interfaz, no por sofisticación técnica;
- puede explicar qué gana quien consume una biblioteca cuando una API usa builders, DSLs o
  restricciones declarativas para hacer más legibles los escenarios de uso;
- reconoce las DSLs de aserción como un caso concreto de API expresiva orientada a intención,
  legibilidad y restricciones de uso en testing;
- reconoce qué complejidad agrega cada mecanismo expresivo y cuándo vale la pena introducirlo;
- diseña APIs que comuniquen intención, orienten el uso correcto y hagan visibles las restricciones
  relevantes;
- compara distintos mecanismos expresivos como decisiones de experiencia para otras personas
  desarrolladoras.

## Unidad 8. Contratos públicos, estabilidad y evolución

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

## Unidad 9. Extensibilidad, integración y ecosistema

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

En este eje también aparecen las DSLs de aserción como bibliotecas con diseño de interfaz propio,
donde matchers, constraints y fluent assertions permiten expresar intención, restricciones y nivel
de abstracción en los escenarios de prueba.

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
- Conviene distinguir entre enriquecer tipos o capacidades alrededor del modelo y diseñar
  superficies de API expresivas para escenarios de uso de alto nivel.
- El curso tiene un núcleo prioritario y una periferia opcional: no todos los temas requieren la
  misma profundidad en un semestre.
- Conviene que el recorrido del curso haga visibles decisiones de diseño, prototipos de API o
  tradeoffs sobre una misma biblioteca o caso de estudio, sin convertir esa continuidad en una
  estructura evaluativa rígida.
- La progresión esperada del curso es: introducción a bibliotecas de software y a sus primeras
  implicancias de contrato público y evolución, scripting y automatización, modelado del dominio,
  núcleo y contratos, composición, enriquecimiento de tipos y capacidades, APIs expresivas y
  guiadas por uso, y luego profundización en estabilidad pública, distribución y evolución del
  ecosistema.
