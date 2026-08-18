# Add a Nushell Comparative Lesson for Pipeline-Native Support Scripting

## Summary

Add a Nushell comparative lesson that revisits the existing Kotlin support-script problem from a substantially different
execution model: **structured values flowing through shell pipelines**.

The lesson should assume that students have already completed the Kotlin lesson. It should therefore avoid re-teaching
collections, filesystem paths, functions, argument validation, or reusable-script motivation. Instead, it should focus
on the design differences introduced when the shell itself provides structured values, typed command signatures,
data-oriented pipelines, and pipeline-aware script execution.

Two corrections should be made to the current plan before implementation:

- **Reuse the existing `NushellLink` rather than creating another specialization.** The component already exists and is
  exported through the links barrel.
- Use `support-scripts/nushell.astro`, not `nu.astro`. `NushellLink` currently resolves comparative routes using the
  `nushell` suffix, and the repository's existing Nushell comparative lessons use `nushell.astro`.

The resulting navigation becomes:

```text
support-scripts/
├── index.astro       # Kotlin base lesson
├── py.astro          # existing Python comparison
└── nushell.astro     # new structured-shell comparison
```

The base lesson should retain its existing Python comparison and add Nushell alongside it in `LinksLayout`. The base
page already uses `LinksLayout` for comparative ecosystems.

This is a focused change, so implement it directly as short Red-Green-Refactor cycles rather than introducing milestones
or phases, following the project's planning and TDD guidance.

---

## Pedagogical contract

The lesson should begin from a question such as:

> **¿Qué cambia si el script no solo se ejecuta desde un shell, sino que el propio shell trabaja con datos
> estructurados?**

The comparison should preserve the **problem** from the Kotlin lesson while deliberately changing the **computational
model**.

The original lesson establishes a small operational contract: receive a project directory, inspect expected paths, and
communicate the result. The Nushell lesson should preserve that scenario long enough for students to recognize it, then
extend it into capabilities that expose why Nushell is not merely terser syntax for the same program.

### Core contrasts

The lesson should center on four progressively stronger contrasts.

**1. Filesystem commands already produce structured values.** Nushell's internal commands work with values such as
records, lists, and tables rather than requiring students to interpret their presentation as text. Its documentation
explicitly describes structured data as a defining feature of the language. ([Nushell][1])

The lesson should therefore move quickly from:

```text
filesystem → inspect path → print result
```

to:

```text
filesystem → records → filter/select → result
```

This is more instructive than translating the Kotlin filesystem loop statement by statement.

**2. Pipelines transform values while preserving structure.** Nu pipelines can carry structured values between internal
commands; filtering or selecting fields does not require serializing them to text first. External processes remain an
important boundary: their stdout enters Nushell as text or binary data unless explicitly converted. ([Nushell][2])

That boundary should be taught explicitly so the lesson does not accidentally imply that _every_ process in a Nushell
pipeline exchanges arbitrary structured objects.

**3. Common serialized formats become structured values at the shell boundary.** `open` can load formats such as JSON,
NUON, TOML, YAML, CSV, SQLite, spreadsheets, and XML into Nu values. ([Nushell][3])

Use this to extend the support-script problem from checking only whether `album.nuon` exists to inspecting its contents.

**4. A Nushell script can itself become a pipeline stage.** This is the strongest comparison and should be the lesson's
culmination. Nushell 0.114 introduced `run`, which lets a `.nu` script receive pipeline input, transform it, and return
a value that continues through the pipeline. ([Nushell][4])

This provides a concrete answer to the requested “what can the other language do that the original cannot?” question:

> **Un script de Nushell puede integrarse nativamente como una etapa de un pipeline estructurado de Nushell. Un programa
> Kotlin puede implementar protocolos o abstracciones equivalentes, pero ese modelo no forma parte de la composición
> estándar de procesos de Kotlin.**

Avoid claiming that Kotlin is computationally incapable of performing the same transformations. The distinction is
**native composition semantics**, not computational expressiveness.

---

# TDD Cycle 1 — Establish the comparative route and UI contract

## Goal

Make the Nushell comparison discoverable from the existing support-scripts lesson while preserving the current
language-link architecture.

## Scope

Modify:

```text
src/pages/notes/scripting/support-scripts/index.astro
src/pages/notes/scripting/support-scripts/__tests__/support-scripts.render.test.ts
src/components/ui/code/index.ts
```

Create:

```text
src/pages/notes/scripting/support-scripts/nushell.astro
```

Reuse without redesigning:

