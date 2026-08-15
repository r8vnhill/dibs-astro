# Phase 1 — Reframe the homepage around the online course

## Goal

Replace the roadmap-oriented homepage with a landing page that describes DIBS as a self-paced, online, university-level
course, answering in order: what DIBS is, what you'll learn, the reference architecture the site embodies, the
technology stack behind it, and how to start. Development status, unavailable routes, and roadmap terminology no longer
participate in the primary information architecture.

The originating specification (`Phase 1 — Reframe the homepage around the online course`, sub-phases 1.1–1.5) was
authored and filed under `astro-icons`' traceability log rather than this repository's; its content is entirely about
this site's homepage, README, and content guidelines, so it is treated here as the source spec for this entry rather
than duplicated verbatim.

## Scope

- `src/pages/index.astro`: rewritten into five sections (Hero, "¿Qué es DIBS?", Arquitectura de referencia, Stack
  tecnológico, Cómo seguir el curso). Removed: roadmap cards (Clases/Temario/Tareas as advertised destinations), "Curso
  y sitio en evolución" / "Proyecto en construcción" framing, and the redundant repo-links section (GitHub/ GitLab links
  already live in the shared header via `BaseLayout`).
- `src/pages/__tests__/index.render.test.ts`: rewritten as focused BDD assertions over `<main>` content only (the shared
  header's own nav — which still links `/lessons/`, `/syllabus/`, `/assignments/` — is explicitly out of scope per the
  source spec's non-goals, so assertions are scoped accordingly rather than asserting against the full page).
- `README.md`: project description now leads with DIBS as an online, university-level, self-paced course, with the site
  described as a reference implementation.
- `docs/content-guidelines.md` (new): canonical positioning phrase, development-status-out-of-navigation rule,
  unavailable-resource presentation rule, reference-architecture framing rule, terminology consistency rule.

Not touched: shared header/footer, `/notes/` content itself, global visual system, syllabus/bibliography routes (none
created).

## Acceptance criteria

- Exactly one `<h1>`; canonical badge "Curso online de nivel universitario" present; homepage copy never describes DIBS
  as a bare "curso universitario".
- `/notes/` is the only navigable course-journey destination from the homepage's own content; Temario and Bibliografía
  are non-interactive status chips with no `href`.
- No `/lessons/` or `/assignments/` link inside the homepage's own content (`<main>`).
- Presentation, Application, Domain, and Infrastructure are presented, with Domain marked as the conceptual core and the
  whole section framed as a reference architecture, not a universal prescription.
- Astro, Tailwind CSS, Markdoc, and React are represented without version numbers.
- Decorative icons are `aria-hidden`; all real links are plain, keyboard-reachable `<a>` elements; no JavaScript is
  required for primary navigation.
- `node scripts/run-astro-check.mjs` (0 errors), `vitest run --config vitest.astro.config.ts` (full suite), and
  `pnpm build` all pass; the built `dist/index.html` contains exactly one `<h1>`, an `href="/notes/"`, and no `<script>`
  inside `<main>`.

## Non-goals

- Creating `/syllabus/` or `/bibliography/` routes, or defining the full curriculum.
- Redesigning the shared header or footer, or extracting reusable homepage components.
- Changing the global visual system or the site's i18n mechanism (unrelated, separately in progress).
- A site-wide dead-link or WCAG audit.
