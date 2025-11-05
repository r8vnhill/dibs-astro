## Copilot instructions for this repo

Purpose: get AI coding agents productive fast in this Astro + React static site deployed to Cloudflare Workers.

### Architecture overview

- **Output**: fully static site (`astro.config.ts`: `output: "static"`, `trailingSlash: "always"`). No SSR — all routes prerendered at build.
- **Tech stack**: Astro v5 + React islands, Tailwind v4 (via `@tailwindcss/vite`), Markdoc content layer, custom Shiki highlighting, Sharp image service.
- **Deploy target**: Cloudflare Workers serving `./dist` (see `wrangler.toml` → `assets.directory = "./dist"`).
- **Content structure**: Spanish-first educational site for DIBS (Software Library Design & Implementation) course. Course hierarchy defined in `src/data/course-structure.ts` as nested `Lesson[]` tree.
- **Routing**: Astro file-based routing in `src/pages/notes/**`. Automated prev/next navigation via `resolveAutoNav` (from `src/utils/navigation.ts`) which flattens the lesson tree.

### Key developer workflows

**Development** (pnpm only):

- `pnpm dev` — auto-generates icon index, starts Astro dev server with HMR
- `pnpm build` — generates icons + production build to `./dist`
- `pnpm preview` — builds then runs `wrangler dev` to preview Worker locally
- `pnpm deploy` — full pipeline: icons → type-check → build → deploy to Cloudflare
- `pnpm generate-icons` — regenerates `src/assets/img/icons/index.ts` from SVGs (auto-runs on dev/build)

**Testing**:

- `pnpm test` — runs Vitest suite (jsdom environment for React components)
- `pnpm test:watch` — watch mode for TDD
- `pnpm test:ui` — opens Vitest UI
- Test setup: `vitest.config.ts` + `src/test/setup.ts` (installs `@testing-library/jest-dom`)
- Example tests: `src/components/navigation/__tests__/LessonTree.test.tsx`

**Formatting**: `dprint` enforces consistency

- Auto-runs via Husky + lint-staged pre-commit hook
- Manual: `pnpm dlx dprint fmt` (or install globally: `pnpm add -g dprint` then `dprint fmt`)
- Config: `dprint.json` — handles TS/Astro/JSON/Markdown/CSS via wasm plugins

### Project conventions

**Import path aliases** (see `tsconfig.json`):

```typescript
import { LessonTree } from "$components/navigation/LessonTree"; // $components/*
import { Copy } from "$icons"; // $icons = src/assets/img/icons/index.ts
import * as semantics from "$semantics"; // $semantics = components/semantics/index.ts
import { resolveAutoNav } from "$utils/navigation"; // $utils/*
```

Also: `~/*` → `src/*`, `$layouts/*`, `$styles/*`, `$hooks/*`, `$assets/*`, `$callouts/*`

**Icons workflow**:

1. Add SVG to `src/assets/img/icons/` (e.g., `copy-icon.svg`)
2. Run `pnpm generate-icons` (or dev/build auto-runs it)
3. Import: `import { CopyIcon } from "$icons";`
4. Never manually edit `src/assets/img/icons/index.ts` (auto-generated, PascalCase exports)

**Navigation patterns**:

- Always normalize hrefs with trailing slashes via `normalizeNavigation(next, previous)` from `src/utils/navigation.ts`
- Example: `/notes/foo` → `/notes/foo/`
- Auto prev/next: `resolveAutoNav(pathname, courseStructure)` flattens tree and finds adjacent lessons
- Course structure changes: edit `src/data/course-structure.ts` → restart dev server (watched by `dev-server-file-watcher`)

**React islands architecture**:

- Interactive components: `src/components/**/*.tsx` (React)
- Static layout/content: `src/components/**/*.astro` (Astro)
- Hydration: use client directives in `.astro` files (typically `client:only="react"` for this project)
- Example: `<LessonTree lessons={courseStructure} client:only="react" />`
- Islands use React hooks (`useState`, `useEffect`) — see `LessonTree.tsx`, `ThemeSwitcher.tsx` for patterns

**Styling conventions**:

- Tailwind v4 with CSS-native design tokens via `@theme inline` blocks (see `src/styles/theme/theme.css`)
- Use semantic tokens: `bg-base-background`, `text-base-text`, `border-base-border` (not raw colors)
- Dark theme: `.dark` class toggles CSS variables (see `src/styles/theme/html-colors.css`)
- Theme toggle: `src/components/ui/theme/ThemeSwitcher.tsx` manages state + localStorage persistence
- Custom components from Starwind (tabs/table/tooltip): `starwind.config.json` defines versions + base config

### Integration points & infra quirks

