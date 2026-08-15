# [DONE] Research-grounded revision of the Nushell comparative lesson

## Completion Summary

Implemented all six TDD cycles from this plan against `astro-website`.

**Cycle 1 — bibliography and readings.** Added `person:michael-greenberg`, `person:malte-sippel`,
`person:horst-schirmeier`, and `person:jan-sorva` to `src/data/bibliography/sources/01-persons.ttl`
(`person:konstantinos-kallas` and `person:nikos-vasilakis` already existed and were reused). Added `work:hotos-2021`,
`work:plos-2023`, and `work:acm-toce` to `04-works.ttl`, and `ref:greenberg-unix-shell-next-50-years-2021`,
`ref:sippel-process-composition-typed-unix-pipes-2023`, and `ref:sorva-notional-machines-2013` to `05-references.ttl`,
following the `handa`/`bloch` `isPartOf` + `publisher org:acm` pattern. Added `supportScriptsNushellReadings` to
`src/data/readings/lesson-readings.ts` with real Spanish `why`/`focus`/`afterReading`/`guidingQuestion` copy for all 7
entries (essential: Greenberg et al. 2021, Sippel & Schirmeier 2023, Nushell Pipelines; practice: Nushell Loading Data,
Nushell 0.114.0 blog; deeper: Handa et al. 2021, Sorva 2013), wired through `getSupportScriptsNushellReadings()` in
`LessonReadingsAdapter.ts` and re-exported from `presentation/adapters/lesson-readings.ts`. Created the per-lesson
readings page `src/pages/readings/scripting/support-scripts/nushell/index.astro` mirroring the `what-is` pattern.
Regenerated the bibliography catalog with `pnpm generate:bibliography-catalog`.

**Cycles 2-6 — lesson rewrite.** Rewrote `src/pages/notes/scripting/support-scripts/nushell.astro`: added "Del pipe de
Unix al pipeline estructurado" (Unix lineage, Greenberg citation) and "Un modelo mental para esta lección" (two
notional-machine `OutputBlock` diagrams, Sorva citation as pedagogical rationale only) before syntax-heavy examples;
moved the external-process warning out of the early `ls` section; added "El pipeline también tiene contratos de tipo"
with a type-compatible (`open album.json | album-title`) and an incompatible (`"Powerslave" | album-title`) composition,
citing Sippel & Schirmeier; replaced the `album.nuon` fixture with `album.json` (via the existing `JsonBlock` component,
not `NushellBlock`, since the content is JSON not Nu syntax), corrected the "ya no exige elegir un formato" sentence,
and added a "¿Y NUON?" note; reordered so `run` follows the type-contracts section as the explicit culmination; merged
"Dónde se pierde la estructura" and "Qué ofrece Nushell nativamente..." into one closing section with the plan's exact
closing paragraph; rewrote the conclusions around the three required claims plus the "composición → representación →
contratos de tipo → frontera de proceso" chain, and added "Continúa explorando" linking via `lessonReadingsRoute`. No
Kotlin code was introduced.

**Tests.** Extended `src/presentation/adapters/__tests__/lesson-readings.test.ts` for the new lesson and
`publishedReadings.length === 2`; added
`src/pages/readings/scripting/support-scripts/nushell/__tests__/index.render.test.ts`; added
`src/pages/notes/scripting/support-scripts/__tests__/nushell.render.test.ts` (9 tests covering the Cycle 2-6 conceptual
markers, citations, type-contract example, `album.json` fixture, `run` culmination ordering, the mixed-pipeline
distinction, the closing conceptual chain, the readings link, and absence of Kotlin code); updated the pre-existing
`src/pages/notes/scripting/support-scripts/__tests__/support-scripts.render.test.ts`, which still asserted
`open album.nuon`, to assert `open album.json` instead. All new/existing tests use `test`/`suite`/`describe`, never
`it`.

**Verification.** `pnpm run generate:bibliography-catalog` succeeded. `node vitest run` (full `test:unit`): 89 files /
1409 tests passed. `node vitest run --config vitest.astro.config.ts` (`test:astro`): 41 files / 325 tests passed.
`pnpm run check` (toolchain, i18n, workspace packages, bibliography regeneration, `astro check`, lesson-metadata
dry-run, `check:architecture`) completed with 0 errors, 0 warnings, 15 pre-existing hints unrelated to this change, and
no layer-boundary findings.

