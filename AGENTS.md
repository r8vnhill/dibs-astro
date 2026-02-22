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
import { Component } from "$components/..."; // src/components
import { Icon } from "$icons"; // src/assets/img/icons/index.ts
import * as semantics from "$semantics"; // componentes semánticos
import { util } from "$utils/..."; // src/utils
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
pnpm test              # Ejecuta ambas suites: unit/jsdom + render Astro
pnpm test:unit         # Suite general en jsdom (React, utilidades con DOM)
pnpm test:astro        # Suite de render de componentes .astro (entorno Node/Astro container)
pnpm test:watch        # Watch para suite general (jsdom)
pnpm test:watch:astro  # Watch para suite Astro
pnpm test:ui           # Abre UI de Vitest
```

- **Ambiente unitario (`vitest.config.ts`)**:
  - `environment: "jsdom"`
  - Incluye tests `*.test.ts` / `*.spec.ts` (excluye `*.render.test.ts`)
  - Uso típico: React Testing Library, utilidades con `document/window`
- **Ambiente Astro (`vitest.astro.config.ts`)**:
  - `environment: "node"`
  - Incluye `src/**/*.render.test.ts`
  - Uso típico: render de componentes `.astro` con `experimental_AstroContainer`
- Ver ejemplos:
  - React/jsdom: `src/components/navigation/__tests__/LessonTree.test.tsx`
  - Astro render: `src/components/meta/__tests__/Head.render.test.ts`

#### Convención de nombres de tests

- Usa `*.render.test.ts` para tests de render de componentes `.astro` (suite `test:astro`).
- Usa `*.test.ts` o `*.test.tsx` para tests unitarios/integración en `jsdom` (suite `test:unit`).
- Usa `*.spec.ts` solo cuando exista una razón explícita de estilo/equipo; por defecto, prefiere `*.test.ts`.
- Mantén los tests dentro de `__tests__` junto al módulo o componente probado.
- Ejemplos recomendados:
  - `src/components/meta/__tests__/Head.render.test.ts`
  - `src/components/ui/code/__tests__/InlineCode.render.test.ts`
  - `src/components/navigation/__tests__/LessonTree.test.tsx`
  - `src/utils/__tests__/page-meta.test.ts`

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
    <DibsSourceLink
        repo="scripts" file="..."
        slot="source"
    />
</PowerShellBlock>
```

## Componentes comunes de Astro

### Componentes de layout

#### `<NotesLayout>`

Layout principal para páginas de lecciones. Proporciona estructura, navegación y metadata SEO.

```astro
<NotesLayout
    title="Título de la lección"
    description="Descripción breve para SEO y abstract"
    timeMultiplier={1.0}  <!-- opcional: ajusta estimación de tiempo de lectura -->
    git={{ user: "...", repo: "..." }}  <!-- opcional: para source links -->
>
    <!-- contenido -->
</NotesLayout>
```

#### `<NotesSection>`

Contenedor para secciones principales con ID ancla para navegación interna.

```astro
<NotesSection id="h2-unique-id">
    <Heading headingLevel="h2" Icon={icons.IconName}>
        Título de la sección
    </Heading>
    <!-- contenido de la sección -->
</NotesSection>
```

#### `<ConclusionsLayout>`

Estructura las conclusiones al final de una lección con tres slots:

```astro
<ConclusionsLayout>
    <Fragment slot="conclusions">
        <P>Resumen general de la lección...</P>
    </Fragment>

    <Fragment slot="key-points">
        <ListItem icon={icons.Icon}>Punto clave 1</ListItem>
        <ListItem icon={icons.Icon}>Punto clave 2</ListItem>
    </Fragment>

    <Fragment slot="takeaways">
        <P>Mensaje final o llamado a la acción...</P>
    </Fragment>
</ConclusionsLayout>
```

### Componentes de contenido

#### Componentes semánticos de texto

Ubicados en `src/components/semantics/`:

