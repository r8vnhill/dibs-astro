# Trustworthy Contracts, Rendering Semantics, and Platform Modernization

## Summary

Harden the remaining correctness and architecture issues identified in the recent `dev/qa` changes, while avoiding work
that has already been superseded or explicitly rejected.

The initiative now covers four coherent concerns:

```text
canonical generated-artifact consistency
                ↓
bibliography/readings integrity
                ↓
rendering + reading-time semantics
                ↓
platform modernization
```

A small lesson-semantic cleanup remains as an intentional content follow-up.

### External dependency

The CI runner/portable-pipeline remediation identified in the review is **already covered by another task** and is
therefore not duplicated here. This plan assumes that task will restore executable CI evidence. Until it lands,
individual cycles can be verified locally; final completion requires the canonical CI quality gate to execute
successfully.

### Behavior-preservation boundary

Unless explicitly stated otherwise, preserve:

- lesson-visible content;
- bibliography records and identifiers;
- reference ordering;
- public routes;
- code-block rendering semantics;
- reading-time policy;
- published package behavior.

The only intentional content-level changes are:

- neutral terminology in the lesson;
- renaming the observable-change fragment from `h2` to `h3` to match its existing semantic nesting.

---

# Milestone 1 — Restore canonical generated-artifact consistency [DONE]

## Goal

Ensure the `astro-icons` generated inventory has one deterministic canonical representation and that the committed
artifact is reproducible byte-for-byte from its source data.

## Scope

- `packages/astro-icons/scripts/audit-icons.mjs`
- `packages/astro-icons/migration/icon-inventory.json`
- `icon-inventory.contract.test.mjs`
- nearby generator documentation/comments

This milestone **does not include GitLab runner configuration, CI job topology, pnpm caching, or the former `deps`
job**. Those belong to the superseding CI task.

## Phase 1.1 — Characterize canonical serialization

### Red

Add the smallest focused contract test:

> given a deterministic inventory when it is serialized then it uses four-space indentation and exactly one trailing LF

Also characterize key ordering if the serializer promises deterministic ordering.

### Green

Change the canonical serializer to the project convention:

```js
JSON.stringify(artifact, null, 4);
```

followed by exactly one LF.

### Refactor

Keep serialization as a pure operation separate from filesystem writing.

If serialization and persistence are currently coupled, prefer:

```text
inventory
    ↓
serializeInventory
    ↓
string
    ↓
writeInventory
```

rather than making tests interact with the filesystem unnecessarily.

## Phase 1.2 — Regenerate the real artifact

### Red

Run the existing real-corpus byte contract and demonstrate the mismatch before regeneration.

### Green

Regenerate `migration/icon-inventory.json` only through the canonical generator.

### Refactor

Update documentation/comments describing the serialization format so code, test, generated artifact, and documentation
agree.

## Acceptance criteria

- canonical serialization uses four spaces;
- output terminates with exactly one LF;
- the real committed inventory is byte-identical to regenerated output;
- no generated artifact is edited manually;
- `check:astro-icons` passes locally;
- once the external CI task is available, the same contract passes in canonical CI.

## Non-goals

- CI runner remediation;
- CI dependency caching;
- package behavior changes;
- restructuring the icon inventory schema.

---

# Milestone 2 — Make lesson-reading references fail closed and structurally rendered [DONE]

## Goal

Guarantee that every configured complementary reading resolves exactly once to canonical bibliography data and that
pedagogical text remains typed text rather than becoming manually assembled HTML.

## Scope

- `src/data/readings/lesson-readings.ts`
- `/readings/software-libraries/what-is/`
- `GuidedReferenceEntry.astro`
- `ReferenceEntry.astro`
- bibliography/readings integrity tests

## Phase 2.1 — Introduce explicit reading resolution

### Goal

Move catalog resolution out of page rendering and establish one pure integrity boundary.

### Red

Use DDT for:

```text
valid reference
missing reference
duplicate inside one stage
duplicate across stages
accepted ID normalization
stage-order preservation
reading-order preservation
```

Prefer BDD descriptions such as:

> given a configured reading whose reference ID is absent from the catalog when lesson readings are resolved then
> resolution reports a missing-reference finding

### Green

Introduce a pure resolver, conceptually:

```text
LessonReadings
      +
BibliographyCatalog
      ↓
resolveLessonReadings
      ↓
ResolvedLessonReadings | ReadingResolutionFinding[]
```

Use expressive finding types, for example:

