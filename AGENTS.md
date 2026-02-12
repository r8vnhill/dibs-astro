# Guía para Agentes de IA

Este documento proporciona contexto y convenciones esenciales para agentes de IA que colaboran en este proyecto.

## Principios fundamentales

### Lenguaje inclusivo

**Este es un requisito fundamental del proyecto.** Todo contenido generado, modificado o sugerido debe mantener un lenguaje inclusivo y respetuoso:

- **Evita el masculino genérico**: en lugar de "los usuarios", usa "las personas usuarias", "el alumnado", "quienes usen" o estructuras neutras.
- **Prefiere formas neutras**: "el equipo de desarrollo" en vez de "los desarrolladores", "la persona que programa" en lugar de "el programador".
- **Usa desdoblamientos cuando sea apropiado**: "estudiantes y profesores" → "estudiantes y profesorado" o "el estudiantado y profesorado".
- **Revisa ejemplos de código**: nombres de variables, comentarios y documentación también deben ser inclusivos.

**Ejemplos de transformaciones correctas:**

❌ Incorrecto:
- "El desarrollador debe asegurarse de..."
- "Los administradores pueden..."
- "El usuario final verá..."

✅ Correcto:
- "Quien desarrolle debe asegurarse de..."
- "El equipo de administración puede..."
- "Las personas usuarias verán..."

### Idioma principal: español

- El contenido educativo, la documentación y los mensajes de usuario están en **español**.
- Los comentarios de código, nombres de variables y funciones siguen convenciones en inglés (estándar del ecosistema).
- Mantén consistencia con el tono formal-técnico del material existente.

## Arquitectura del proyecto

### Stack tecnológico

- **Framework**: Astro v5 con islas React
- **Estilos**: Tailwind v4 (tokens CSS nativos)
- **Contenido**: Markdoc + estructura jerárquica en `src/data/course-structure.ts`
- **Resaltado de sintaxis**: Shiki (personalizado, no el integrado de Astro)
- **Deploy**: Cloudflare Workers (output estático, **sin SSR**)

### Convenciones críticas

1. **Trailing slashes obligatorios**: todas las rutas internas terminan en `/` (ej: `/notes/foo/`)
2. **Solo output estático**: nunca introducir SSR ni endpoints de servidor
3. **Iconos**: agregar SVGs a `src/assets/img/icons/` y ejecutar `pnpm generate-icons` (nunca editar `index.ts` manualmente)
4. **Formato**: `dprint` se ejecuta automáticamente en pre-commit (verificar que tu código pase `dprint fmt`)
5. **Ejemplos de código son inmutables**: no modificar código dentro de componentes como `<PowerShellBlock>` salvo que sea explícitamente solicitado

### Aliases de importación

```typescript
import { Component } from "$components/...";  // src/components
import { Icon } from "$icons";                // src/assets/img/icons/index.ts
import * as semantics from "$semantics";      // componentes semánticos
import { util } from "$utils/...";            // src/utils
```

También disponibles: `~/*`, `$layouts/*`, `$styles/*`, `$hooks/*`, `$assets/*`, `$callouts/*`

## Flujo de trabajo

### Desarrollo

```powershell
pnpm dev      # Inicia servidor con auto-generación de iconos
pnpm build    # Build de producción
pnpm preview  # Preview local con Cloudflare Workers
pnpm deploy   # Pipeline completo: icons → type-check → build → deploy
```

### Testing

```powershell
pnpm test           # Ejecuta suite de Vitest
pnpm test:watch     # Modo watch para TDD
pnpm test:ui        # Abre UI de Vitest
```

- Tests de componentes React usan `@testing-library/react` + `jsdom`
- Ver ejemplos en `src/components/navigation/__tests__/LessonTree.test.tsx`

### Formateo

- **Automático**: Husky + lint-staged ejecutan `dprint fmt` en pre-commit
- **Manual**: `pnpm dlx dprint fmt` (o instalar globalmente con `pnpm add -g dprint`)

## Patrones de contenido educativo