```text
src/components/ui/links/NushellLink.astro
src/components/ui/links/LangLink.astro
src/components/ui/links/helpers.ts
src/components/ui/code/nushell/NushellBlock.astro
src/components/ui/code/nushell/NushellInline.astro
```

`NushellLink` already encapsulates the language name, icon, and `nushell` route suffix. Likewise, `NushellBlock` already
exists, although it is not currently exported from the code component barrel.

### Red

Extend the existing render suite with BDD-style behavior such as:

```text
given the Kotlin support-scripts lesson
when it is rendered
then it exposes both Python and Nushell comparative lessons
```

and:

```text
given the Nushell comparative lesson
when it is rendered
then it identifies itself as a comparison with the previously studied support-script problem
```

Assert structurally that:

- the base lesson contains a link to `/notes/scripting/support-scripts/nushell/`;
- the existing Python link remains present;
- the Nushell page renders successfully;
- the new lesson exposes its expected title and key conceptual markers.

Do not overfit tests to entire prose paragraphs.

### Green

- Import `NushellLink` in `index.astro`.
- Add `<NushellLink />` beside the existing `<PythonLink />` within `LinksLayout`.
- Create the minimum valid `nushell.astro`.
- Export the existing `NushellBlock` from `~/components/ui/code` so the new lesson can use the public component surface
  rather than a deep import.

The barrel already documents that language-specific wrappers belong in this public surface, so exporting the existing
component improves consistency without introducing a new abstraction.

### Refactor

Keep:

- route resolution in `resolveLanguageHref`;
- language-specific metadata in `NushellLink`;
- syntax highlighting/icon configuration in `NushellBlock`;
- lesson-specific content in `nushell.astro`.

Do not add route-building logic or language-specific presentation to the lesson page.

### Acceptance criteria

- `/notes/scripting/support-scripts/` exposes both Python and Nushell comparisons;
- the Nushell link resolves to `/notes/scripting/support-scripts/nushell/`;
- `NushellLink` remains the only Nushell-specific link wrapper;
- `NushellBlock` is available from the normal code-component barrel;
- existing support-script render tests remain green.

---

# TDD Cycle 2 — Revisit the support-script contract through structured values

## Goal

Teach students how the same support-script responsibility changes when filesystem information is already represented as
structured data.

## Scope

Implement the first substantive portion of:

```text
src/pages/notes/scripting/support-scripts/nushell.astro
```

Use only Nushell source examples. Shell invocation/output snippets are acceptable, but **do not reproduce Kotlin source
code**.

### Red

Add semantic render expectations for:

- Nushell;
- structured values;
- records or tables;
- pipelines;
- filesystem inspection;
- an Iron Maiden-inspired project fixture.

Also assert the absence of representative Kotlin source fragments already present in the base lesson, such as:

```text
fun checkPath
args.isNotEmpty()
Path.of(
Files.exists(
```

The purpose is to protect the comparative contract, not to ban the word “Kotlin” from prose.

### Green

Build the lesson around one coherent fixture:

```text
powerslave/
├── README.md
├── LICENSE
├── CODE_OF_CONDUCT.md
└── album.nuon
```

Use Iron Maiden references for domain data while keeping operational names such as `project_root`, `expected_paths`, and
`missing_paths` technically descriptive.

A good progression is:

### `El mismo contrato, otro modelo de ejecución`

Briefly recover the known problem.

Do **not** explain again:

- what a reusable support script is;
- why arguments are useful;
- what lists are;
- why paths deserve an explicit representation;
- why repeated behavior may deserve a named abstraction.

Instead establish:

> **El objetivo no cambia; cambia qué tipo de valores entrega el entorno y cómo podemos componer las operaciones sobre
> ellos.**

### `El sistema de archivos ya produce datos`

Start with filesystem inspection and immediately expose that the result contains named fields.

For example, students should manipulate fields such as:

```text
name
type
size
modified
```

rather than parse an `ls` display. This corresponds directly to Nushell's documented structured-data model.
([Nushell][5])

### `Filtrar antes de imprimir`

Introduce a pipeline that progressively narrows the structured value:

```text
source
| filter
| select
| result
```

The important concept is that presentation occurs **after** computation.

Explicitly distinguish:

```text
datos estructurados ≠ tabla dibujada en la terminal
```

The existing DIBS Nushell material already makes this distinction: tabular rendering is a presentation of structured
records, not necessarily a distinct underlying data representation.

### Refactor

Prefer short transformations and named custom commands when they communicate intent better than a long pipeline.

Avoid turning the lesson into a general Nushell syntax tutorial. Explain syntax only when it reveals a design difference
relevant to support scripting.

