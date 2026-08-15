# ADR-001: Arquitectura de capas (Domain, Application, Infrastructure, Presentation)

**Status:** Accepted **Date:** 2026-02-28 **Deciders:** DIBS Team (Fase 1) **Refs:**
[phase-0-foundations.md](../phase-0-foundations.md), [layer-separation.md](../layer-separation.md)

## Context

El código actual mezcla lógica de negocio, orquestación de casos de uso, detalles de infraestructura e interfaz de
usuario en componentes únicos. Esto genera:

- Difícil testabilidad: no se pueden probar reglas de negocio sin dependencias de UI/infraestructura
- Acoplamiento fuerte: cambios en implementación de almacenamiento fuerzan refactoring de componentes
- Baja reusabilidad: servicios compartidos quedan aprisionados en componentes Astro/React

## Decision

Adoptar arquitectura stratified (limpia) con cuatro capas:

1. **Domain**: Lógica pura de negocio, entidades, value objects, servicios de dominio.
   - Sin dependencias externas (solo TypeScript puro).
   - Tests 100% unitarios y determinísticos.

2. **Application**: Servicios que orquestan casos de uso.
   - Depende de Domain (siempre) + Infrastructure via puertos (inversión de dependencias).
   - Implementa DTOs y mapeos entrada/salida.
   - Tests de integración (mock infra, dominio real).

3. **Infrastructure**: Implementaciones concretas de adaptadores y detalles técnicos.
   - Base de datos, APIs, filesystem, bibliotecas externas.
   - Implementa interfaces (puertos) definidas en Application.
   - Tests de integración/contract.

4. **Presentation**: UI (componentes Astro/React, controladores).
   - Depende de Application para ejecutar casos de uso.
   - Responsable solo de entrada/salida (no lógica compleja).
   - Tests E2E enfocados en flujos usuario.

## Rationale

### ¿Por qué capas?

- **Separación de intereses**: cada capa tiene una responsabilidad clara y delimitable.
- **Testabilidad**: lógica de negocio puede testearse sin UI ni bases de datos.
- **Reusabilidad**: Application y Domain pueden ser consumidos desde CLI, APIs, workers, etc.
- **Mantenibilidad**: cambios de infraestructura no affectan lógica de negocio.

### ¿Por qué inversión de dependencias (puertos)?

- Application define interfaces (`ILessonCatalog`, `INavigationService`) que Infrastructure implementa.
- Evita que Application conozca detalles de `courseStructure.ts` o APIs de Astro.
- Facilita testing: mock adapters sin cambiar Application.
- Permite múltiples implementaciones (p.ej. MongoDB en lugar de courseStructure).

### ¿Por qué alias de path?

- `$domain/*`, `$application/*`, `$infrastructure/*`, `$presentation/*` hacen explícito el flujo de dependencias.
- Linter puede validar: Application NO importa de Presentation, Presentation NO importa de Infrastructure directamente
  (solo via Application).

## Consequences

### Positivas

✅ Testabilidad: >90% de cobertura en Domain + Application con tests rápidos (jsdom <100ms). ✅ Independencia: navegar
entre Framework es trivial (Astro→Next, courseStructure→GraphQL, etc.). ✅ Reusabilidad: servicios de Application
usables desde CLI, cron jobs, webhooks.

### Negativas / Restricciones

⚠️ Verbosidad inicial: más archivos (puertos, adaptadores, DTOs). ⚠️ Curva de aprendizaje: requiere disciplina para
respetar dependencias y evitar corto-circuitos. ⚠️ Performance: en sitios pequeños (estáticos), la indirección via
puertos puede parecer excesiva (mitigado con inlining en build).

## Implementation in Fase 1

- ✅ Crear directorios base: `src/{domain,application,infrastructure,presentation}`.
- ✅ Definir puertos iniciales: `ILessonCatalog`, `INavigationService`.
- ✅ Implementar servicio de aplicación: `NavigationServiceImpl`.
- ✅ Implementar adaptador: `LessonCatalogAdapter`.
- ✅ Tests TDD: 5+ test cases, todos pasando.
- ⏳ Bridge pattern en Presentation: conectar `NotesLayout` gradualmente sin romper.

## Next Steps

1. **Fase 2** (próxima): Aislar lógica de dominio (Lesson entity, navigation rules).
2. **Fase 3**: Expandir Application con más servicios (ThemeService, SearchService).
3. **Fase 4**: Refactorear Presentation para consumir Application vía adaptadores.
4. **Fase 5**: Automatizar validación de dependencias en CI (eslint-plugin-arch-boundaries si aplica).

## Related

- [layer-separation.md](../layer-separation.md) — Plan maestro de separación por capas.
- [phase-0-foundations.md](../phase-0-foundations.md) — Análisis previo de acoplamiento.
- `vitest.config.ts` — Configuración para tests unitarios (jsdom).
- `vitest.astro.config.ts` — Configuración para tests de render Astro.

## Tags

`#architecture` `#layers` `#tdd` `#refactor` `#phase-1`
