# Roadmap de la Unidad 1

## Summary (Versión Actualizada)

Este roadmap ha sido **regenerado** tras la reestructuración de 7 a 8 unidades del curso. Los cambios más significativos son:

1. **La Unidad 1 es ahora puramente conceptual**: introduce qué es una biblioteca, la distingue de otras artefactos, y sienta criterios de diseño de interfaces públicas.
2. **Scripting, automatización y build pasan a la Unidad 2**: esos tópicos forman un primer **caso de estudio concreto** de diseño reusable, no parte de la introducción conceptual.
3. **El horizonte pedagógico cambia**: la Unidad 1 ya no antecede modelado del dominio directamente; ahora antecede scripting como *laboratorio de API*.

### Conclusión principal

- La Unidad 1 actual **contiene material que pertenece a la Unidad 2** (scripting, automatización, build);
- los huecos reales están en **ergonomía de APIs, criterios de calidad y experiencia de consumo**;
- gran parte del material conceptual necesario **ya existe pero está huérfano** (e.g., design-principles);
- el trabajo futuro debe ser: (1) Re-indexar y reorganizar lo que existe, (2) Movilizar scripting a U2, (3) Llenar huecos específicos de conceptos puros.

La meta es que la Unidad 1 cubra de forma explícita todos sus tópicos conceptuales **sin mezclar implementación** antes de pasar a scripting como primer laboratorio en la Unidad 2.

---

## Roadmap

### Contexto: Inventario actual vs. pedagogía nueva

La Unidad 1 **actualmente** contiene:

| En course-structure.ts | Tipo | Destino en nueva estructura |
|---|---|---|
| Taxonomía de artefactos | ✓ Lección conceptual | **Mantener en U1** |
| La biblioteca como artefacto | ✓ Lección conceptual | **Mantener en U1** |
| Automatización de tareas | ⚠️ Introducción de tema | **Mover a U2** (profundidad) |
| **Scripting** (toda la sección) | ✗ Implementación/tooling | **Mover a U2** (integralmente) |
| **Build systems / Veritas** | ✗ Implementación/tooling | **Mover a U2 o después** |
| Lógica de negocio vs aplicación | ✗ Temprano para U1 | **Mover a U3** |
| Modelos de dominio | ✗ Temprano para U1 | **Mover a U3** |

| En disco pero NO indexado | Tipo | Acción |
|---|---|---|
| design-principles | ✓ Lección conceptual crítica | **Re-indexar e integrar en U1** |

### Tópicos pedagógicos de la nueva Unidad 1

Según [course-syllabus-draft.md](course-syllabus-draft.md), la Unidad 1 debe cubrir:

1. **Qué es una biblioteca de software y qué problema resuelve**
2. **Diferencia entre biblioteca, aplicación, herramienta, script, paquete y framework**
3. **Bibliotecas como contratos de uso para otras personas desarrolladoras**
4. **API pública, consumo, ergonomía y claridad**
5. **Reusabilidad, composición y estabilidad como propiedades deseables**
6. **Experiencia de uso de una interfaz pública**
7. **Criterios iniciales para juzgar la calidad de una biblioteca**

### Análisis de cobertura: qué falta y qué sobra

| Tópico | Cobertura actual | Status | Acción |
|---|---|---|---|
| T1: Qué es una biblioteca | ✓ `lib-what-is` | **CUBIERTO** | Revisar completitud |
| T2: Diferencias entre artefactos | ✓ `artifacts-taxonomy` | **CUBIERTO** | Revisar completitud |
| T3: Bibliotecas como contratos | ✓ `lib-what-is` | **CUBIERTO** | Revisar completitud |
| T4: Ergonomía y claridad de API | ⚠️ `design-principles` (huérfana) | **PARCIAL** | Re-indexar + completar |
| T5: Reusabilidad y composición | ✗ Disperso/ausente | **FALTA** | Crear nueva lección |
| T6: Experiencia de consumo | ⚠️ `design-principles` (huérfana) | **PARCIAL** | Re-indexar + expandir |
| T7: Criterios de calidad | ⚠️ En `design-principles` | **PARCIAL** | Re-indexar + sistematizar |
| ✗ Scripting (10+ lecciones) | ✓ Existe pero mal ubicada | **OFF-TOPIC** | **Mover a U2** |
| ✗ Build systems (Veritas) | ✓ Existe pero mal ubicada | **OFF-TOPIC** | **Mover a U2** |
| ✗ Lógica de negocio vs app | ✓ Existe pero temprano | **OFF-TOPIC** | **Mover a U3** |
| ✗ Modelos de dominio | ✓ Existe pero temprano | **OFF-TOPIC** | **Mover a U3** |