**Deviations from the plan.**

- The plan's Cycle 1 scope list did not mention creating a `src/pages/readings/**` page, but the
  `readings/software-libraries/what-is/index.astro` pattern this plan explicitly says to mirror requires one (there is
  no dynamic `/readings/[...slug]` route in this repo), so
  `src/pages/readings/scripting/support-scripts/nushell/index.astro` was added to make `lessonReadingsRoute` resolve to
  a real page, consistent with the established per-lesson pattern.
- No repo-wide "every published lesson reading resolves against the catalog" contract test exists; each per-lesson
  readings page throws at render time via `resolveLessonReadings` if resolution fails (the same mechanism `what-is`
  relies on), and the new readings page's render test exercises that path for this lesson.
- `dprint`/`astro check` reformatted the rewritten `nushell.astro` (attribute wrapping only) during `pnpm check`;
  content was not altered, and all render tests were re-run afterward to confirm.

## Summary

Revise `support-scripts/nushell.astro` so the lesson is not only a Kotlin-to-Nushell comparison, but a compact
introduction to a broader design idea: **how the representation carried between composable commands changes what a shell
can express naturally**.

The current draft already has a strong progression—structured `ls` output, transformations over records, `open`, `run`,
and the external-process boundary—and correctly avoids claiming that Kotlin lacks the computational ability to perform
the same work. The research suggests strengthening that progression in four places:

1. place Nushell in the historical lineage of Unix pipelines rather than presenting structured pipelines as an isolated
   Nushell idea;
2. make the **execution model/notional machine** explicit;
3. elevate **pipeline input/output types** to a first-class concept, especially because Nushell 0.114 materially
   strengthened type inference and checking;
4. replace NUON as the main persisted example with **JSON**, using NUON only as a Nushell-native contrast, so the lesson
   does not accidentally equate shell convenience with an interoperable data contract.

The work remains focused enough for direct Red-Green-Refactor cycles, as required by the project guidelines.

## Research findings that should change the lesson

### 1. Nushell extends the Unix pipeline model; it does not originate it

Research on modern shell programming characterizes two enduring strengths of the Unix shell as **universal
composition**—combining independently implemented programs—and **stream processing** through pipelines. Greenberg,
Kallas, and Vasilakis argue that these properties remain central to why shell programming is useful despite the
language's well-known semantic and tooling limitations. ([ACM Digital Library][1])

This suggests adding a short historical bridge rather than beginning directly with "`ls` returns records":

> **Del pipe de Unix al pipeline estructurado**

The conceptual progression should become:

```text
Unix:
programa → bytes/texto → programa

Nushell, entre comandos internos:
comando → valores estructurados → comando
```

The lesson should explicitly say that **the compositional idea is inherited; what changes is the representation being
composed**.

This distinction also prevents an unintended novelty claim. PowerShell is another established example of a shell whose
internal pipeline carries structured objects rather than only textual streams. Microsoft's documentation explicitly
describes objects being passed from command to command. ([Microsoft Learn][2]) Nushell should therefore be presented as
one modern point in a larger design space, not as the inventor of structured pipelines.

### 2. The text/byte boundary is not just inconvenient; it weakens composition contracts

Sippel and Schirmeier motivate **typed Unix pipes** precisely from limitations of traditional byte-stream composition:
byte streams do not intrinsically communicate what type or representation a downstream program should expect, so
compatible composition may depend on serialization, parsing, and conventions outside the pipe itself.
([ACM Digital Library][3])

That gives the current section **“Dónde se pierde la estructura”** a much stronger theoretical basis. It should become
more than a Nushell implementation detail: it is the point at which the pipeline crosses from a richer in-runtime
contract back to the conventional process interface.

Nushell's own documentation confirms the exact mechanics:

- internal Nu commands exchange Nu values;
- internal → external converts input for the external process's stdin;
- external → internal arrives as bytes and is treated as text when UTF-8 decoding succeeds;
- external → external behaves like a conventional shell pipeline. ([Nushell][4])

This is one of the lesson's most valuable comparative ideas and should move closer to the center of the narrative.

### 3. Students should be shown an explicit notional machine

Sorva's work on notional machines argues that understanding the abstract execution model of a programming system is
itself an important learning objective and that runtime dynamics are a major source of difficulty for learners.
([ACM Digital Library][5])

