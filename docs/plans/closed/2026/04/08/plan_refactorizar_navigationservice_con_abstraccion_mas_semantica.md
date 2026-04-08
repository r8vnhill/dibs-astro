## Plan: Refactorizar NavigationService con abstracción más semántica

**TL;DR:** Mover la lógica de búsqueda de adyacentes al catálogo (dueño natural de esa responsabilidad), fortalecer normalización de rutas, simplificar el servicio, y agregar DDT + PBT mínimo para garantizar invariantes de ruta.

**Steps**

### Fase 1: Abstracción — Expandir ILessonCatalog
1. Agregar método `findAdjacentByHref(href: string)` a LessonCatalog.ts
   - Firma: `Promise<NavigationResult>` (devuelve directamente prev + next)
   - Responsabilidad: El catálogo normalizará rutas y hallará índice internamente
   - Beneficio: Oculta detalles de búsqueda; fácil cambiar indexación sin tocar el servicio

2. Implementar en LessonCatalogAdapter.ts
   - Reutiliza `flatten()` cacheado
   - Extrae normalización privada `private normalizePath(...)` en el adapter
   - Busca índice, retorna prev/next correctamente normalizados
   - *Dependency*: Necesita la versión mejorada de `normalizePath` (ver Fase 2)

### Fase 2: Defensa — Fortalecer normalizePath
3. Mejorar `normalizePath` en LessonCatalogAdapter.ts
   - Implementación:
     - Eliminar query params: `.split(/[?#]/, 1)[0]`
     - Colapsar slashes repetidos: `.replace(/\/{2,}/g, "/")`
     - Garantizar slash inicial y final
   - Esta versión será la fuente de verdad; `NavigationServiceImpl` la invocará si es necesario durante transición

### Fase 3: Simplificar — NavigationServiceImpl
4. Refactorizar NavigationServiceImpl.ts
   - Opción A (ligero): Cambiar `resolveAutoNav()` para usar `findAdjacentByHref()` en lugar de `flatten()`
   - Opción B (eliminar): Si solo delega, quizá sea redundante; pero mantenerlo por ahora como adaptador mínimo para la interfaz
   - En cualquier caso: `readonly lessonCatalog`, eliminar helpers de duplicación, validar que pase a través limpiamente

5. Actualizar navigation-bridge.ts si es necesario
   - Confirmar que la composición sigue funcionando (sin cambios esperados si `INavigationService` no cambia)

### Fase 4: Testing — DDT + PBT
6. **Actualizar NavigationServiceImpl.test.ts**
   - Casos DDT existentes: mantener + validar que sigan pasando
   - Agregar 3-4 casos de borde: query params, hash fragment, múltiples slashes, root paths
   - Fixture: mock `ILessonCatalog` con método `findAdjacentByHref()` simulado

7. **Agregar PBT para normalizePath en LessonCatalogAdapter.test.ts**
   - Invariante 1: Idempotencia — `normalize(normalize(x)) === normalize(x)`
   - Invariante 2: Equivalencia trivial — `normalize(x) === normalize(x + "?q=1")` (query stripped)
   - Invariante 3: Slash canonización — `normalize(x) === normalize(x + "#hash")` (hash stripped)
   - Generadores `fast-check`: `fc.string()` con sufijos/prefijos aleatorios
   - *Parallel with step 6* — Ambos tests pueden escribirse simultáneamente

8. **Agregar DDT a LessonCatalogAdapter para findAdjacentByHref**
   - Casos tabulares: first lesson, middle, last, not found, query/hash variants
   - Primera lección: solo `next`, sin `previous`
   - Última lección: solo `previous`, sin `next`
   - Lección intermedia: ambos
   - Ruta no encontrada: `{}`

**Relevant files**
- LessonCatalog.ts — Firma de `findAdjacentByHref()`
- LessonCatalogAdapter.ts — Implementación de normalizePath mejorada + método nuevo
- NavigationServiceImpl.ts — Simplificación a delegación o eliminación
- NavigationServiceImpl.test.ts — Tests actualizados
- LessonCatalogAdapter.test.ts — Tests nuevos PBT + DDT

**Verification**
1. **Compilación**: `pnpm run type-check` — sin errores TS
2. **Tests unit**: `pnpm test:unit` — NavigationServiceImpl + LessonCatalogAdapter tests cumplen (sin regresiones)
3. **Tests PBT**: `pnpm test:unit` — Invariantes de normalizePath convergen en <50ms (fast-check default)
4. **Manual**: Navegar en `localhost:3000/notes/...` → verificar prev/next correctos incluso con rutas malformadas
5. **Build**: `pnpm build` — sin advertencias del linter o tipo-check

**Decisions**
- **Movemos búsqueda al catálogo**: Más semánticamente correcto; catálogo es el dueño de la estructura. Reduce acoplamiento.
- **Mantenemos `NavigationServiceImpl`** (por ahora): Es ligero y cumple contrato de puerto. Eliminar sería futuro refactor.
- **Normalizadora duplicada durante transición**: Dos copias temporales (una en adapter, posible otra en servicio). Se consolida en adapter como fuente de verdad.
- **Fast-check es gratis**: Ya en package.json, y patrones PBT existen en codebase. Bajo costo, alto valor.
- **Scope excluido**: No toquemos `navigation-bridge` (presentación), no refactorizamos el flujo de Astro Layout, no optimizamos más allá de lo semántico.

**Further Considerations**
1. **¿Qué pasa con `flatten()` después?** Es reutilizable para otros uses (catálogo completo, búsquedas globales). Dejarlo como está; `findAdjacentByHref()` es un método complementario.
2. **¿Cacheamos `findAdjacentByHref()` en el adapter?** No es necesario (se llama 1× por página, caché de `flatten()` reutilizado). Mantén simple.
3. **¿Migramos tests a Node/Astro suite?** Los tests de servicio son unit/jsdom (sin DOM). Dejan donde están. Solo `LessonCatalogAdapter` podría ir a Astro suite si se expande, pero por ahora jsdom es suficiente.
