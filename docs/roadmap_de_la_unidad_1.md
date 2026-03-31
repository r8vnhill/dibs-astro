# Roadmap de la Unidad 1

## Summary

Este roadmap traduce los tópicos de la Unidad 1 a trabajo concreto sobre el material **actualmente indexado** en [course-structure.ts](/e:/teaching/DIBS/projects/astro-website/src/data/course-structure.ts). La conclusión principal es esta:

- la sección de scripting **no necesita crecer**;
- los huecos reales están en la capa conceptual que rodea a bibliotecas, APIs y build;
- el trabajo futuro debe enfocarse en completar esos huecos sin seguir expandiendo shell scripting.

La meta es que la Unidad 1 cubra de forma explícita todos sus tópicos fundacionales antes de pasar a modelado del dominio.

## Roadmap

### 1. Cerrar la taxonomía básica de artefactos de software

Abrir la unidad con una lección de taxonomía básica de artefactos, antes de entrar en
`Bibliotecas de software` y `Introducción a la automatización de tareas`.

**Tema de la lección**

- biblioteca;
- aplicación;
- paquete;
- herramienta;
- script.

**Problema que resuelve**

- hoy esos conceptos aparecen fragmentados;
- la unidad todavía no los compara en una sola superficie pedagógica;
- falta una respuesta clara a “qué tipo de artefacto estamos diseñando y para quién”.

**Resultado esperado**

- la unidad instala desde el comienzo una respuesta clara a “qué artefacto estamos diseñando y para
  quién”;
- el estudiantado puede distinguir qué se diseña para ser consumido como biblioteca;
- entiende cuándo un script es solo automatización local y cuándo una herramienta o paquete empiezan a requerir otro tipo de contrato;
- queda mejor preparado para leer el resto de la unidad como diseño de interfaces para otras personas desarrolladoras.

### 2. Hacer explícita la experiencia de uso de APIs

Agregar una lección nueva después de la lección anterior y antes de entrar en `Sistemas de construcción` o `Introducción a PowerShell`.

**Tema de la lección**

- ergonomía de API;
- claridad del contrato;
- discoverability;
- composición;
- defaults;
- errores útiles;
- costo cognitivo para quien consume la interfaz.

**Problema que resuelve**

- `Bibliotecas de software` instala bien la idea de API como contrato;
- pero la unidad todavía no convierte esa idea en criterios concretos de diseño de interfaz pública;
- el curso quiere formar criterio sobre APIs para otras personas desarrolladoras, y esa conversación todavía no tiene una lección propia en la Unidad 1.

**Resultado esperado**

- la unidad deja instalado desde temprano que una buena biblioteca no solo “funciona”, sino que también guía su uso;
- el resto del curso gana un vocabulario común para hablar de claridad, ergonomía y composición;
- se conecta mejor el foco de la unidad con el temario nuevo.

### 3. Completar el ciclo mínimo de trabajo de una biblioteca

Agregar una lección nueva después de `Sistemas de construcción` o después de `Veritas Ep. 1`.

**Tema de la lección**

- ciclo local mínimo de trabajo;
- build;
- prueba mínima;
- verificación observable;
- repetibilidad;
- criterio de éxito o fallo.

**Problema que resuelve**

- `Sistemas de construcción` explica bien qué hace un build system;
- `Veritas Ep. 1` muestra arranque de proyecto;
- pero la unidad todavía no enseña explícitamente qué significa sostener una biblioteca con un loop mínimo de trabajo.

**Resultado esperado**

- el estudiantado entiende qué debería poder ejecutar siempre sobre una biblioteca aunque el proyecto todavía sea pequeño;
- build, test y verificación dejan de ser promesa del temario y pasan a ser práctica visible;
- se prepara el terreno para unidades posteriores sin meter todavía testing avanzado.

### 4. Reubicar el material que ya no pertenece al corazón de la Unidad 1

Planificar la salida progresiva de estas lecciones del núcleo de la Unidad 1:

- `Lógica de negocio y lógica de aplicación`
- `Modelos de dominio`

**Problema que resuelve**

- ambas lecciones son valiosas, pero hoy ocupan espacio que el temario nuevo reserva para fundamentos de bibliotecas, APIs y build;
- además, encajan mejor con unidades posteriores del roadmap general del curso.

**Resultado esperado**

- la Unidad 1 queda más coherente con su propósito fundacional;
- el paso hacia modelado del dominio ocurre en el momento correcto del curso;
- disminuye la tensión entre `course-structure` y el temario propuesto.

### 5. Completar la página índice de la unidad

Reemplazar el `ToDo` en [software-libraries/index.astro](/e:/teaching/DIBS/projects/astro-website/src/pages/notes/software-libraries/index.astro) por una página real de apertura/cierre de unidad.

**Tema de la página**

- propósito de la Unidad 1;
- mapa de progresión;
- relación entre bibliotecas, automatización, scripting y build;
- qué criterios debería llevarse el estudiantado al terminar la unidad.

**Problema que resuelve**

- hoy la unidad no tiene una síntesis navegable que ayude a entender su forma;
- eso debilita la progresión incluso aunque las lecciones individuales sean buenas.

**Resultado esperado**

- la unidad gana cohesión narrativa;
- las nuevas lecciones intermedias se integran mejor;
- queda un punto de referencia claro para futuras reorganizaciones.

## Orden Recomendado

La secuencia futura de la Unidad 1 debería quedar así:

1. Taxonomía básica de artefactos de software
2. La biblioteca como artefacto de software
3. Ergonomía y experiencia de uso de APIs
4. Introducción a la automatización de tareas
5. Sistemas de construcción
6. Veritas Ep. 1
7. Ciclo mínimo de trabajo: build, test y verificación
8. Introducción a PowerShell
9. bloque actual de scripting
10. mover `Lógica de negocio y lógica de aplicación` y `Modelos de dominio` fuera de la unidad en una iteración posterior

## Acceptance Criteria

- Cada tópico declarado en la Unidad 1 debe quedar cubierto por al menos una lección explícita.
- La sección de scripting debe mantenerse estable, sin crecer para compensar huecos conceptuales ajenos.
- La Unidad 1 debe leerse como fundamentos de bibliotecas para otras personas desarrolladoras, no como antesala de modelado del dominio.
- `business-vs-app` y `domain-models` deben quedar identificadas como candidatas a reubicación.
- La página índice de la unidad debe dejar de estar vacía.

## Assumptions

- Solo se consideran lecciones indexadas en `course-structure.ts`.
- El material no indexado se trata como deprecado o desactualizado y no se usa para justificar cobertura actual.
- El roadmap prioriza coherencia pedagógica de la unidad antes que maximizar cantidad de contenido.