The draft currently explains the difference verbally, but students would benefit from one explicit model before seeing
progressively richer examples:

```text
Pipeline interno de Nushell

Value
  ↓
command A
  ↓
Value
  ↓
command B
  ↓
Value
```

followed later by:

```text
Pipeline mixto

Nu Value
  ↓
serialización
  ↓
stdin / stdout
  ↓
proceso externo
  ↓
bytes / texto
  ↓
parseo explícito
  ↓
Nu Value
```

For Markdown documents the project would normally favor Mermaid, but inside this Astro lesson I would use the site's
existing diagram/semantic components if available; otherwise a compact rendered flow is enough. The important part is
that the model is explicit, not merely decorative.

### 4. Nushell 0.114 makes type contracts substantially more pedagogically important

The current draft already uses:

```nu
def main []: record -> record
```

but treats the signature mostly as descriptive syntax.

That undersells current Nushell. Version 0.114 strengthened parse-time type inference, types `$in` from the surrounding
pipeline, propagates inferred output types through pipelines, and uses command input/output signatures when checking
command bodies. Runtime annotation checking is also enabled by default. ([Nushell][6])

The lesson should therefore add a short section:

> **El pipeline también tiene contratos de tipo**

It can contrast two ideas without any Kotlin code:

```nu
def album-title []: record -> string {
    get title
}
```

versus an incompatible composition that Nushell can diagnose before ordinary execution.

The pedagogical point is not “Nushell is statically typed like Kotlin.” It is:

> Pipeline stages can expose **input/output compatibility information**, so composition has a richer contract than
> merely “these two processes both have stdin/stdout.”

That connects especially well to the typed-pipe research. ([ACM Digital Library][3])

### 5. `run` should be taught as the culmination of that model

Nushell 0.114 introduced `run`, allowing a `.nu` script to receive pipeline input, transform it, and return its result
to the surrounding pipeline. Scripts invoked this way run in their own scope. ([Nushell][6])

This makes the current `run` section conceptually stronger if it follows the type-contract section:

```text
structured values
→ typed pipeline contracts
→ reusable script
→ reusable script as pipeline stage
```

The current stable Nushell release is **0.114.1**, published July 11, 2026, so the lesson should target 0.114.1 while
noting that `run` requires 0.114+. ([GitHub][7])

### 6. Use JSON as the persisted example; treat NUON as a Nushell-native alternative

The current lesson says that querying `album.nuon` “no longer requires choosing a format,” but a format has in fact
already been chosen. That wording should be corrected.

Nushell's `open` recognizes formats such as JSON, NUON, TOML, YAML, CSV, SQLite, and spreadsheets and converts supported
representations into structured values. NUON is a Nushell-oriented notation and is described by Nushell as a superset of
JSON, with some limitations relative to Nushell's complete value model. ([Nushell][8])

For DIBS, **JSON is the better primary fixture** because it keeps the persisted representation language-neutral and
makes the distinction between:

```text
wire/storage representation
        ↓
Nushell value model
```

visible. That is also better aligned with the project guideline to separate representations and value interoperability
across language boundaries.

Use:

```text
powerslave/
├── README.md
├── LICENSE
├── CODE_OF_CONDUCT.md
└── album.json
```

and later add a small note:

> **¿Y NUON?**

explaining that NUON is convenient when the data is Nushell-owned, while JSON is more suitable here because the same
support artifact could later be consumed by Kotlin, Python, JavaScript, or another tool.

---

# TDD Cycle 1 — Integrate the research corpus into the bibliography and readings model

## Goal

Every substantial theoretical or language-specific claim in the lesson can be traced from an inline APA-style citation
to a catalog-backed reading/reference page.

## Scope

Update the canonical bibliography sources rather than generated JSON-LD:

```text
src/data/bibliography/sources/01-persons.ttl
src/data/bibliography/sources/04-works.ttl
src/data/bibliography/sources/05-references.ttl
src/data/bibliography/sources/06-usages.ttl
```

as needed, plus:

```text
src/data/readings/lesson-readings.ts
src/presentation/adapters/lesson-readings.ts
src/infrastructure/adapters/LessonReadingsAdapter.ts
src/pages/notes/scripting/support-scripts/nushell.astro
```

The repository explicitly defines Turtle as the canonical bibliography source and requires generated catalog artifacts
to be regenerated rather than edited manually.

