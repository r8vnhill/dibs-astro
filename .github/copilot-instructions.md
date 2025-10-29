## Copilot instructions for this repo (concise)

Purpose: get AI coding agents productive fast in this Astro + React static site deployed to Cloudflare Workers.

Highlights
- Output: fully static site (see `astro.config.ts`: `output: "static"`, `trailingSlash: "always"`).
- Tech: Astro v5 + React islands, Tailwind v4 (via `@tailwindcss/vite`), Markdoc, Shiki-based highlighting, Sharp image service.
- Deploy: Cloudflare Workers serves `./dist` (see `wrangler.toml` -> `assets.directory = "./dist"`).

Key developer commands (pnpm)
- pnpm dev — runs `generate-icons-index.js` then `astro dev` (HMR): used for local development.
- pnpm build — runs icon generator then `astro build` (output -> `dist/`).
- pnpm preview — build then `wrangler dev` to preview the built `dist/` via the Worker.
- pnpm deploy — runs `node generate-icons-index.js && astro check && astro build && wrangler deploy`.
- pnpm generate-icons — regenerate `src/assets/img/icons/index.ts` (do this after adding SVGs).

Formatting
- We use `dprint` to keep formatting consistent. Preferred commands:
  - Install globally with pnpm: `pnpm add -g dprint` then `dprint fmt`
  - Or run without global install: `pnpm dlx dprint fmt`
  - Consider adding a pre-commit hook to run `dprint fmt` on staged files.
  - Repo hooks: This repo uses Husky + lint-staged; commits will run `dprint` on staged files. Agents creating commits should either rely on the hook or run `pnpm dlx dprint fmt` before committing.

Project conventions and examples
- Path aliases (see `tsconfig.json`): `~/*` → `src/*`; also `$components/*`, `$styles/*`, `$utils/*`, `$assets/*`. Use them in imports.
  Example: import { LessonTree } from "$components/navigation/LessonTree";
- Icons: add SVGs to `src/assets/img/icons/` and run `pnpm generate-icons` (script runs this on dev/build). Do NOT edit `src/assets/img/icons/index.ts` by hand.
- Navigation: use `resolveAutoNav` / `normalizeNavigation` from `src/utils/navigation.ts` so hrefs always include trailing slashes.
  Example: `normalizeNavigation(next, previous)` ensures `/page/` form.
- React islands: author interactive pieces in `src/components/**.tsx` and hydrate within `.astro` using client directives (client:load / client:idle etc.).
- Styling: Tailwind tokens are used (e.g., `bg-base-background`, `border-base-border`). Prefer tokens over hard-coded colors. Dark theme uses a `.dark` class.

Integration & infra notes
- Dev HMR watcher: `config/integrations/dev-server-file-watcher.ts` watches config/assets/data for fast reloads — don't bypass it when making integration changes.
- Highlighting: site uses local Shiki helpers (see `src/lib/shiki/*`) rather than Astro built-in Shiki; watch `config/shiki-warn-tracker.ts` for warning suppression.

Gotchas / guardrails
- Trailing slashes matter for routing. Always normalize URLs to include a trailing slash.
- Static output: avoid introducing server-only runtime code — keep server-like logic out of client islands.
- Spanish-first: UI and content are primarily Spanish — follow existing copy when adding text.

Where to look first
- Config: `astro.config.ts`, `wrangler.toml`, `starwind.config.json`.
- Scripts/workflows: `package.json`, `generate-icons-index.js`.
- Nav & content: `src/data/course-structure.ts`, `src/utils/navigation.ts`, `src/pages/notes/**`, `src/components/navigation/*`.

If anything is missing or unclear, tell me which area to expand (icons, build, deploy, navigation, styling, or Shiki setup) and I’ll iterate.