```ts
type ReadingResolutionFinding =
    | { code: "missing-reference"; referenceId: string }
    | { code: "duplicate-reference"; referenceId: string };
```

Only add `invalid-reference-id` if there is an actual project-level syntax contract for IDs.

### Refactor

Keep:

- bibliography lookup;
- integrity policy;
- Astro presentation;

as separate concerns.

Do not make the Astro page responsible for interpreting findings.

## Phase 2.2 — Fail closed at the page boundary

### Red

Characterize the current undesirable behavior:

> given an unresolved configured reference when the readings page is prepared then the reference must not silently
> disappear

### Green

Remove:

```ts
reference
    ? <GuidedReferenceEntry ... />
    : null
```

The page should receive only resolved entries or fail with an actionable diagnostic before rendering.

### Refactor

If several readings pages will immediately use the same resolver, expose a small reusable application-level function.

Do not create a generic bibliography service for one concrete use case.

## Phase 2.3 — Remove pedagogical raw-HTML construction

### Red

Add regression cases containing:

```text
<T>
A & B
"quoted text"
```

and assert the intended visible text.

### Green

Replace manually constructed HTML such as:

```ts
const guide = `...${reading.why}...`;
```

with ordinary Astro markup:

```astro
<p>
    <strong>Por qué leerlo.</strong>
    {reading.why}
</p>
```

### Refactor

Separate responsibilities:

```text
bibliographic catalog
        ↓
ReferenceEntry

pedagogical metadata
        ↓
GuidedReferenceEntry
```

If `editorialNote: string` has no remaining legitimate raw-HTML caller after this refactor, remove it rather than
retaining an unused trust boundary.

If other consumers genuinely require trusted HTML, make that exceptional contract explicit instead of treating every
string as potentially pre-rendered markup.

## Acceptance criteria

- every configured reading resolves exactly once;
- a mistyped bibliography ID fails with an actionable diagnostic;
- no reading can silently disappear;
- order and stage classification remain unchanged;
- bibliographic metadata remains catalog-owned;
- pedagogical metadata remains `lesson-readings.ts`-owned;
- ordinary pedagogical strings never require `set:html`;
- `<`, `>`, `&`, and quotes remain ordinary text;
- current visible reading content remains behaviorally equivalent.

## Non-goals

- changing bibliography IDs;
- redesigning the bibliography catalog;
- generic CMS infrastructure;
- implementing the wide readings UI in this milestone.

---

# Milestone 3 — Consolidate rendering semantics and reading-time correctness [DONE]

## Goal

Give each presentation value one deterministic render path and ensure reading-time extraction respects all semantic text
boundaries currently supported by course content.

## Scope

- `CodeLayout.astro`
- reference components
- `reference-content.ts`
- reading-time components/utilities
- affected render-contract tests

---

## Phase 3.1 — Establish a single slot-resolution policy

### Goal

Remove the pattern where the same logical slot is rendered once for inspection and a second time for output.

### Red

Extend existing prop/slot characterization tests to cover:

- meaningful title slot;
- forwarded-but-empty title slot;
- title prop only;
- title prop + meaningful slot;
- source equivalent cases;
- rich reference slots where relevant.

Preserve existing precedence semantics exactly.

### Green

Apply one of two contracts to each slot:

```text
presence is sufficient
    → Astro.slots.has()
    → <slot />
```

or:

```text
rendered emptiness matters
    → Astro.slots.render() once
    → classify captured content
    → emit captured rendering once
```

Never use both paths for one logical value.

### Refactor

If repeated rendered-slot classification is substantial, keep a small pure helper around the captured string.

Avoid building a generalized slot framework.

## Acceptance criteria

- no inspected slot is rendered twice;
- existing title/source precedence remains unchanged;
- conditionally forwarded empty slots continue to behave correctly;
- bibliography and code-block components use the same documented policy.

---

## Phase 3.2 — Complete the reading-text boundary contract

### Goal

Ensure semantic block boundaries cannot accidentally concatenate words and change reading-time estimates.

### Red

Add DDT for:

- paragraphs;
- lists;
- table cells and headers;
- definition terms/descriptions;
- captions;
- figure captions;
- `pre`/code;
- open `details`;
- closed `details`;
- excluded subtrees.

Example:

> given adjacent table cells when readable text is extracted then the cells contribute separate lexical tokens

### Green

Prefer one explicit element taxonomy initially:

