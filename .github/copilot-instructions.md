# Copilot instructions for this repo

Purpose: help AI agents be productive immediately in this Astro + React static site deployed to Cloudflare Workers.

## Big picture
- Static site (no SSR): `astro.config.ts` sets `output: "static"`, `trailingSlash: "always"`, `site: https://dibs.ravenhill.cl`.
- Tech stack: Astro 5, React islands, Tailwind CSS v4 (via `@tailwindcss/vite`), Markdoc, astro-expressive-code (Shiki highlighting), Sharp image service.
- Deployment: Cloudflare Workers serves prebuilt assets from `dist/` (`wrangler.toml` with `assets.directory = "./dist"`).
- Spanish-first content and UI. Prefer Spanish copy in components and pages.

## Developer workflows (pnpm)
- Dev server: `pnpm dev` → runs `generate-icons-index.js` then `astro dev` (HMR enabled).
- Build: `pnpm build` → generates icons, then `astro build` into `dist/`.
- Preview via Worker: `pnpm preview` → build then `wrangler dev` (serves `dist/`).
- Deploy: `pnpm deploy` → `astro check && astro build && wrangler deploy`.
- Icons index generator can run alone: `pnpm generate-icons`.

## Code layout and conventions
- Path aliases (see `tsconfig.json`):
  - `~/*` → `src/*`, `$components/*`, `$layouts/*`, `$styles/*`, `$utils/*`, `$hooks/*`, `$assets/*`.
  - `$icons` → `src/assets/img/icons/index.ts` (auto-generated). Example:
    - `import { Copy } from "$icons";`
- React islands pattern: author TSX in `src/components/.../*.tsx`, hydrate in `.astro` with directives.
  - Example (`src/components/reading-time/ReadingTime.astro`):
    - `<ReadingTimeIsland client:load {...props} />`
    - Wrap UI that must not affect reading-time with `ExcludeFromReadingTime.astro`.
- Tailwind v4: global import in `src/styles/global.css` with `@import 'tailwindcss';` and Starwind styles in `starwind.css`.
  - Use design tokens/utilities (e.g., `bg-base-background`, `border-base-border`, `text-primary`). Avoid hardcoding colors.
  - Dark variant via `.dark` class (see `@custom-variant dark` in `global.css`). Theme toggle script is `scripts/theme-toggle.ts`.
- Shiki/expressive-code: syntax themes in `astro.config.ts`; available languages listed in `src/lib/shiki/highlighter.ts`.
- Navigation utilities: prefer `normalizeNavigation`/`resolveAutoNav` from `src/utils/navigation.ts` to keep links normalized to trailing slashes.
  - Example: `const { normalizedNext, normalizedPrevious } = normalizeNavigation(next, previous);`
- Course structure: see `src/data/course-structure.ts` and React sidebar `src/components/navigation/LessonSidebar.tsx` (uses `useMediaQuery` and `localStorage` to persist visibility).

## Integrations and tooling
- Custom dev watcher: `config/integrations/dev-server-file-watcher.ts` watches `./config/**`, `./src/assets/**`, `./src/data/**` to trigger HMR on changes.
- Icons auto-export: `generate-icons-index.js` scans `src/assets/img/icons/*.svg` and writes `index.ts` with PascalCase named exports.
  - Do not edit `src/assets/img/icons/index.ts` manually. Run the generator or use the scripts above.
- Formatting: repo ships `dprint.json` (indentWidth 4, print width 120, double quotes; Astro/markup plugin). Preserve existing style and avoid mass reformatting.

## Authoring patterns (examples)
- Import via aliases:
  - `import { LessonTree } from "$components/navigation/LessonTree";`
  - `import Heading from "$components/semantics/Heading.astro";`
- React + clsx:
  - `className={clsx("w-72", visible ? "opacity-100" : "opacity-0")}` (see `LessonSidebar.tsx`).
- Astro semantic component with Icon slot (see `components/semantics/Heading.astro`): pass an `Icon` component and it renders via `FilledIcon` wrapper.

## Gotchas and guardrails
- Links must end with a trailing slash. Use the utilities above, or ensure `href` like `/foo/` not `/foo`.
- Because output is static, avoid adding server-only code; stick to client-side islands for interactivity.
- Keep UI text in Spanish unless a file explicitly uses English.
- When adding icons, place `.svg` in `src/assets/img/icons/` and rerun the generator.
- Respect Starwind component styles and structure under `src/components/starwind/**` when extending UI.

## Where to look first
- Config: `astro.config.ts`, `wrangler.toml`, `starwind.config.json`.
- Styles: `src/styles/global.css`, `src/styles/starwind.css`.
- Content/pages: `src/pages/**`, fragments in `src/fragments/**`, layouts in `src/layouts/**`.
- Utilities/hooks: `src/utils/**`, `src/hooks/**`.

Questions or missing workflows? Share unclear areas (e.g., additional deployment targets, preferred formatting commands), and we’ll iterate this guide.

## Quick reference: add a new lesson/page
- File location (notes): under `src/pages/notes/.../index.astro` or nested `.../topic/index.astro`.
- Use the standard layout and Spanish titles:
  - Example:
    - `src/pages/notes/software-libraries/index.astro` uses:
      `<NotesLayout title="Unidad 1 - Introducción al desarrollo de bibliotecas de software">...</NotesLayout>`
- Navigation shows up automatically if listed in `course-structure.ts`:
  - Add an entry to `courseStructure: Lesson[]` with `{ title, href, children? }`.
  - Ensure `href` has leading and trailing slash, e.g., `/notes/<section>/<topic>/`.
  - For nested lessons, place children under `children: []` preserving order.
- Layout props and auto-nav:
  - `NotesLayout.astro` resolves prev/next using `resolveAutoNav(Astro.url.pathname, courseStructure)`.
  - You can override with `previous`/`next` props if needed, then `normalizeNavigation` ensures slashes.
- Sidebar behavior:
  - `LessonSidebar.tsx` persists visibility in `localStorage` and adapts on small screens; no changes needed per page.
- Reading time widget:
  - `<ReadingTime multiplier={1.5} />` is included by layout; wrap non-content UI in `ExcludeFromReadingTime.astro` if you embed extra widgets.
