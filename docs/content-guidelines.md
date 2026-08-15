# Content guidelines

Stable editorial rules for how DIBS presents itself across learner-facing pages. This document holds rules, not
page-specific copy; it should stay accurate even as individual pages (like the homepage) evolve.

## Canonical positioning

DIBS is presented as:

> **"curso online de nivel universitario"**

"Curso universitario" must not be used alone to characterize DIBS. The distinction matters: **university-level**
describes the depth of the material, while **a university course** implies formal enrollment or delivery by an
institution. DIBS is self-paced and autonomous, so copy should always attach the "de nivel universitario" qualifier
rather than let "curso universitario" stand on its own.

## Development status stays out of primary navigation

Learner-facing primary navigation and information architecture (the homepage, section headings, CTAs) describe the
**course**, not the **website's** implementation progress. Roadmap or work-in-progress framing ("en construcción", "en
evolución", "próximamente" describing the _site_ rather than a _course resource_) does not belong in that surface. It is
fine elsewhere (issue trackers, traceability logs, internal docs) — just not in what a learner reads to understand the
course.

## Unavailable resources are never presented as navigation

If a destination doesn't exist yet (no route, no published content), it must not look interactive: no `href`, no click
handler, no disabled `<button>`. Represent it as status text, e.g.:

```html
<span aria-label="Temario, próximamente">
    Temario · Próximamente
</span>
```

"Próximamente" is reserved for a specific future **course resource** (a syllabus, a bibliography), not for the site
itself.

## Reference architectures are contextual, not universal rules

When learner-facing content describes the site's own architecture (layers, patterns), frame it as one example, not a
prescription every library must follow. Prefer:

> "El sitio DIBS usa esta organización como arquitectura de referencia."

over:

> "Las bibliotecas deben usar estas cuatro capas."

## Consistent terminology

Learner-facing Spanish terminology should stay consistent across pages — the same course concept should read the same
way wherever it appears (e.g. "Apuntes" always means the notes surface, not "Clases" or "Lecciones" used interchangeably
for the same thing).