Reuse existing catalog entries where possible. The catalog already contains `nushell-pipelines`, `nushell-loading-data`,
`nushell-v0-114-0-blog`, `handa-order-aware-dataflow-pipelines-2021`, and the classic Unix programming-environment
reference.

Add scholarly references for:

- `greenberg-unix-shell-next-50-years-2021`
- `sippel-process-composition-typed-unix-pipes-2023`
- `sorva-notional-machines-2013`

### Red

Add catalog/readings tests that require:

- every configured lesson reading to resolve to exactly one bibliography record;
- the Nushell support-script lesson to have a canonical lesson node;
- inline `ReferenceCitation` IDs to resolve through its readings configuration;
- duplicate or missing reference IDs to remain build-time errors.

### Green

Follow the citation pattern already used by `software-libraries/what-is/index.astro`:

```astro
const supportScriptsNushellReadings = getSupportScriptsNushellReadings();

const citationContext = {
    readingsPath: lessonReadingsRoute(supportScriptsNushellReadings.lessonPath),
} as const;
```

and inline citations such as:

```astro
<ReferenceCitation {...citationContext} referenceId="greenberg-unix-shell-next-50-years-2021">
    Greenberg et al. (2021)
</ReferenceCitation>
```

This directly matches the project's established pattern.

Regenerate the catalog with the existing bibliography generator; do not hand-edit generated artifacts.

### Refactor

Remove the currently unused `ReferencesFromCatalog` import if the final page uses `ReferenceCitation` plus the
lesson-readings route instead.

### Acceptance criteria

- all new scholarly references resolve from canonical Turtle;
- inline citations link to the lesson's readings route;
- APA metadata is rendered through existing bibliography infrastructure;
- generated bibliography artifacts are deterministic and committed;
- no bespoke citation formatting is introduced.

### Recommended reading roles

**Essential:** Greenberg et al. (2021), Sippel and Schirmeier (2023), Nushell Pipelines.

**Practice/reference:** Nushell Loading Data, Nushell 0.114.0 release notes.

**Deeper reading:** Handa et al. (2021), Sorva (2013).

---

# TDD Cycle 2 — Reframe the lesson around the evolution of pipeline composition

## Goal

Students understand _what changed_ from conventional pipeline composition to Nushell before encountering language
syntax.

## Red

Add render-level assertions for the conceptual markers:

- Unix pipeline;
- bytes/text;
- structured values;
- execution model;
- at least one Greenberg citation;
- at least one Sippel–Schirmeier citation.

Do not assert whole paragraphs.

## Green

Restructure the beginning to:

> **El mismo contrato, otro modelo de ejecución** → **Del pipe de Unix al pipeline estructurado** → **Un modelo mental
> para esta lección** → **El sistema de archivos ya produce datos**

Add the historical claim with an APA-style citation to Greenberg et al. (2021), then explain the byte-stream limitation
with Sippel and Schirmeier (2023).

Add the two compact notional-machine flows and cite Sorva (2013) only for the pedagogical rationale—not as evidence
about Nushell itself.

Retain the `powerslave/` fixture and the current Iron Maiden-inspired data.

### Refactor

Move the external-process warning out of the early `ls` section. Introduce the distinction once in the model, then
develop it fully later. The current lesson repeats this boundary in several places.

### Acceptance criteria

- Nushell is framed as an evolution of pipeline composition, not the origin of pipelines;
- structured pipelines are not presented as unique to Nushell;
- the execution model is visible before syntax-heavy examples;
- there is still no Kotlin code in the comparative lesson.

---

# TDD Cycle 3 — Teach pipeline type contracts explicitly

## Goal

Students recognize that Nushell pipelines carry not only structured values but also **input/output compatibility
information** between internal commands.

## Red

Add an executable or render fixture showing a type-compatible composition and an incompatible one.

The behavior should be described in BDD terms, for example:

```text
given a command whose pipeline input is a record
when a string is connected to that command
then Nushell reports the incompatible pipeline type before normal execution
```

## Green

Insert:

> **El pipeline también tiene contratos de tipo**

Use `help`, command signatures, and a small custom command around the Iron Maiden fixture.

For example, the lesson may progress from:

```nu
def album-title []: record -> string {
    get title
}
```

to a composition whose incoming type does not satisfy the signature.