---

### Tareas concretas

#### 1. Re-indexar y reorganizar lecciones existentes

**Problema**: La lección `design-principles` existe pero es huérfana (no está en course-structure.ts).

**Acción**:
- Añadir `design-principles` como lección indexada en [course-structure.ts](../astro-website/src/data/course-structure.ts) en la Unidad 1
- Posicionarla después de las definiciones básicas (T1–T3) y antes de otros tópicos
- Revisar su contenido para asegurar que cubre ergonomía (T4), experiencia de consumo (T6) y criterios de calidad (T7)

**Ubicación recomendada en la secuencia**:
1. Taxonomía básica de artefactos → T2
2. La biblioteca como artefacto → T1, T3
3. **Principios de diseño de bibliotecas** → T4, T6, T7 (NUEVA POSICIÓN)
4. (Resto de lecciones conceptuales a crear)

#### 2. Crear lección: "Reusabilidad y Composición como Diseño"

**Problema**: T5 (reusabilidad, composición y estabilidad) no tiene una lección conceptual.

**Tema de la lección**:
- Qué significa "reusable";
- Una API reusable facilita composición y evita acoplamiento;
- Ejemplos conceptuales (sin código): por qué una interfaz "cerrada" vs "abierta" cambia la facilidad de composición;
- Criterios para reconocer si una API es reusable;
- Relación entre claridad de contrato y reusabilidad.

**Prerequisito**: Llenará el hueco entre "principios de diseño" y "que es una biblioteca bien diseñada".

#### 3. Migrar contenido a la Unidad 2

**Problema**: Scripting, build systems, task automation profunda no pertenecen a la Unidad 1 conceptual.

**Acción**:
- Crear la estructura de la Unidad 2 en course-structure.ts (aún no existe)
- ID sugerido: `unit-2` (o `unit-2-scripting` si se quiere preservar URLs)
- Mover todo el grupo `scripting` de U1 a U2
- Mover `build-systems` de U1 a U2
- Mover o refactorizar `task-automation`: dejar solo la introducción conceptual en U1 ("por qué automatizar"), llevar profundidad a U2

**Leciones que se mueven**:
```
U1 "scripting" (group, 10+ lessons) → U2
U1 "build-systems" (group, Veritas) → U2
```

#### 4. Migrar contenido a la Unidad 3

**Problema**: `business-vs-app` y `domain-models` son tópicos de modelado del dominio, no de introducción a bibliotecas.

**Acción**:
- Mover estas lecciones de U1 a U3 ("Modelado del dominio")
- En course-structure.ts, crear la estructura de U3 y ubicar estas lecciones allí

#### 5. Completar la página índice de la Unidad 1

**Problema**: La página `/notes/software-libraries/index.astro` contiene un `<ToDo>`.

**Acción**:
- Reemplazar el `<ToDo>` por una síntesis real que:
  - Presente el propósito de la Unidad 1 (distinguir bibliotecas, entender el diseño de interfaces públicas)
  - Mapee la progresión de lecciones
  - Destaque qué sabrá el estudiantado al terminarla
  - Señale la transición a la Unidad 2 (scripting como primer laboratorio)

---

## Orden Recomendado (Unidad 1 después de cambios)

El flujo esperado de la Unidad 1 será **PURAMENTE CONCEPTUAL**:

1. **Taxonomía básica de artefactos de software** (T2)
   - Conceptos claros: biblioteca, aplicación, herramienta, script, paquete, framework

2. **La biblioteca como artefacto de software** (T1, T3)
   - Qué es una biblioteca, cuál es su propósito, para quién se diseña

3. **Principios de diseño de bibliotecas** (T4, T6, T7)
   - Re-indexada desde `design-principles`
   - Ergonomía, experiencia de consumo, criterios de calidad

4. **Reusabilidad y composición como propiedades del diseño** (T5)
   - NUEVA lección conceptual
   - Por qué reusable, cómo la claridad habilita composición

