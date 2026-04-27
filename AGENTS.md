# Guía para Agentes de IA

Contexto y reglas esenciales para agentes que colaboran en este repositorio.

## Protocolo de decisiones

- Nunca tomes decisiones de producto, arquitectura, pedagogía, orden de contenidos o política de estilo por tu cuenta.
- Cuando haya que elegir, presenta alternativas viables con sus tradeoffs y espera confirmación de la persona usuaria.
- Puedes avanzar en cambios mecánicos de bajo riesgo solo cuando el patrón existente del repositorio haga inequívoca la decisión.
- Si una instrucción entra en conflicto con los patrones del proyecto, detente y pregunta antes de cambiar de dirección.

## Principios fundamentales

- Usa lenguaje inclusivo y respetuoso en contenido, documentación, mensajes y ejemplos.
- Evita el masculino genérico: prefiere "las personas usuarias", "el alumnado", "quienes usen" o estructuras neutras.
- No uses `x` ni `@` para neutralidad; prefiere colectivos, desdoblamientos razonables o reformulación.
- El contenido educativo, la documentación de usuario y los mensajes visibles están en español.
- Los nombres de variables, funciones y comentarios de código siguen el inglés técnico del ecosistema.
- No modifiques contenido educativo sin revisar su contexto pedagógico inmediato.

## Forma del proyecto

- Sitio público del curso DIBS, construido con Astro 5, Tailwind CSS v4, Markdoc y React islands.
- El deploy es estático sobre Cloudflare Workers; no introduzcas SSR ni endpoints de servidor.
- El código de la app vive en `src/`; paquetes reutilizables del workspace viven en `packages/*`.
- `packages/content-core` es un paquete privado y host-agnostic consumido como `@ravenhill/content-core`.
- La lógica TypeScript está organizada por capas en `src/domain`, `src/application`, `src/infrastructure` y `src/presentation`.
- Las páginas de curso viven en `src/pages/notes`; fragmentos compartidos de lecciones viven en `src/fragments`.

## Flujo de trabajo

- Instala dependencias con `pnpm install`.
- Ejecuta desarrollo local con `pnpm dev`; este comando regenera bibliografía y metadata de lecciones antes de iniciar.
- Construye producción con `pnpm build`; también regenera datos requeridos.
- Ejecuta checks con `pnpm check`.
- Ejecuta pruebas con `pnpm test`, o usa `pnpm test:unit` y `pnpm test:astro` para suites específicas.
- Formatea con `pnpm fmt`; el pre-commit también usa `dprint`.
- Usa `pnpm preview` para revisar el build localmente con el flujo de Cloudflare Workers.

## Datos y archivos generados

- No edites manualmente `src/data/lesson-metadata.generated.json`.
- La fuente editorial de bibliografía es Turtle bajo `src/data/bibliography/sources/`.
- No edites manualmente `src/data/bibliography/catalog.graph.generated.ttl` ni `src/data/bibliography/catalog.graph.generated.jsonld`.
- Tras cambios bibliográficos, ejecuta `pnpm generate:bibliography-catalog` y conserva tanto la fuente como los artefactos generados.
- El trabajo bibliográfico nuevo debe apuntar al catálogo Turtle, no a los archivos legacy `*.bibliography.jsonld`.

## Convenciones de código

- Usa los aliases de `tsconfig.json`: `~/*`, `$components/*`, `$layouts/*`, `$styles/*`, `$utils/*`, `$hooks/*`, `$assets/*`, `$icons`, `$semantics`, `$callouts`, `$domain/*`, `$application/*`, `$infrastructure/*`, `$presentation/*` y `$test-utils/*`.
- Mantén la lógica de dominio independiente de Astro y UI; conecta con adaptadores de aplicación, infraestructura o presentación.
- Las rutas internas llevan trailing slash, por ejemplo `/notes/foo/`.
- Los iconos locales viven en `src/assets/img/icons/`; después de cambiarlos ejecuta `pnpm generate-icons` y no edites el índice generado manualmente.
- Preserva la configuración Shiki personalizada en `src/lib/shiki` y `config/shiki-warn-tracker`; el proyecto evita el resaltado Shiki integrado de Astro.

## Pruebas

- Los tests viven cerca del módulo probado, normalmente en directorios `__tests__`.
- Usa `*.render.test.ts` para render de componentes `.astro` con la suite `pnpm test:astro`.
- Usa `*.test.ts` o `*.test.tsx` para pruebas unitarias o de integración en jsdom con `pnpm test:unit`.
- Para render Astro, reutiliza los helpers de `src/test-utils/astro-render.ts`.

## Contenido y componentes

- Las lecciones usan `NotesLayout`, `NotesSection`, `Heading`, componentes semánticos, callouts, ejercicios, conclusiones y referencias.
- Componentes semánticos compartidos viven en `src/components/semantics`; layouts compartidos en `src/layouts`.
- No modifiques ejemplos de código dentro de bloques educativos como `<PowerShellBlock>` salvo solicitud explícita.
- Para snippets inline con espacios, usa el prop `code` en componentes como `<InlineCode>`, `<PowerShellInline>`, `<NushellInline>` o `<PythonInline>`.
- Para referencias bibliográficas normales, prefiere el flujo graph-backed documentado en `src/data/bibliography/README.md`.

## Deploy

- `astro.config.ts` define `output: "static"`, `trailingSlash: "always"` y `site: "https://dibs.ravenhill.cl"`.
- Los redirects legacy de scripting se generan desde `src/pages/notes/scripting`.
- `pnpm deploy` construye el sitio y despliega con Wrangler; verifica build y artefactos generados antes de desplegar.