### Estructura de lecciones

Las páginas de notas (`src/pages/notes/**/*.astro`) siguen esta estructura:

```astro
<NotesLayout title="..." description="...">
    <Abstract>
        <!-- Resumen conceptual de la lección -->
    </Abstract>

    <NotesSection id="h2-section-id">
        <Heading headingLevel="h2" Icon={icons.IconName}>
            Título de la sección
        </Heading>
        
        <!-- Contenido: P, List, CodeBlocks, callouts (Definition, Important, Tip, etc.) -->
    </NotesSection>

    <Exercise headingLevel="h2">
        <!-- Ejercicios prácticos con requisitos, hints y solución -->
    </Exercise>

    <ConclusionsLayout>
        <!-- Conclusiones, puntos clave y takeaways -->
    </ConclusionsLayout>

    <References>
        <!-- Bibliografía con descripciones útiles -->
    </References>
</NotesLayout>
```

### Componentes semánticos

- **Texto**: `<P>`, `<B>`, `<I>`, `<Mono>`, `<Enquote>`
- **Listas**: `<List>`, `<ListItem icon={icons.Icon}>`
- **Código**: `<PowerShellBlock>`, `<JsonBlock>`, `<OutputBlock>`, etc.
- **Callouts**: `<Definition>`, `<Important>`, `<Tip>`, `<Warning>`, `<More>`, `<Explanation>`
- **Enlaces**: `<Link>`, `<DibsSourceLink repo="..." file="...">`

### Bloques de código

Siempre incluir slots descriptivos:

```astro
<PowerShellBlock code={`...`}>
    <span slot="title">Descripción clara del ejemplo</span>
    <span slot="footer">Contexto adicional (opcional)</span>
    <DibsSourceLink repo="scripts" file="..." slot="source" />
</PowerShellBlock>
```

## Integración con otros documentos

- **[CONTRIBUTING.md](CONTRIBUTING.md)**: guía de contribución para personas colaboradoras humanas
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**: código de conducta del proyecto
- **[README.md](README.md)**: introducción general y setup
- **[docs/architecture/](docs/architecture/)**: documentación detallada de arquitectura

## Respeto al trabajo existente

- **No modifiques contenido educativo sin contexto completo**: las lecciones siguen una progresión pedagógica deliberada
- **Preserva ejemplos de código**: salvo indicación explícita, el código en bloques educativos no debe alterarse
- **Mantén consistencia terminológica**: revisa secciones previas antes de introducir nuevos términos
- **Respeta los comentarios HTML**: muchos archivos incluyen referencias bibliográficas comentadas que no deben eliminarse

## Preguntas frecuentes

### ¿Puedo usar lenguaje neutro con "x" o "@"?

No. Prefiere formas inclusivas reconocidas por la RAE: desdoblamientos ("estudiantes y profesorado"), colectivos ("el alumnado") o reestructuraciones ("quienes programen").

### ¿Cómo manejo términos técnicos en inglés?

Los términos técnicos sin traducción consolidada se mantienen en inglés con `<Mono>` o `<I>`: "el *pipeline*", "usar `ValueFromPipeline`". No fuerces traducciones artificiales.

### ¿Qué hago si encuentro contenido no inclusivo existente?

Señálalo y sugiere alternativas. Si trabajas en una sección relacionada, puedes corregirlo. Si es fuera de tu alcance inmediato, documenta la sugerencia para revisión posterior.

### ¿Puedo agregar nuevos íconos?

Sí. Coloca el SVG en `src/assets/img/icons/`, ejecuta `pnpm generate-icons`, e importa desde `$icons`. La mayoría de iconos son estilo Phosphor (descarga bajo demanda según necesidad).

### ¿Cómo pruebo cambios en la navegación de lecciones?

Edita `src/data/course-structure.ts` y reinicia el dev server. El watcher detectará cambios y recargará automáticamente.

---

**Última actualización:** Febrero 2026  
**Mantenedor:** Proyecto DIBS (Diseño e Implementación de Bibliotecas de Software)