### Acceptance criteria

- no Kotlin code appears on the comparative page;
- the first example solves recognizably the same operational problem as the base lesson;
- the explanation centers on structured values rather than shorter syntax;
- at least one example filters filesystem-derived records without parsing textual command output;
- Iron Maiden references provide example data without replacing technical terminology.

---

# TDD Cycle 3 — Move from file presence to structured project metadata

## Goal

Show that a support script can inspect both project structure and domain metadata without adding a parser dependency or
introducing a separate application layer.

## Scope

Extend the same `powerslave/` fixture:

```text
powerslave/
├── README.md
├── LICENSE
├── CODE_OF_CONDUCT.md
└── album.nuon
```

Model `album.nuon` with a small record containing information such as:

```text
title
year
tracks
```

and tracks with fields such as:

```text
title
duration
```

Use examples inspired by Iron Maiden, but do not turn the lesson into an exercise about the band.

Nushell can load NUON and numerous other supported formats directly into structured values. ([Nushell][3])

### Red

Add expectations that the lesson covers:

- `open`;
- NUON;
- records;
- nested data;
- filtering structured metadata.

### Green

Progress from:

```text
¿existe album.nuon?
```

to a richer question such as:

```text
¿qué canciones duran más de siete minutos?
```

The important transformation is conceptual:

```text
path
→ open
→ record
→ tracks
→ filter
→ selected records
```

rather than:

```text
path
→ read text
→ choose parser
→ deserialize
→ define application model
→ inspect data
```

The comparison should say that Kotlin can certainly perform the latter operation, but it requires choosing and invoking
an appropriate serialization implementation; Nushell treats common data formats as part of its ordinary data-oriented
shell workflow. ([Nushell][3])

### Refactor

Keep the metadata example small enough that the structured-pipeline idea remains visible.

Do not introduce:

- schema validation;
- a large album domain model;
- databases;
- plugins;
- custom serialization infrastructure.

Those would obscure the intended contrast.

### Acceptance criteria

- `album.nuon` is loaded as structured data;
- at least one nested field is traversed;
- at least one query filters records by a typed value such as duration or year;
- no manual text parsing is introduced;
- the lesson explicitly distinguishes convenience/native integration from computational capability.

---

# TDD Cycle 4 — Make the script itself pipeline-native

## Goal

End with the strongest difference from the original Kotlin script: the support script itself becomes a composable stage
in a structured Nushell pipeline.

This cycle adds more pedagogical value than ending merely with `open`, because Nushell 0.114 introduced `run`
specifically so scripts can receive pipeline input, transform it, and send the result onward. ([Nushell][4]) The latest
stable release currently listed by the Nushell project is 0.114.1, released July 11, 2026. ([Nushell][6])

## Scope

Target **Nushell 0.114.1** for the lesson examples and document `0.114+` as the minimum version for examples relying on
`run`.

Keep this version-specific behavior localized to the final section.

### Red

Add an expectation that the rendered lesson includes:

- `run`;
- pipeline input;
- structured output;
- a composition after the script invocation.

### Green

Extract the example into a small `.nu` support script and demonstrate an invocation conceptually equivalent to:

```text
structured input
| run check-library-layout.nu
| further transformation
```

The exact Iron Maiden-inspired scenario can use a list of project paths or album metadata as input and return records
such as:

```text
project
complete
missing
```

The critical property is that subsequent Nushell commands operate on those fields directly.

Nushell documents `run` as allowing a script to behave as a pipeline stage, including scripts with a `main` entry point.
([Nushell][4])

### Explicit comparison

This section should contain the lesson's key comparative statement:

> **Aquí aparece una diferencia que no es solo sintáctica. El script de Nushell puede formar parte directamente de un
> pipeline de valores estructurados: recibe un valor, produce otro y el siguiente comando continúa trabajando con su
> estructura. Un programa Kotlin puede implementar una interfaz o protocolo equivalente, pero este modelo de composición
> no forma parte de su mecanismo habitual de ejecución como proceso.**

Follow it immediately with the boundary case:

> **Esto tampoco significa que cualquier programa externo preserve automáticamente esos valores. Al cruzar hacia un
> proceso externo, volvemos a una frontera de texto o bytes y debemos decidir cómo representar los datos.**

That qualification is important: Nushell's documentation explicitly distinguishes its internal structured pipelines from
external command stdout, which enters as text/binary data. ([Nushell][2])

### Refactor

Keep the final script small and pipeline-oriented. Avoid adding a framework or plugin.

### Acceptance criteria