**Custom Shiki highlighting** (not Astro's built-in):

- Implementation: `src/lib/shiki/highlighter.ts` + cache/transformers/language-aliases
- Why: need custom transformers, language aliases (`py` → `python`, `nu` → `nushell`), and fallback HTML for unsupported langs
- `astro.config.ts` disables Astro's Shiki: `markdown: { syntaxHighlight: "prism" }` (prism is placeholder, not used)
- Warning suppression: `config/shiki-warn-tracker.ts` patches `console.warn` to filter `[Shiki]` noise + memoizes `createShikiHighlighter`
- Supported themes: `catppuccin-latte` (light), `catppuccin-mocha` (dark)

**Dev server HMR watcher**:

- Custom integration: `config/integrations/dev-server-file-watcher.ts`
- Watches: `./config/**`, `./src/assets/**`, `./src/data/**` for hot-reload triggers
- Don't bypass: editing `course-structure.ts` or config files should auto-restart dev server

**Cloudflare Workers deployment**:

- `wrangler.toml` config: serves `./dist`, observability enabled, custom domain routing
- Deploy: `pnpm deploy` (builds + deploys)
- Preview: `pnpm preview` (local Workers runtime via `wrangler dev`)

### Critical guardrails

1. **Trailing slashes mandatory**: all internal links must end with `/` (e.g., `/notes/foo/` not `/notes/foo`). Use `normalizeNavigation` utilities.
2. **Static-only output**: never introduce SSR/server endpoints. This is a fully prerendered static site.
3. **Icons auto-generation**: never manually edit `src/assets/img/icons/index.ts`. Add SVGs then run `pnpm generate-icons`.
4. **Spanish-first content**: UI text, error messages, and content default to Spanish. Follow existing copy patterns.
5. **Client directives**: React islands need explicit hydration (`client:only="react"` is most common here). Don't assume auto-hydration.
6. **dprint formatting**: pre-commit hook enforces. If you generate code, it must pass `dprint fmt` or commit will fail.

### Testing patterns

- React component tests: use `@testing-library/react` + `jsdom` (see `vitest.config.ts`)
- Example: `src/components/navigation/__tests__/LessonTree.test.tsx` demonstrates localStorage mocking, user interactions
- Run tests before pushing: `pnpm test` (or `pnpm test:watch` during development)
- No CSS processing in tests (`css: false` in `vitest.config.ts`) — speeds up runs, avoids transform errors

### Where to look first

**Config & tooling**:

- `astro.config.ts` — Astro setup, integrations, Vite plugins, Sharp image service
- `wrangler.toml` — Cloudflare Workers deployment config
- `tsconfig.json` — path aliases, strict mode, React JSX config
- `dprint.json` — formatting rules for all file types
- `starwind.config.json` — component library config (tabs/table/tooltip versions)

**Content & navigation**:

- `src/data/course-structure.ts` — single source of truth for course hierarchy
- `src/utils/navigation.ts` — `resolveAutoNav`, `normalizeNavigation`, `flattenLessons` utilities
- `src/pages/notes/**` — lesson pages (Astro file-based routing)
- `src/components/navigation/LessonTree.tsx` — collapsible tree sidebar (localStorage persistence)

**Styling & theming**:

- `src/styles/theme/theme.css` — Tailwind v4 tokens via `@theme inline`
- `src/styles/theme/html-colors.css` — light/dark mode CSS variables
- `src/components/ui/theme/ThemeSwitcher.tsx` — theme toggle logic

**Shiki highlighting**:

- `src/lib/shiki/highlighter.ts` — main API (`highlightToHtml`)
- `src/lib/shiki/language-aliases.ts` — maps short names to bundled languages
- `src/lib/shiki/cache.ts` — singleton highlighter instance
- `config/shiki-warn-tracker.ts` — runtime patches for warning suppression

**Scripts & automation**:

- `generate-icons-index.js` — SVG → PascalCase TypeScript exports
- `package.json` scripts — dev/build/test/deploy workflows

### Common tasks

**Add a new lesson page**:

1. Create `src/pages/notes/[unit]/[topic]/index.astro`
2. Add entry to `src/data/course-structure.ts` in appropriate nested position
3. Use `resolveAutoNav(Astro.url.pathname, courseStructure)` in frontmatter for auto prev/next
4. Apply `normalizeNavigation` before rendering navigation buttons

**Add a new interactive component**:

1. Create `src/components/[category]/ComponentName.tsx` (React)
2. Use hooks as needed (`useState`, `useEffect`)
3. Import + hydrate in `.astro` file: `<ComponentName client:only="react" />`
4. Add tests in `src/components/[category]/__tests__/ComponentName.test.tsx`

**Update course structure**:

1. Edit `src/data/course-structure.ts` (add/remove/reorder lessons)
2. Dev server auto-reloads (watched by `dev-server-file-watcher`)
3. Check sidebar rendering (`LessonTree.tsx`) and prev/next navigation still work

**Troubleshoot build issues**:

- Check icon generation: ensure `pnpm generate-icons` runs without errors
- Verify Astro type-check: `pnpm astro check`
- Test local Cloudflare preview: `pnpm preview` (mimics production)
- Review Shiki warnings: if new, check `config/shiki-warn-tracker.ts` for suppression rules

### Need more detail?

Ask about specific areas: icon generation internals, Shiki transformer pipeline, course structure flattening algorithm, Tailwind v4 token system, React island hydration strategies, Cloudflare Workers routing, or testing patterns.