- `<P>`: Párrafo estándar
- `<B>`: Texto en negrita (énfasis fuerte)
- `<I>`: Texto en cursiva (énfasis suave o términos técnicos)
- `<Mono>`: Texto monoespaciado para código inline corto
- `<Enquote>`: Citas textuales (maneja tipografía correcta de comillas)

```astro
<P>
    Este es un párrafo con <B>énfasis fuerte</B>, <I>énfasis suave</I>,
    y un comando <Mono>inline</Mono>. También puedes citar:
    <Enquote>texto entre comillas</Enquote>.
</P>
```

#### Listas

```astro
<List>
    <ListItem icon={icons.CheckCircle}>
        Elemento con ícono personalizado
    </ListItem>
    <ListItem icon={icons.Warning}>
        Otro elemento
    </ListItem>
</List>
```

#### `<Heading>`

Encabezados semánticos con soporte para íconos:

```astro
<Heading headingLevel="h2" Icon={icons.Lightbulb}>
    Título con ícono
</Heading>

<Heading headingLevel="h3">
    Subtítulo sin ícono
</Heading>
```

### Componentes de código

Ubicados en `src/components/ui/code/`:

#### Bloques de código por lenguaje

- `<PowerShellBlock>`: Código PowerShell
- `<NushellBlock>`: Código Nushell
- `<JsonBlock>`: JSON
- `<OutputBlock>`: Salida de terminal (sin resaltado)
- `<TypeScriptBlock>`, `<JavaScriptBlock>`, etc.

```astro
<PowerShellBlock code={`Get-Process | Where-Object CPU -gt 100`}>
    <span slot="title">Filtrar procesos por uso de CPU</span>
    <span slot="footer">Requiere permisos de administrador</span>
    <DibsSourceLink repo="scripts" file="monitoring/Get-CpuUsage.ps1" slot="source" />
</PowerShellBlock>
```

#### Código inline

- `<PowerShellInline code="Get-Process" />`: Código inline resaltado
- `<Mono>texto</Mono>`: Código inline sin resaltado (más ligero)

### Callouts (componentes de atención)

Ubicados en `src/components/ui/callouts/`:

- `<Definition>`: Definiciones de términos
- `<Important>`: Información crítica
- `<Tip>`: Consejos prácticos
- `<Warning>`: Advertencias
- `<Note>`: Notas adicionales
- `<More>`: Información complementaria expandible
- `<Explanation>`: Explicaciones detalladas
- `<Question>`: Preguntas para reflexión
- `<Info>`: Información general

Todos soportan `headingLevel` para subniveles:

```astro
<Important headingLevel="h3">
    <span slot="title">Título del callout</span>
    <P>Contenido del callout...</P>
</Important>

<Tip>
    <Fragment slot="title">Sin headingLevel usa estilo por defecto</Fragment>
    <P>Contenido...</P>
</Tip>
```

### Componentes de ejercicios

#### `<Exercise>`

Estructura ejercicios con slots para requisitos, notas, pistas y solución:

```astro
<Exercise headingLevel="h2">
    <Fragment slot="title">Título del ejercicio</Fragment>

    <Fragment slot="requirements">
        <List>
            <ListItem icon={icons.Target}>Requisito 1</ListItem>
            <ListItem icon={icons.Target}>Requisito 2</ListItem>
        </List>
    </Fragment>

    <Fragment slot="notes">
        <Definition headingLevel="h4">
            <span slot="title">Concepto importante</span>
            <P>Explicación...</P>
        </Definition>
    </Fragment>

    <Fragment slot="hints">
        <List>
            <ListItem icon={icons.Lightbulb}>Pista 1</ListItem>
            <ListItem icon={icons.Lightbulb}>Pista 2</ListItem>
        </List>
    </Fragment>

    <Fragment slot="solution">
        <PowerShellBlock code={`...`}>
            <span slot="title">Solución de referencia</span>
            <DibsSourceLink repo="..." file="..." slot="source" />
        </PowerShellBlock>
    </Fragment>

    <Fragment slot="use">
        <PowerShellBlock code={`...`}>
            <span slot="title">Cómo ejecutar la solución</span>
        </PowerShellBlock>
    </Fragment>
</Exercise>
```