```ts
const READING_TEXT_BOUNDARY_ELEMENTS = [
    ...
] as const;
```

Add only the elements supported by actual content semantics.

### Refactor

Keep:

```text
HTML parsing
    ↓
readable-text extraction
    ↓
word/complexity estimation
```

as distinct functions.

Do not replace Cheerio unless evidence shows the abstraction itself is unsuitable.

---

## Phase 3.3 — Strengthen metamorphic assurance

The repository already has `fast-check`, so no new dependency is required.

After example/DDT coverage is established, consider generated properties for:

> adding formatting whitespace does not change the reading estimate

> wrapping text in semantically neutral inline markup does not change the reading estimate

> duplicating excluded content does not change readable text

Keep these properties targeted. Do not attempt to generate arbitrary HTML documents.

---

## Phase 3.4 — Remove obsolete live-region behavior

### Red

Characterize the static `ReadingTime` output and confirm no runtime update occurs.

### Green

Remove:

```text
aria-live="polite"
```

and the corresponding prop if nothing else uses it dynamically.

### Refactor

Simplify `ReadingTime.astro` into static informational markup.

## Acceptance criteria

- slots that require inspection are rendered once;
- rich-slot behavior is preserved;
- tables, definition lists, and captions preserve lexical boundaries;
- reading-time calculations remain deterministic;
- no React/client hydration returns;
- static reading time no longer advertises itself as a live region;
- WPM and complexity multipliers remain unchanged.

## Non-goals

- changing reading-time policy;
- changing WPM values;
- replacing Cheerio without evidence;
- restoring a client-side implementation.

---

# Focused content follow-up — Align fragment taxonomy and terminology

This remains separate from infrastructure because it intentionally modifies document-facing semantics.

## Cycle A — Align the observable-change fragment with its actual heading level

The superseding decision is to **retain the section as an H3 under encapsulation**.

Therefore, do not promote it to a top-level `NotesSection`.

### Red

Characterize:

- heading hierarchy;
- inbound references to `#h2-observable-change`;
- generated TOC/section links if applicable.

Add a regression test:

> given the observable-change subsection when the lesson renders then it is an H3 with the fragment
> `h3-observable-change`

### Green

Rename:

```text
h2-observable-change
```

to:

```text
h3-observable-change
```

and update every project-owned reference to the new fragment.

### Refactor

Search the repository for stale terminology/IDs rather than updating only the defining component:

```text
h2-observable-change
#h2-observable-change
```

If externally published links are considered a compatibility contract, add an explicit compatibility mechanism only if
the project already has a policy for fragment migrations. Do not retain a knowingly misleading `h2-*` identifier merely
by accident.

### Acceptance criteria

- the subsection remains H3;
- its ID is `h3-observable-change`;
- no project-owned stale `h2-observable-change` reference remains;
- lesson hierarchy remains:

```text
Encapsulación
    └── ¿Qué cambios puede observar quien consume?

Estabilidad
```

---

## Cycle B — Use neutral incompatibility terminology

### Red

Characterize the intended lesson meaning.

### Green

Replace wording such as:

> La firma no es la única forma de romper una API

with something closer to:

> **Una incompatibilidad no siempre cambia la firma**

and:

> Cambiar nombres o tipos puede romper código inmediatamente.

with:

> **Cambiar nombres o tipos puede volver incompatible el código consumidor inmediatamente.**

### Acceptance criteria

- technical meaning is preserved;
- local terminology follows the project's inclusive/neutral naming requirement;
- standardized external terminology is not unnecessarily renamed.

---

# Milestone 4 — Modernize the supported platform

## Goal

Bring the repository onto current supported runtime, framework, package-manager, and compiler generations through
independently diagnosable migrations.

The Node upgrade moves here because the superseded CI task should not cause this plan to duplicate CI-topology work.

## Scope

- runtime/toolchain metadata;
- `package.json`;
- workspace/lockfile configuration;
- Astro and official integrations;
- pnpm;
- TypeScript;
- render/build/PDF compatibility evidence

---

## Phase 4.1 — Declare Node 24 as the project runtime

### Goal

Move the project away from Node 20 and make the local/CI runtime contract explicit.

### Scope

Update the appropriate repository-owned runtime declarations, such as:

- `engines`;
- version-manager files if present;
- container/runtime metadata;
- documentation.

The separate CI task should consume this canonical runtime declaration rather than this milestone independently
redesigning CI.

### Acceptance criteria

