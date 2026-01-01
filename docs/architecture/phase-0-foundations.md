# Fase 0 · Fundamentos para la separación por capas

## 1. Mapa del dominio actual

| Área                    | Elementos relevantes                                                                                 | Acoplamientos detectados                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contenidos y navegación | `src/data/course-structure.ts`, componentes en `src/components/navigation`, layouts en `src/layouts` | Mezcla de lógica de estructura con detalles de presentación (clases Tailwind, iconografía) y utilidades de normalización en el mismo módulo.                 |
| Contenido interactivo   | Islas React (`src/components/**.tsx`), hooks en `src/hooks`, utilidades de UI                        | Hooks y componentes combinan efectos del navegador con decisiones de negocio (p. ej. `use-media-query` define naming de breakpoints específico de diseño).   |
| Renderizado de código   | `src/lib/shiki/**`, componentes bajo `src/components/ui/code`                                        | Alta dependencia entre Shiki y componentes Astro: cada bloque conoce alias y clases de estilo, no existe capa intermedia que encapsule el formato de salida. |
| Tematización y estilo   | `src/styles`, `scripts/theme-toggle.ts`, `src/utils/theme.ts`                                        | Lógica de modo oscuro dispersa entre script global y utilidades, difícil de sustituir sin tocar múltiples capas.                                             |
| Configuración del sitio | `src/utils/site.ts`, cabeceras SEO en `src/components/meta`                                          | Definiciones de metadatos conviven con strings de contenido, sin una capa de dominio que represente entidades (curso, lección, autoría).                     |

### Oportunidades

- Definir entidades del dominio (Curso, Lección, Recurso externo) y normalizarlas antes de llegar a la capa de presentación.
- Extraer servicios de aplicación para navegación (resolución de "previous/next", chips por lenguaje) y para la generación de bloques de código.
- Centralizar adaptadores de infraestructura (Shiki, lectura de archivos Markdoc, registro de iconos) para reemplazos futuros.

## 2. Casos de uso prioritarios

1. **Resolver navegación de lecciones**: obtener previous/next normalizados, chips relevantes, estado de progreso. Piloto ideal para validar capas porque mezcla datos estáticos, reglas de negocio y UI.
2. **Renderizar bloques de código temáticos**: generar HTML semántico independiente de Shiki, permitiendo switches de motor o estilos. Implica coordinación entre dominio (tipo de bloque), aplicación (formateo) e infraestructura (Shiki).
3. **Gestionar modos de tema**: exponer API neutral (`ThemeService`) consumida por UI y scripts. Permite aislar almacenamiento (localStorage, preferencia de SO) en infraestructura.
4. **Publicar metadatos de página**: construir head tags a partir de objetos del dominio, evitando que layouts mezclen strings con lógica SEO.

Se usarán estos casos para medir progreso en Fase 1. Cada uno debe tener tests de aplicación que verifiquen reglas sin depender de Astro/Shiki.

## 3. Arquitectura objetivo (convenciones iniciales)

- **Capas**
  - `src/domain`: entidades, value objects, reglas puras (sin dependencias de Astro/DOM). Ejemplos: `Lesson`, `NavigationLink`, `CodeSample`.
  - `src/application`: casos de uso y servicios orquestadores. Dependen del dominio y de puertos definidos (interfaces) para infraestructura. Ejemplo: `generateLessonNavigation(lessonId, tree, settings)`.
  - `src/infrastructure`: implementaciones de puertos (ShikiHighlighter, NavigationRepository basado en archivos). Se agrupan por proveedor.
  - `src/presentation`: componentes Astro/React, layouts y hooks. Consumen servicios de aplicación a través de adaptadores ligeros.

- **Patrones**
  - Definir interfaces tipo `HighlighterGateway`, `LessonCatalog` en `src/application/ports`.
  - Usar inyección explícita en constructores o argumentos; evitar singletons salvo cachés encapsuladas en infraestructura.
  - Agrupar pruebas: `__tests__/domain`, `__tests__/application` con Vitest; mocks en `src/test-doubles`.

- **Módulos de migración**
  - Introducir adaptadores puente (`src/presentation/adapters`) para usar servicios nuevos sin reescribir toda la UI.
  - Mantener wrappers temporales alrededor de Shiki y datos hasta completar refactor.

## 4. Métricas y guardas

| Métrica                                  | Objetivo                                                                   | Herramienta/Verificación                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dependencias de capa                     | Ningún módulo en `presentation` importa desde `infrastructure` o viceversa | ESLint ruta personalizada o lint rule manual (`no-restricted-imports`) una vez que existan capas. |
| Cobertura de casos de uso                | ≥ 80% statements en `src/application`                                      | Integrar `vitest --coverage` filtrando carpeta de aplicación.                                     |
| Pruebas unitarias por entidad            | Cada entidad de dominio con al menos test que cubra reglas críticas        | Añadir checklist en PRs + `todo.md`.                                                              |
| Warnings en consola por carga de idiomas | 0 recurrentes tras mover Shiki a infraestructura                           | Monitorizar durante `pnpm build` y `pnpm preview`.                                                |
| Tiempo de build                          | Mantener dentro del baseline actual (registrar ahora)                      | Registrar `pnpm build --filter` y comparar tras cada fase.                                        |

### Guardas operativas

- Registrar estado inicial de métricas (build time, warnings) antes de Fase 1.
- Documentar nuevos puertos/adaptadores dentro de `docs/architecture/`.
- Cada PR de refactor debe incluir nota de compatibilidad con contenidos existentes.

## 5. Preguntas abiertas

- ¿Necesitamos compatibilidad con múltiples temas de Shiki por usuario o solo dos globales? Afecta el diseño del puerto de resaltado.
- ¿La navegación dependerá de progresos almacenados (localStorage/remote)? Determina la infraestructura necesaria.
- ¿El sitio planea internacionalización adicional? Definirlo condiciona entidades de dominio (slugs, títulos por idioma).
