# Serie de 3 lecciones para `api-design`: dejar documentación como tema propio

## Resumen

Reformular el bloque `api-design` como una serie de **tres** lecciones en vez de dos. La nueva decisión es separar **documentación** de la lección sobre evolución y compatibilidad, porque merece tratamiento propio como parte del contrato público de una biblioteca y no solo como apoyo secundario de versionado.

La progresión quedaría así:
1. `fundamentals`: diseñar la API desde el dominio
2. `evolution`: evolucionar la API sin romper compatibilidad
3. `documentation`: documentar la API como parte del producto

## Cambios de implementación

- **Secuencia del bloque `api-design`**
  - Mantener `fundamentals` como apertura del bloque.
  - Crear `evolution` como segunda lección, centrada en compatibilidad, cambios observables, deprecación y versionado.
  - Reservar una tercera lección nueva para documentación, en vez de cubrirla solo como subsección de `evolution`.

- **Lección 2: `evolution`**
  - Seguir con el enfoque conceptual + versioning.
  - Reducir el peso de documentación dentro de esta lección.
  - Mantener solo lo mínimo necesario:
    - la documentación comunica cambios y migraciones
    - los tests protegen regresiones del contrato público
  - Estructura recomendada:
    - publicación y ciclo de vida de la API
    - compatibilidad como contrato observable
    - estrategias para agregar sin romper
    - deprecación, reemplazo y retiro
    - versionado como comunicación de cambio
    - tests de regresión como red de seguridad

- **Lección 3: `documentation`**
  - Nueva lección conceptual dedicada a documentación de bibliotecas como parte del diseño de la API.
  - Objetivo: mostrar que la API no se consume solo desde tipos y firmas, sino también desde ejemplos, guías, referencias, mensajes de error y material de migración.
  - Estructura recomendada:
    - por qué la documentación también es parte del contrato público
    - audiencias y tipos de documentación: getting started, referencia, ejemplos, migración
    - principios de buena documentación técnica: claridad, cercanía al código, no duplicación innecesaria, actualidad
    - documentación para evolución: changelogs, notas de release, deprecaciones, guías de upgrade
    - ejemplos y tests como soporte de comprensión y confianza
  - Esta lección puede apoyarse mucho más en `Write the Docs` y complementar lo ya visto en diseño y evolución.

- **Fuentes y trazabilidad**
  - `fundamentals`: mantener las actuales.
  - `evolution`: priorizar Reddy Chapter 10 y guías de Kotlin sobre compatibilidad/evolución.
  - `documentation`: mover aquí el foco principal de `Write the Docs` y cualquier material sobre documentación como parte del producto.
  - Si faltan referencias específicas en el catálogo para la tercera lección, modelarlas ahí en lugar de dejar bibliografía inline no trazable.

- **Course structure y rutas**
  - El grupo `api-design` debe pasar a tener tres entradas ordenadas.
  - `coursePaths` necesita una ruta explícita para la futura lección de documentación, además de `apiDesignEvolution`.
  - La navegación prev/next de `fundamentals` debe apuntar a `evolution`, y la de `evolution` a `documentation`.

## API / interfaces / contrato editorial

- La API pública de navegación no cambia.
- Sí cambia la secuencia editorial del bloque `api-design`, que pasa a ser una mini serie de tres lecciones.
- Cada lección debe conservar el patrón actual del proyecto:
  - abstract breve
  - desarrollo por secciones conceptuales
  - conclusiones con cierre pedagógico
  - referencias desde catálogo

## Test Plan

- Verificar que `api-design` ahora renderiza tres lecciones en el orden correcto.
- Verificar prev/next:
  - `fundamentals -> evolution`
  - `evolution -> documentation`
- Añadir o actualizar la resolución bibliográfica de las nuevas lecciones.
- Ejecutar:
  - checks de navegación / course structure
  - checks de catálogo bibliográfico
  - `pnpm test:unit`
  - `pnpm test:astro` si se agregan tests de render

## Asunciones y defaults

- Documentación deja de ser un bloque fuerte dentro de `evolution` y pasa a ser **tema principal** de una tercera lección.
- `evolution` sigue siendo la siguiente lección a escribir primero.
- La tercera lección no necesita entrar en tooling de docs ni pipelines de publicación; el foco sigue siendo conceptual y orientado al diseño de bibliotecas.
- El bloque `api-design` queda entendido como:
  - diseño inicial del contrato
  - evolución compatible del contrato
  - documentación del contrato como parte del producto