- Node 24 is the declared supported runtime;
- local/tooling documentation agrees;
- dependency installation and current checks succeed under Node 24;
- no duplicate contradictory Node version remains in project-owned configuration.

---

## Phase 4.2 — Upgrade pnpm 9 → 11

### Red

Characterize:

- workspace dependency resolution;
- package scripts;
- lifecycle/build permissions;
- package publication;
- lockfile reproducibility.

### Green

Upgrade to the current supported pnpm 11 release and regenerate the lockfile using the canonical package-manager
workflow.

### Refactor

Move package-manager version ownership into the repository's canonical toolchain declaration if it currently exists only
in CI variables.

### Acceptance criteria

- frozen-lockfile installation succeeds;
- workspace topology is unchanged;
- publishing/release scripts behave equivalently;
- regenerated lockfile is reproducible;
- no unintended lifecycle-script behavior is introduced.

---

## Phase 4.3 — Astro 5 → 6

Follow Astro's supported sequential migration path.

Use the existing render-contract suite as the main behavior-preservation oracle.

Verify particularly:

- lesson rendering;
- slot semantics;
- static builds;
- bibliography pages;
- PDF generation.

---

## Phase 4.4 — Astro 6 → 7

Keep this separate from 4.3 so changes introduced by each major remain diagnosable.

Verify:

- JSX/inline whitespace;
- Vite/Rolldown behavior;
- custom integrations/plugins;
- static HTML output;
- PDF output;
- component render contracts.

No unrelated component redesign belongs in this phase.

---

## Phase 4.5 — TypeScript 7

Upgrade only after the Astro ecosystem is stable on its current major.

Treat TypeScript 7 as a compiler/toolchain transition and verify:

- type checking;
- Astro integration;
- scripts;
- generated types;
- test tooling;
- any direct compiler-API dependencies.

If an ecosystem dependency still requires TypeScript 6, document the specific incompatibility and use a bounded
transitional arrangement rather than silently remaining on an old compiler.

## Milestone acceptance criteria

- Node 24 is canonical;
- pnpm 11 is canonical;
- the project uses the current supported Astro major;
- TypeScript 7 is adopted or a concrete ecosystem blocker is documented;
- all existing render contracts remain green;
- static site build remains reproducible;
- PDF generation remains correct;
- release tooling remains functional;
- the migration contains no unrelated UI redesign.

## Non-goals

- experimental pnpm prereleases;
- experimental Astro functionality without a research/engineering justification;
- architecture redesign during version migration.

---

# Removed work

The following is intentionally **absent** from the plan:

### Commit/provenance granularity

The recommendation concerning commit size, commit-message granularity, and distinguishing
plan/implementation/generated-evidence commits was rejected. It therefore:

- is not an implementation task;
- is not an acceptance criterion;
- does not constrain TDD-cycle size or commit structure;
- does not appear in traceability requirements.

### CI topology remediation

Runner portability, removal/reworking of the `deps` stage, and pnpm-store CI caching are handled by the superseding
task.

This plan should reference that task as a dependency where necessary, **not reproduce its implementation work**.

---

# Suggested execution order

The revised dependency graph becomes:

```text
External CI remediation task
        │
        │ enables canonical CI evidence
        ▼
Milestone 1
canonical astro-icons artifact
        │
        ▼
Milestone 2
readings/reference integrity
        │
        ├────────────────────────┐
        ▼                        ▼
Milestone 3              Content follow-up
render semantics          h3 ID + terminology
        │                        │
        └──────────┬─────────────┘
                   ▼
Milestone 4
platform modernization
                   │
                   ▼
wide readings UI implementation
```

Milestone 2 remains a prerequisite for the planned wide readings redesign because the UI should be built over a
fail-closed, structurally rendered readings model rather than over the current nullable-resolution/raw-HTML path.

Milestone 3 and the small lesson-content follow-up can proceed independently once Milestone 2 is stable.

---

# Minimum useful next vertical slice

With the superseded CI work removed, the next slice should be:

```text
inventory serialization regression test
        ↓
four-space canonical serializer
        ↓
regenerated inventory
        ↓
real-corpus byte contract green
```

Then move directly to the smallest readings integrity slice:

```text
one missing-reference failing test
        ↓
pure resolver
        ↓
page consumes resolved reading
        ↓
silent null path removed
```

That gives the project two concrete improvements—deterministic generated evidence and fail-closed scholarly
references—without duplicating the separate CI initiative or retaining the rejected provenance work.