Explain that Nushell exposes input/output types in command help and that 0.114 improved propagation and parse-time
checking through pipeline expressions. ([Nushell][4])

### Refactor

Move the explanation of:

```nu
def main []: record -> record
```

from the later `run` section into this conceptual foundation. Then the `run` section can focus on **reuse and
composition**, not simultaneously introduce signatures, `$in`, and script execution.

### Acceptance criteria

- students see one successful and one incompatible typed composition;
- the lesson does not characterize Nushell as having Kotlin's type system;
- internal type contracts are explicitly distinguished from external-process stdin/stdout;
- examples target 0.114.1 semantics.

---

# TDD Cycle 4 — Make representation boundaries and interoperability explicit

## Goal

Students distinguish the persisted/wire representation from Nushell's internal data model.

## Red

Update lesson tests to require:

- `album.json`;
- `open album.json`;
- a nested structured query;
- an explicit statement that the file representation and Nushell value are different layers.

## Green

Replace the main `album.nuon` fixture with `album.json` while keeping the Iron Maiden-inspired album/track data.

The teaching sequence becomes:

```text
album.json
    ↓ open
JSON representation is parsed
    ↓
Nushell record/list values
    ↓
get / where / select
```

Replace the inaccurate sentence that no format needs to be chosen with something like:

> **Una vez que elegimos un formato que Nushell reconoce, `open` integra el paso de decodificación al flujo normal del
> shell.**

Nushell documents that `open` recognizes the extension and invokes the corresponding `from ...` converter; unknown
textual formats remain strings and need explicit parsing. ([Nushell][8])

Add a small **“¿Y NUON?”** note explaining where a Nushell-native representation may be appropriate, without making it
the portable artifact for this comparative example.

### Refactor

Keep format mechanics subordinate to the lesson's main concept. Do not turn this into a serialization lesson.

### Acceptance criteria

- the persisted fixture is language-neutral;
- `open` is described as parsing a chosen representation, not eliminating representation choice;
- NUON remains optional/contextual;
- the example remains consumable conceptually by tools outside Nushell.

---

# TDD Cycle 5 — Culminate in `run` and the mixed-pipeline boundary

## Goal

Students see the strongest Nushell-specific affordance in the lesson: a reusable script can participate directly as a
structured, typed stage inside the Nushell runtime, while external processes cross a representation boundary.

## Red

Require examples that distinguish:

```text
value | run script.nu | internal-command
```

from:

```text
value | ^external-program | parse
```

and assert that the section cites both the 0.114 release notes and pipeline documentation.

## Green

Keep the existing `check-library-layout.nu` scenario, but make `run` the culmination rather than simply another feature.

Explicitly teach:

```text
record
→ run check-library-layout.nu
→ record
→ where
```

against:

```text
Nu value
→ conversion
→ external stdin
→ external stdout
→ bytes/text
→ parsing if structure is required again
```

The official 0.114 notes describe `run` as allowing scripts to behave as pipeline stages and also state that those
scripts execute in isolation from the calling session. ([Nushell][6])

Then revisit the current Git example as the counterexample at the process boundary. Nushell's pipeline documentation
provides the exact internal/external semantics. ([Nushell][4])

### Refactor

Merge the current:

> **Dónde se pierde la estructura**

and:

> **Qué ofrece Nushell nativamente que Kotlin no ofrece como modelo de ejecución**

into one tighter final conceptual sequence instead of restating the same distinction twice.

The final claim should become narrower and stronger:

> **Nushell no amplía qué transformaciones son computables respecto de Kotlin; cambia qué contratos de composición
> ofrece directamente su entorno de ejecución. Dentro de un pipeline de Nushell, comandos y scripts pueden intercambiar
> valores estructurados y exponer tipos de entrada y salida. Al cruzar hacia un proceso externo, esa garantía deja de
> estar implícita y vuelve a ser necesario acordar una representación.**

### Acceptance criteria

- `run` is explicitly versioned as 0.114+;
- examples are tested against or documented for Nushell 0.114.1;
- `run` and external process execution are clearly distinguished;
- no claim suggests arbitrary external programs exchange Nushell records;
- the final Kotlin comparison remains about **native composition semantics**, not computational expressiveness.

---

# TDD Cycle 6 — Tighten conclusions and reading navigation

## Goal

The conclusion synthesizes the research-backed design argument rather than repeating individual Nushell features.

## Red