5. **Página índice/cierre de la Unidad 1**
   - Síntesis de los conceptos
   - Transición a Unidad 2 (scripting como primer laboratorio)

---

## Acceptance Criteria (Actualizado)

- **Cada tópico T1–T7** de la pedagogía nueva debe quedar cubierto explícitamente en alguna lección de U1.
- **No hay implementación/tooling en U1**: build, scripting, PowerShell, etc., pertenecen a U2 o posterior.
- **Scripting y build-systems removidos** de U1 en course-structure.ts y movidos a U2.
- **business-vs-app y domain-models removidos** de U1 en course-structure.ts y ubicados en U3.
- **design-principles re-indexada** en course-structure.ts bajo U1.
- **Nueva lección "Reusabilidad y Composición"** creada y indexada en U1.
- **Página índice de U1** no contiene `<ToDo>` placeholder; presenta síntesis clara.
- La Unidad 1 se lee como **introducción conceptual a bibliotecas para otras personas desarrolladoras**, no como antesala de herramientas.

---

## Assumptions (Actualizado)

- Solo se consideran lecciones en `course-structure.ts` o archivos .astro que existen en curso-structure.ts o src/pages/notes/software-libraries/.
- **design-principles existe pero nunca fue indexada**: es un activo valioso que debe recuperarse.
- El cambio a 8 unidades separa claramente conceptual (U1) de implementación (U2–U8).
- El roadmap prioriza **coherencia pedagógica y separación de concerns** antes que cantidad de contenido.
- Los cambios a course-structure.ts requieren actualizar cualquier página que reference la estructura anterior.

----

Voy a revisar rápidamente patrones del repositorio para estructurar las 2-3 lecciones con el estilo del proyecto, y en paralelo consolidaré una propuesta que priorice sólo lo relevante a diseño de bibliotecas como APIs con trazabilidad de fuentes. Luego te muestro un plan concreto y editable.

Revisar patrones de lecciones

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes)

Searched for files matching `**/src/data/course-structure.ts`, 1 match

Searched for regex `References|<Book|<WebPage`, 15 results

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/software-libraries)

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/type-fundamentals)

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/course-structure.ts#1-1), lines 1 to 100

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/course-structure.ts#100-100), lines 100 to 300

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/scripting)

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/type-fundamentals/basics)

Searched for files matching `**/src/components/ui/references/*.astro`, 14 matches

Searched for text `ReferencesFromCatalog`, 20 results

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/scripting/first-script/index.astro#1-1), lines 1 to 150

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/scripting/first-script/index.astro#300-300), lines 300 to 400

Searched for files matching `**/src/data/bibliography-catalog.json src/data/bibliography-catalog.*`, no matches

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/components/ui/references/LessonReferencesFromCatalog.astro)

Searched for text `bibliography-catalog`, 20 results

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/components/ui/references/ReferencesFromCatalog.astro#1-1), lines 1 to 100

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data)

Searched for text `LessonReferencesFromCatalog`, 10 results

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/scripts/build-bibliography-catalog.mjs)

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/bibliography)

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/scripting/structured-output/py.astro#1-1), lines 1 to 150

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/bibliography/catalog.graph.ttl#1-1), lines 1 to 100

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/bibliography/software-libraries)

Searched for text `usage:scripting-structured-output`, no results

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/bibliography/catalog.graph.ttl#100-100), lines 100 to 600

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/bibliography/scripting)

Searched for text `dibs:usageOfReference`, no results

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/bibliography/scripting/pipeline-aware.bibliography.jsonld)

Searched for text `usage:`, 30 results

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/data/bibliography/catalog.graph.ttl#700-700), lines 700 to 900

Semantic workspace search is not currently available

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/scripting/first-script/index.astro#200-200), lines 200 to 700

Searched for files matching `**/src/lib/bibliography*`, no matches

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/lib)

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/lib/bibliography)