### Componentes de tablas

Ubicados en `src/components/starwind/table/`:

#### Tabla básica con Starwind

```astro
<Table>
    <TableHeader>
        <TableRow>
            <TableCell>Columna 1</TableCell>
            <TableCell>Columna 2</TableCell>
        </TableRow>
    </TableHeader>
    <TableBody>
        <TableRow>
            <TableCell>Dato 1</TableCell>
            <TableCell>Dato 2</TableCell>
        </TableRow>
    </TableBody>
</Table>
```

#### Manejo de text wrap en celdas

Por defecto, las celdas usan `nowrap` (sin salto de línea). Para columnas con **contenido largo** que debe ajustarse dentro del ancho disponible, usa `wrap="normal"`:

```astro
<Table>
    <TableHeader>
        <TableRow>
            <TableCell>Parámetro</TableCell>
            <TableCell wrap="normal">Descripción</TableCell>
        </TableRow>
    </TableHeader>
    <TableBody>
        <TableRow>
            <TableCell>-ErrorAction</TableCell>
            <TableCell wrap="normal">
                Controla cómo se procesan los errores no terminantes. Los valores posibles son:
                Continue (por defecto), Stop, SilentlyContinue, Inquire.
            </TableCell>
        </TableRow>
    </TableBody>
</Table>
```

**Nota**: No uses `layout="fixed"` junto con columnas muy asimétricas, ya que puede causar problemas de distribución. El comportamiento de wrap es más eficaz con `layout="auto"` (por defecto).

### Componentes de enlaces

#### `<Link>`

Enlaces internos y externos con manejo automático de rutas:

```astro
<Link href="/notes/path/">Enlace interno</Link>
<Link href="https://example.com">Enlace externo</Link>
```

#### `<DibsSourceLink>`

Enlaces a repositorios del código fuente del curso:

```astro
<DibsSourceLink
    repo="scripts"  <!-- o "tests", "libraries", etc. -->
    file="path/to/file.ps1"
/>
```

### Referencias bibliográficas

Ubicados en `src/components/ui/references/`:

```astro
<References>
    <Fragment slot="recommended">
        <Book
            chapter="Chapter title"
            bookTitle="Book Title"
            pages={[123, 145]}
        >
            <AuthorList
                slot="authors"
                authors={[
                    { firstName: "John", lastName: "Doe" },
                    { firstName: "Jane", lastName: "Smith" }
                ]}
            />
            <span slot="description">
                Descripción útil de por qué se recomienda...
            </span>
        </Book>

        <WebPage
            title="Article Title"
            url="https://example.com/article"
        >
            <Link href="https://example.com" slot="location">
                Nombre del sitio web
            </Link>
            <Fragment slot="description">
                Descripción del recurso...
            </Fragment>
        </WebPage>
    </Fragment>

    <Fragment slot="additional">
        <!-- Recursos adicionales con la misma estructura -->
    </Fragment>
</References>
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

Los términos técnicos sin traducción consolidada se mantienen en inglés con `<Mono>` o `<I>`: "el _pipeline_", "usar `ValueFromPipeline`". No fuerces traducciones artificiales.

### ¿Qué hago si encuentro contenido no inclusivo existente?

Señálalo y sugiere alternativas. Si trabajas en una sección relacionada, puedes corregirlo. Si es fuera de tu alcance inmediato, documenta la sugerencia para revisión posterior.

### ¿Puedo agregar nuevos íconos?

Sí. Coloca el SVG en `src/assets/img/icons/`, ejecuta `pnpm generate-icons`, e importa desde `$icons`. La mayoría de iconos son estilo Phosphor (descarga bajo demanda según necesidad).

### ¿Cómo pruebo cambios en la navegación de lecciones?

Edita `src/data/course-structure.ts` y reinicia el dev server. El watcher detectará cambios y recargará automáticamente.

---

**Última actualización:** Febrero 2026\
**Mantenedor:** Proyecto DIBS (Diseño e Implementación de Bibliotecas de Software)