Require the rendered lesson to contain the final conceptual chain:

```text
composición
→ representación
→ contratos de tipo
→ frontera de proceso
```

and a link to the lesson-specific readings page.

## Green

Revise the conclusions around three claims:

> **Los pipelines no son nuevos:** heredamos de Unix una forma particularmente poderosa de componer programas.

> **La representación importa:** pasar valores estructurados reduce la necesidad de reconstruir significado desde texto
> dentro del mismo runtime.

> **La frontera importa:** cuando dejamos el runtime de Nushell para ejecutar otro proceso, debemos volver a hacer
> explícito cómo se representan y reconstruyen los datos.

Then add **“Continúa explorando”** using `lessonReadingsRoute`, matching the cited `what-is` lesson.

### Acceptance criteria

- conclusions contain no novelty claim unsupported by the research;
- all load-bearing academic claims have inline citations;
- official Nushell behavior is cited to primary Nushell documentation;
- the readings page separates essential, practical, and deeper sources;
- the lesson remains visibly comparative and does not become a general history of shells.

---

## APA references to integrate

These are the three scholarly additions I would consider **required**:

**Greenberg, M., Kallas, K., & Vasilakis, N. (2021).** Unix shell programming: The next 50 years. _Proceedings of the
Workshop on Hot Topics in Operating Systems_, 104–111. Association for Computing Machinery.
[https://doi.org/10.1145/3458336.3465294](https://doi.org/10.1145/3458336.3465294). ([ACM Digital Library][1])

**Sippel, M., & Schirmeier, H. (2023).** Process composition with typed Unix pipes. _Proceedings of the 12th Workshop on
Programming Languages and Operating Systems_, 34–40. Association for Computing Machinery.
[https://doi.org/10.1145/3623759.3624546](https://doi.org/10.1145/3623759.3624546). ([ACM Digital Library][3])

**Sorva, J. (2013).** Notional machines and introductory programming education. _ACM Transactions on Computing
Education, 13_(2), Article 8, 1–31. [https://doi.org/10.1145/2483710.2483713](https://doi.org/10.1145/2483710.2483713).
([ACM Digital Library][5])

Keep **Handa et al. (2021), “An order-aware dataflow model for parallel Unix pipelines,”** as a deeper reading rather
than a load-bearing citation: its dataflow treatment is relevant, but parallel ordering is beyond this lesson's scope.
The reference is already present in the project bibliography.

For implementation details, continue using the existing official references `nushell-pipelines`, `nushell-loading-data`,
and `nushell-v0-114-0-blog`; there is no reason to duplicate those catalog entries.

## Suggested execution order

**Cycle 1 → 2 → 3 → 4 → 5 → 6.**

The minimum useful research-grounded slice is **Cycles 1–3**: citations become real project artifacts, the
historical/execution model becomes explicit, and the currently underused type-contract idea enters the lesson.

**Cycles 4–5 produce the strongest technical improvement.** Switching the persistent example to JSON clarifies
representation boundaries, while `run` then demonstrates why remaining inside Nushell can preserve richer composition
semantics.

I would treat the notional-machine framing, typed pipeline contracts, JSON/NUON distinction, and precise
`run`/external-process boundary as **required changes**. PowerShell's object pipeline and Handa et al.'s dataflow model
are valuable contextual/deeper-reading material, but should remain secondary so the lesson stays about Nushell support
scripting rather than turning into a survey of shell-language research.

[1]: https://dl.acm.org/doi/10.1145/3458336.3465294?utm_source=chatgpt.com "Unix shell programming: the next 50 years"
[2]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipelines?view=powershell-7.6&utm_source=chatgpt.com "about_Pipelines - PowerShell"
[3]: https://dl.acm.org/doi/abs/10.1145/3623759.3624546?utm_source=chatgpt.com "Process Composition with Typed Unix Pipes"
[4]: https://www.nushell.sh/book/pipelines.html?utm_source=chatgpt.com "Pipelines"
[5]: https://dl.acm.org/doi/10.1145/2483710.2483713?utm_source=chatgpt.com "Notional machines and introductory programming education"
[6]: https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html "Nushell 0.114.0 | Nushell"
[7]: https://github.com/nushell/nushell/releases?utm_source=chatgpt.com "Releases · nushell/nushell"
[8]: https://www.nushell.sh/book/loading_data.html "Loading Data | Nushell"