Read [](file:///e%3A/teaching/DIBS/projects/astro-website/src/pages/notes/scripting/first-script/index.astro)

Estoy extrayendo los hallazgos del subagente para aterrizar la propuesta en el formato real de tus lecciones y en su sistema de referencias. Enseguida te comparto un plan de tópicos con fuentes por bloque.

Read [](file:///b%3A/scoop/apps/vscode/1.113.0/data/user-data/User/workspaceStorage/427d48984ec60010684dd5d26e5008b9/GitHub.copilot-chat/chat-session-resources/6f225820-8f4c-45f0-9678-b927cc78802d/call_kxmeS26D8vwOOxiqdx2XGC55__vscode-1775442545221/content.txt)

Ya tengo el patrón real del repositorio y la forma correcta de mantener trazabilidad bibliográfica. Ahora voy a alinear dos decisiones de alcance (2 vs 3 lecciones y nivel de profundidad) para que el plan quede ejecutable sin suposiciones fuertes.

Analyzing your answers...

Perfecto, con esas respuestas voy a cerrar una propuesta de 2 lecciones con enfoque conceptual y referencias trazables por bloque temático. Después la persisto en memoria de sesión para que quede lista para handoff.

Read memory

Created memory file [](file:///b%3A/scoop/apps/vscode/1.113.0/data/user-data/User/workspaceStorage/427d48984ec60010684dd5d26e5008b9/GitHub.copilot-chat/memory-tool/memories/NmYyMjU4MjAtOGY0Yy00NWYwLTk2NzgtYjkyN2NjNzg4MDJk/plan.md)

## Plan: Serie de 2 lecciones sobre diseño de bibliotecas como API

Propongo una serie conceptual de 2 lecciones, centrada en decisiones de diseño (no en detalle de implementación), con trazabilidad explícita por tema hacia bibliografías originales. Ya dejé este plan persistido en memoria de sesión para handoff y refinamiento.

### 1. Lección 1
Título sugerido: Diseñar la API desde el dominio y las tareas de uso

Objetivo:
Que el estudiantado pueda decidir qué entra en la API pública de una biblioteca y por qué.

Tópicos clave:
1. Modelar el dominio antes que la implementación.
2. Encapsulación y ocultamiento de detalles internos.
3. Minimalidad útil: núcleo pequeño pero completo.
4. Usabilidad de la API: consistencia, descubribilidad y dificultad de mal uso.
5. Perspectiva de consumo: diseñar para objetivos de quien usa la API, no para estructura interna.
6. Claridad en nombres y funciones como soporte de diseño.

Trazabilidad de fuentes:
1. API Design for C++, Chapter 2.
2. The Design of Web APIs, Chapter 2.
3. Clean Code, Chapters 2 y 3.

### 2. Lección 2
Título sugerido: Evolucionar la API sin romper compatibilidad

Objetivo:
Que el estudiantado pueda proponer evolución compatible de una API de biblioteca y justificar decisiones de estabilidad.

Tópicos clave:
1. Ciclo de vida de API y tipos de compatibilidad.
2. Estrategias de cambio: agregar sin romper, deprecación y retiro.
3. Versionado y comunicación de cambios.
4. Cambios rompientes “invisibles” (contrato observable).
5. Documentación como parte del contrato público.
6. Testing de regresión como red de seguridad evolutiva.

Trazabilidad de fuentes:
1. API Design for C++, Chapter 10.
2. API Design for C++, Chapters 11 y 12.
3. The Design of Web APIs, Chapter 9.
4. The Design of Web APIs, Chapters 12 y 13.
5. Write the Docs.

## Matriz mínima de referencias (por bloque)
1. Diseño de dominio, encapsulación, minimalidad, usabilidad, acoplamiento:
API Design for C++, Chapter 2.
2. Evolución, compatibilidad, versionado, deprecación:
API Design for C++, Chapter 10.
3. Documentación y pruebas:
API Design for C++, Chapters 11 y 12.
4. Perspectiva consumidora y extensibilidad:
The Design of Web APIs, Chapters 2 y 9.
5. Apoyo transversal de claridad y documentación:
Clean Code; Write the Docs.

## Alcance aplicado a tu pedido
1. Incluido: solo lo relevante a diseño de bibliotecas como instancias de API.
2. Excluido: detalle operativo de APIs web (HTTP fino), tooling y contenido periférico no esencial.
3. Cumplido: no “citar” tus notas como fuente primaria; se referencia la bibliografía original por capítulo/tema.

## Referencias de estructura del repositorio usadas para alinear formato
1. design-relevant-work.md
2. course-structure.ts
3. catalog.graph.ttl
4. index.astro
5. py.astro

Si quieres, en la siguiente iteración te lo convierto a formato listo para clase por lección: objetivo, preguntas guía, secuencia de subtemas y referencias recommended/additional por sección.
