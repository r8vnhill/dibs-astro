# Refactor TDD para `createShikiHighlighter`

## Resumen

Refactorizar `config/patches/shiki/createShikiHighlighter.ts` para que sea la única dueña del lifecycle del highlighter parcheado: normaliza config, cachea por config efectiva, expone `dispose`, elimina `any` relevantes y alinea el fallback con `text`.
El plan asume que la memoización actual en `config/shiki-warn-tracker.ts` debe reducirse o retirarse para evitar dos capas de caching sobre la misma factory. La supresión de warnings `[Shiki]` se mantiene.

## Cambios clave

- Introducir una normalización explícita de config en el factory:
  - deduplicar `langs`
  - registrar siempre `text` como fallback, no `plaintext`
  - separar “temas a registrar” de “theme id a renderizar”
  - producir una key estable para cachear por config normalizada
- Mover el caching al propio `createShikiHighlighter`:
  - cachear la `Promise<HighlighterInstance>` o la API pública retornada por config normalizada
  - exponer `dispose()` en el objeto retornado
  - limpiar la entrada cacheada si la creación falla
- Simplificar `config/shiki-warn-tracker.ts`:
  - conservar el filtro de `console.warn`
  - eliminar la memoización runtime de `createShikiHighlighter` o convertirla en no-op si el factory ya cachea internamente
- Endurecer tipos en `config/patches/shiki/types.ts` y callers:
  - reemplazar `Record<string, any>` por un `HighlightCallOptions`
  - tipar `themeOptions` como unión explícita (`{ theme } | { themes }`)
  - tipar `transformers` con el contrato Shiki correspondiente
  - tipar el estado del pipeline sin cast global `as any`
  - evitar indexación dinámica sin tipo en `codeToHtml` / `codeToHast`
- Alinear la política de fallback:
  - usar `text` como lenguaje por defecto en el patch
  - cambiar `withLanguageLoading()` para caer a `text`
  - mantener compatibilidad aceptando `plaintext` sólo como alias de entrada si todavía aparece en callers o tests
- Revisar responsabilidad del aliasing:
  - conservar `withAliasResolution()` sólo si agrega política propia por encima de `langAlias`
  - si sólo reexpresa `langAlias`, mover esa normalización al paso de config/estado y dejar el decorator con una responsabilidad más clara o eliminarlo

## APIs e interfaces

- La API pública del factory cambia de:
  - `{ codeToHtml, codeToHast }`
  - a `{ codeToHtml, codeToHast, dispose }`
- Nuevos tipos internos a fijar:
  - `NormalizedHighlighterConfig`
  - `HighlightCallOptions`
  - `ThemeRenderOptions` o equivalente para distinguir `theme` vs `themes`
  - `HighlightResultByFormat` o una unión discriminada por `format`
- Contratos a mantener:
  - `codeToHtml(code, lang, options)` y `codeToHast(code, lang, options)` siguen siendo async
  - la pipeline de decorators sigue siendo el punto de composición de aliasing, carga lazy, trimming e inyección de transformers
- Contratos a aclarar:
  - repeated calls con la misma config normalizada reutilizan la misma instancia/promise
  - `dispose()` invalida esa entrada cacheada y libera recursos del highlighter
  - el fallback plain-language del patch es `text`

## Plan de pruebas

- Añadir tests unitarios nuevos para `config/patches/shiki/createShikiHighlighter.ts` y/o `decorators.ts` con dobles de Shiki.
- Cobertura mínima por ejemplos:
  - reutiliza la misma instancia para configs normalizadas equivalentes
  - configs distintas generan entradas distintas de cache
  - limpia cache tras un fallo de creación y permite retry
  - `dispose()` invalida la entrada cacheada y delega en el highlighter real
  - usa `text` como fallback por defecto
  - conserva `theme: "css-variables"` al render y registra el theme object correcto
  - copia `transformers` sin reutilizar la referencia de entrada
  - `withLanguageLoading()` cae a `text` cuando la carga falla
- DDT:
  - `html` vs `hast`
  - `theme` único vs `themes` map
  - alias hit vs miss
  - `inline: true/false`
  - `transformers` ausente / vacío / poblado
  - `theme === "css-variables"` vs theme string normal
- PBT con `fast-check` sólo donde aporte invariantes:
  - la normalización de `langs` es idempotente
  - la key de cache es estable para configs semánticamente iguales
  - la copia de `transformers` nunca comparte referencia con la entrada
  - trimming de trailing newline es idempotente
- Verificación final:
  - tests nuevos del patch
  - `pnpm test:unit` para asegurar que el resto de la infraestructura Shiki sigue estable
  - `pnpm check` sólo si el refactor toca tipos o integración suficientemente amplia como para justificar validación completa

## Ciclos TDD

1. **Caracterización del factory actual**
   - Agregar tests de contrato para `codeToHtml`, `codeToHast`, fallback, theme CSS variables y copia de transformers.
   - Payoff: bloquear comportamiento observable antes de mover lifecycle.

2. **Normalización de config**
   - Extraer `normalizeHighlighterConfig(...)` y `buildThemeRenderOptions(...)`.
   - Reescribir el factory para consumir config normalizada sin repetir `Object.values(themes)` ni branching disperso.
   - Payoff: prepara una key de cache confiable y simplifica el resto del módulo.

3. **Lifecycle único en el factory**
   - Introducir cache por config normalizada y `dispose()`.
   - Limpiar cache en rechazos y al disponer.
   - Ajustar `config/shiki-warn-tracker.ts` para que deje de memoizar esta misma factory.
   - Payoff: una sola fuente de verdad para creación y teardown.

4. **Tipado fuerte del pipeline**
   - Reemplazar `any` en creación, executor y state.
   - Tipar format/result/theme options/transformers de forma explícita.
   - Payoff: el boundary con Shiki deja de depender de casts opacos.

5. **Alineación de fallback y alias**
   - Cambiar fallback interno a `text`.
   - Reducir duplicación entre `langAlias` y `withAliasResolution()` según lo que los tests muestren como responsabilidad real.
   - Payoff: coherencia con la otra capa Shiki del repo y menor riesgo de upgrade.

## Supuestos

- La decisión para este refactor es que el caching viva en `createShikiHighlighter`, no en `config/shiki-warn-tracker.ts`.
- `config/shiki-warn-tracker.ts` seguirá existiendo para filtrar warnings `[Shiki]`, pero no debe seguir siendo la capa principal de memoización del factory.
- El fallback objetivo es `text`; si se necesita compatibilidad, `plaintext` se tratará sólo como alias de entrada y no como canonical fallback interno.
- No se cambia a `shiki/core`, shorthands ni codegen en este refactor; eso queda fuera hasta cerrar lifecycle, typing y normalización del wrapper actual.