- the lesson demonstrates a `.nu` script participating between two pipeline stages;
- its result remains structured and can be filtered or selected afterward;
- the comparison does not claim Kotlin is incapable of equivalent computation;
- the internal/external process boundary is explained accurately;
- examples target Nushell 0.114+ explicitly.

---

# TDD Cycle 5 — Add references and final pedagogical assurance

## Goal

Ensure the lesson's language-specific claims remain verifiable and the page fits the site's existing documentation
infrastructure.

## Scope

Review:

```text
src/pages/notes/scripting/support-scripts/nushell.astro
src/pages/notes/scripting/support-scripts/__tests__/support-scripts.render.test.ts
```

and the project's reference catalog.

### Red

Require the lesson to expose the final conceptual progression:

```text
structured filesystem data
→ structured transformations
→ structured file formats
→ pipeline-native script
→ external-process boundary
```

### Green

Use `ReferencesFromCatalog` for authoritative Nushell material covering at minimum:

- structured data and data types;
- pipelines;
- loading structured formats;
- `run` / the relevant 0.114 documentation.

Prefer primary Nushell documentation and release notes. Nushell describes its core goal as combining a shell with a
programming language around modern pipeline-based workflows. ([Nushell][7])

### Refactor

Remove duplicated explanations and any section that merely teaches syntax already obvious from the example.

The final lesson should read as a **design comparison**, not “Introduction to Nushell.”

### Acceptance criteria

- language-specific claims have primary references;
- the page uses existing DIBS semantic/layout components;
- tests describe concepts and navigation rather than exact paragraphs;
- formatting, linting, type checking, and the normal Astro build remain green;
- no new runtime dependency is added to the website.

---

## Proposed lesson structure

The final lesson should follow approximately this progression:

> **El mismo contrato, otro modelo de ejecución** → **El sistema de archivos ya produce datos** → **Filtrar sin
> convertir todo en texto** → **Abrir datos estructurados directamente** → **Un script también puede ser una etapa del
> pipeline** → **Dónde se pierde la estructura** → **Qué ofrece Nushell nativamente que Kotlin no ofrece como modelo de
> ejecución** → **Conclusiones**

This sequence is stronger than the original proposal because each section introduces a progressively more consequential
difference. The lesson starts with a familiar task but ends with a genuinely different composition model.

## Non-goals

Keep the change intentionally scoped. Do not:

- replace or remove the existing Python comparison;
- introduce another `NushellLink`;
- rename the established `nushell` route family to `nu`;
- teach Nushell from first principles;
- reproduce Kotlin source code;
- claim Nushell has computational capabilities unavailable to Kotlin;
- teach traditional text-processing shell pipelines in depth;
- introduce Nushell plugins, Polars, databases, or HTTP commands;
- turn NUON into a serialization-format lesson;
- redesign the site's comparative-lesson architecture;
- migrate deprecated Nushell lessons as part of this work.

## Suggested execution order

**Cycle 1 → Cycle 2 → Cycle 3 → Cycle 4 → Cycle 5.**

The minimum useful vertical slice is **Cycles 1–2**: a discoverable comparative lesson showing structured filesystem
pipelines.

**Cycle 3** establishes the value of data-aware scripting beyond filesystem checks.

**Cycle 4 is the pedagogical payoff** and should be considered required rather than optional: the new `run` capability
gives the lesson a particularly current and concrete example of Nushell's pipeline-native execution model. Nushell 0.114
also strengthened type checking and runtime annotation enforcement, so targeting the current 0.114.x generation keeps
the lesson aligned with the language's modern semantics rather than older examples from the deprecated material.
([Nushell][4])

Overall, I would make **Cycle 4 the conceptual destination of the lesson**. “Nushell opens JSON/NUON conveniently” is
useful; “a reusable script can itself compose as a structured pipeline stage” is the comparison that most clearly
justifies dedicating a separate DIBS lesson to Nushell.

[1]: https://www.nushell.sh/book/nu_fundamentals.html?utm_source=chatgpt.com "Nu Fundamentals"
[2]: https://www.nushell.sh/book/pipelines.html?utm_source=chatgpt.com "Pipelines"
[3]: https://www.nushell.sh/book/loading_data.html?utm_source=chatgpt.com "Loading Data"
[4]: https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html "Nushell 0.114.0 | Nushell"
[5]: https://www.nushell.sh/?utm_source=chatgpt.com "Nushell"
[6]: https://www.nushell.sh/blog/ "Nu Blog | Nushell"
[7]: https://www.nushell.sh/book/?utm_source=chatgpt.com "Introduction"
