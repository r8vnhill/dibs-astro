# Trustworthy Verification, Rendering Contracts, and Platform Modernization

## Overall assessment

The architectural direction is substantially better than the previous state. In particular, I would **keep**:

- the replacement of the React reading-time island with static Astro and small deterministic functions;
- the increasing use of BDD render-contract tests;
- `NotesSection` taking ownership of semantic heading markup;
- title-prop/rich-slot precedence for authoring components;
- the separation between canonical bibliography metadata and lesson-specific pedagogical guidance;
- the move toward explicit release provenance and artifact verification. ([GitLab][2])

There are, however, **two blockers in the current branch**, followed by several architectural issues that I would
resolve before implementing the large readings UI redesign.

---

# Findings

## P0 — Required: the branch currently has no usable CI evidence [superseded as part of another task]

The current `.gitlab-ci.yml` assigns `local` and `docker` tags globally, and repeats those tags on the individual jobs.
([GitLab][3]) GitLab uses job tags to determine which runners are eligible to execute a job. ([GitLab Docs][4])

That configuration is currently preventing verification:

- the `6ddce307` pipeline's `deps` job waited about 5,094 seconds and then failed with
  `stuck_pending_no_matching_runners`; its runner remained `null`; all dependent quality jobs were skipped;
  ([GitLab][5])
- the current `9823d7c1` pipeline was canceled after roughly 751 seconds with its `deps` job still unassigned to any
  runner, and all jobs show the same `docker`/`local` tags. ([GitLab][6])

Consequently, `a3146305` and `9823d7c1` do **not** have independent CI evidence that their render-contract, content, and
generated-artifact changes pass.

### Recommendation

Make ordinary verification jobs portable:

```text
test:check
test:unit
test:astro-render
build
```

should use an available GitLab runner without private/local tags unless they genuinely require local infrastructure.

Reserve specialized tags for:

- deployment;
- hardware-specific work;
- jobs requiring private infrastructure;
- other genuine environmental constraints.

This is especially important for a project presenting reproducibility as part of its engineering methodology.

### Related CI simplification

The current `deps` stage does not provide an installed workspace to subsequent jobs. Every `.node-job` executes its own
`pnpm install --frozen-lockfile`, while `needs: deps` only orders the jobs; GitLab jobs run independently unless data is
explicitly transferred through cache/artifacts. ([GitLab][3])

So today:

```text
deps
  pnpm install
      ↓
test:unit
  pnpm install again

test:check
  pnpm install again

test:astro-render
  pnpm install again

build
  pnpm install again
```

and there is a `PNPM_STORE_DIR` but no corresponding CI cache. ([GitLab][3])

I would remove the serial `deps` gate and cache the pnpm store using a lockfile-derived cache key. GitLab explicitly
recommends cache for downloaded dependencies and supports `cache:key:files` for invalidation based on files such as the
lockfile. ([GitLab Docs][7])

---

## P0 — Required: the canonical `astro-icons` gate is deterministically inconsistent

This is an inherited branch defect, but the recent release commits make it especially important because root
`pnpm check` explicitly invokes `check:astro-icons`. ([GitLab][8])

The package's canonical check starts with `test:audit-icons`, which includes `icon-inventory.contract.test.mjs`.
([GitLab][9]) That contract regenerates the inventory and compares it **byte-for-byte** with the committed
`migration/icon-inventory.json`. ([GitLab][10])

But:

- `serializeInventory()` explicitly emits JSON with **two-space indentation**; ([GitLab][11])
- the committed inventory uses **four-space indentation**. ([GitLab][12])

Therefore the current committed artifact and its canonical serializer cannot be byte-identical.

This also conflicts with the project-wide four-space formatting convention.

### Recommendation

Change the canonical serializer to:

```js
JSON.stringify(artifact, null, 4);
```

and update its documentation accordingly.

Do **not** solve this by reformatting the committed artifact to two spaces: four spaces agree with the project
guidelines.

Add a tiny regression fixture that establishes:

> given a deterministic inventory when it is serialized then it uses four-space indentation and exactly one trailing LF

Then run the full real-corpus byte contract.

This is behavior-preserving with respect to the artifact's semantic content.

---

## P1 — Required: missing bibliography records are silently removed from the readings page

The new `lesson-readings.ts` is a good abstraction: pedagogical metadata is strongly classified into type, difficulty,
extent, purpose, focus, outcome, and optional guiding question. ([GitLab][13])

But the page resolves each configured ID at rendering time and then does:

```ts
return reference
    ? <GuidedReferenceEntry {reference} {reading} />
    : null;
```

([GitLab][14])

For a scholarly readings page, this is the wrong failure mode.

A typo such as:

```text
parnas-decomposing-system-1972
```

would not produce a build failure. It would silently make Parnas disappear from the student-facing page.

That undermines both correctness and bibliographic provenance.

### Recommendation

Introduce a small pure domain function:

```text
lesson-readings configuration
        +
bibliography catalog
        ↓
resolveLessonReadings(...)
        ↓
ResolvedLessonReadings
     or
ReadingResolutionFinding[]
```

Use structured findings such as:

```text
missing-reference
duplicate-reference
invalid-reference-id
```

The Astro page should consume **already-resolved data** and should never contain `reference ? ... : null`.

Use DDT to cover:

- valid IDs;
- missing ID;
- canonical `ref:` normalization if both forms remain supported;
- duplicate references within a stage;
- duplicates across stages;
- preservation of configured order.

This is also a natural place to establish the invariant:

> every published lesson reading resolves to exactly one catalog record.

---

## P1 — Required: `GuidedReferenceEntry` creates a new unnecessary raw-HTML trust boundary

The new component constructs an HTML string manually:

```ts
const guide = `
    ...
    ${reading.why}
    ...
    ${reading.focus}
    ...
`;
```

and passes that string as `editorialNote`. ([GitLab][15])

`ReferenceEntry` then injects `editorialNote` with `set:html` for every supported reference kind. The component's own
documentation correctly describes `set:html` as a trust boundary. ([GitLab][16])

The data is repository-controlled today, so I would **not classify this as an immediate external-input security
vulnerability**. The architectural problem is different: ordinary pedagogical strings have unnecessarily crossed from:

```text
typed text
```

to:

```text
hand-assembled HTML string
```

to:

```text
raw HTML sink
```

A future note containing something as innocent as `<T>` or `A & B` can acquire HTML semantics instead of remaining
ordinary text.

### Recommendation

Render pedagogical guidance through Astro markup:

```astro
<p>
    <strong>Por qué leerlo.</strong>
    {reading.why}
</p>
```

rather than serializing it.

The desired boundary is:

```text
bibliographic catalog
        ↓
ReferenceEntry

lesson pedagogical model
        ↓
GuidedReferenceEntry markup
```

not:

```text
lesson model
    ↓
HTML serialization
    ↓
ReferenceEntry set:html
```

Add a regression test with editorial data containing:

```text
<T>
A & B
"quoted text"
```

and assert that it renders as the intended visible text.

I would also use this refactor to remove `editorialNote: string` from `ReferenceEntry` if no other caller genuinely
needs raw prepared HTML.

---

## P1 — High value: slot presence is now determined by rendering a slot and then the slot is rendered again

`a3146305` improved title-prop/slot precedence, but `CodeLayout` now performs:

```ts
const titleSlotContent = await Astro.slots.render("title");
```

to determine whether content is meaningful, then later emits:

```astro
<slot name="title" />
```

The same pattern exists for `source`. ([GitLab][17])

This creates two render paths for one logical slot.

Astro's documented model is that `Astro.slots.render()` returns the rendered HTML string; its example then emits that
captured string with `set:html`. Astro explicitly describes this as an advanced API and notes that ordinary `<slot />`
rendering should be preferred when possible. ([Astro Docs][18])

The project already encountered exactly the reason to use `render()` here—conditionally forwarded but empty slots—so the
clean approach is:

```text
render once
    ↓
classify meaningful/empty
    ↓
emit the captured rendered result once
```

The reference components have similar inconsistent slot-handling paths; `resolveOptionalSlots()` itself calls
`slots.render()`, while some components subsequently use `<slot>` again. ([GitLab][19])

### Recommendation

Establish one project-wide slot-resolution rule:

- simple slot where mere presence is sufficient → `Astro.slots.has()` + `<slot>`;
- slot whose rendered emptiness must be inspected → `Astro.slots.render()` exactly once, retain the string, and emit
  that result once.

Do not maintain:

```text
render to inspect
+
render again to display
```

Characterization tests for current prop/slot precedence already provide a strong safety net; extend them across code
blocks and bibliography components before refactoring.

---

## P1 — High value: the static reading-time extractor has an incomplete text-boundary model

The static refactor itself is excellent: `extractReadableText()` and `estimateReadingTime()` are small and
deterministic, and the previous client-side React computation has disappeared. ([GitLab][20])

However, the extractor currently manually inserts whitespace around:

```text
p, li, h1...h6, pre, blockquote,
summary, section, article, div
```

before asking Cheerio for `.text()`. ([GitLab][21])

Cheerio documents that `.text()` concatenates descendant text content. ([Cheerio][22])

That means structures not present in the hand-maintained boundary list can collapse adjacent logical text. Relevant
lesson content types include or may later include:

```text
td / th
dt / dd
caption
figcaption
```

For example, adjacent table-cell text can become one token for reading-time purposes unless a separator is explicitly
introduced.

### Recommendation

First characterize the intended initial-reading-state semantics with DDT:

```text
paragraph
list
table
definition list
figure/caption
code/pre
open details
closed details
excluded subtree
```

Then either:

1. expand a single explicit `READING_TEXT_BOUNDARY_ELEMENTS` contract; or
2. traverse the parsed tree and introduce separators between appropriate element boundaries.

I prefer **option 1 initially** because it is simpler and the site's content vocabulary is bounded.

The project already has `fast-check` installed. ([GitLab][8]) Once the finite element cases are covered with DDT, PBT
could cheaply strengthen the existing metamorphic guarantees:

> adding formatting whitespace does not change the estimate

and:

> wrapping text in semantically neutral inline markup does not change the estimate.

That is optional, but unlike introducing another PBT library, there is essentially no new dependency cost.

---

## P2 — Accessibility: static reading time still declares itself as a live region

The React implementation was removed, but `ReadingTime.astro` still defaults to:

```text
aria-live="polite"
```

even though its content is now entirely generated before the page reaches the browser. ([GitLab][23])

WAI-ARIA defines live regions as regions typically updated after an external event while focus may be elsewhere.
([W3C][24])

The reading-time value no longer has such behavior.

### Recommendation

Remove the `ariaLive` prop and `aria-live` attribute entirely unless there is another caller that genuinely updates the
component dynamically.

The component should now be ordinary static informational content.

---

## P2 — The lesson's heading taxonomy is inconsistent

The current lesson gives:

```astro
<Question
    id="h2-observable-change" ...
    headingLevel="h3"
/>
```

inside the encapsulation H2. ([GitLab][25])

That produces an identifier explicitly claiming `h2` while the rendered semantic heading is H3.

It also makes **observable change** subordinate to encapsulation even though it is one of the lesson's major conceptual
transitions.

### Recommendation [superseded: rename to h3]

Because the fragment ID may already be externally linked, preserve:

```text
#h2-observable-change
```

but promote the content back to a top-level `NotesSection` H2.

That restores:

```text
encapsulation
    ↓
observable behavior
    ↓
stability
```

without breaking existing fragment URLs.

If nesting it under encapsulation is intentional pedagogically, then schedule a later fragment-ID migration rather than
letting identifier taxonomy and document semantics disagree indefinitely.

---

## P2 — Hard terminology requirement: replace “romper una API”

The current Spanish lesson contains:

> `La firma no es la única forma de romper una API`

and:

> `Cambiar nombres o tipos puede romper código inmediatamente`

([GitLab][25])

Under the project's explicit neutral/non-violent terminology requirement, I would replace these without changing the
lesson's meaning.

For example:

> **Una incompatibilidad no siempre cambia la firma**

and:

> **Cambiar nombres o tipos puede volver incompatible el código consumidor inmediatamente.**

This is a pure wording change.

---

## P2 — Commit/provenance granularity should be tightened [rejected]

The latest four commits modify approximately:

- 2,290 lines;
- 1,633 lines;
- 1,159 lines;
- 3,161 lines. ([GitLab][1])

Some of that size is traceability documentation and generated material, but the commits still combine multiple
independently meaningful concerns.

There is also a concrete provenance mismatch in the latest commit: its message says it **created a new wide academic
reading workspace**, yet the current production page still uses `max-w-4xl` and has no wide two-column workspace or
contextual rail. ([GitLab][1]) The wide workspace exists as a detailed implementation **plan**, not yet as the
production layout.

For a project emphasizing traceability, commit messages should distinguish:

```text
plan
implementation
generated evidence
```

accurately.

I would align future commits with small green vertical slices rather than closing a whole plan in one large commit.

---

# Ecosystem assessment

The repository is also due for a deliberate toolchain modernization, but I would **not mix that work with the
correctness fixes above**.

The root currently uses Node 20 in CI, Astro `5.15.1`, TypeScript `5.9.2`, and pnpm `9.15.9`. ([GitLab][3])

Node 20 reached EOL on March 24, 2026. Node 24 is the current LTS line and is supported through April 2028.
([Node.js][26]) **Moving CI to Node 24 should be required.**

Astro's current stable line is `7.2.x`, and Astro's own documentation strongly recommends moving to the current major.
The official migration path from Astro 5 is sequential: first migrate to Astro 6, which requires Node `22.12.0+`, then
migrate from 6 to 7. ([Astro Docs][27])

TypeScript 7 is now the current release. ([TypeScript][28]) I would nevertheless upgrade it **after** Astro and its
integrations because TypeScript 7's native compiler generation represents a larger tooling transition than an ordinary
TypeScript minor upgrade.

pnpm 11 is the current stable major; it requires Node 22+ and introduces tighter supply-chain defaults and a new store
architecture. pnpm 12 is still presented through the `next-12` path, so I would treat 12 as experimental for this
project today. ([pnpm][29])

---

# Improvement Plan — Trustworthy Verification, Rendering Contracts, and Platform Modernization

The scope spans CI, a package contract, presentation infrastructure, reading-time semantics, bibliography integration,
and the framework/toolchain. That is **large scope**, so milestones are justified.

## Milestone 1 — Restore an executable, green canonical quality gate

### Goal

A clean checkout of `dev/qa` can execute all required verification on available CI infrastructure and `pnpm check`
succeeds deterministically.

### Scope

- `.gitlab-ci.yml`
- root package/runtime configuration
- `packages/astro-icons/scripts/audit-icons.mjs`
- `migration/icon-inventory.json`
- inventory contract tests

### Suggested phases

**1.1 — Fix the inventory serialization contract**

Red:

> given a canonical inventory when serialized then its persisted representation uses four-space indentation and one
> trailing LF.

Green:

- switch serializer to four spaces;
- regenerate only through the canonical workflow.

Refactor:

- keep serialization pure;
- update comments/documentation together.

**1.2 — Restore runner portability**

- remove `local/docker` tags from portable verification jobs, or provision an explicitly reliable matching runner;
- run `check`, unit, Astro-render, and build jobs on normal Linux CI;
- retain specialized tags only where justified.

**1.3 — Remove the ineffective `deps` serialization point**

- delete the standalone `deps` job unless it begins producing a genuine artifact;
- cache `.pnpm-store` with a lockfile-derived key;
- let independent quality jobs install from the frozen lockfile in parallel.

**1.4 — Move CI to Node 24 LTS**

Keep pnpm unchanged initially so runtime modernization and package-manager modernization are independently diagnosable.

### Acceptance criteria

- no required branch job remains pending because of unmatched runner tags;
- `pnpm check` is green from a clean checkout;
- the real icon inventory matches its generated form byte-for-byte;
- test jobs can execute in parallel;
- Node 20 no longer appears in CI;
- the pipeline produces independent evidence for `check`, unit tests, Astro rendering, and production build.

### Non-goals

- Astro major migration;
- pnpm major migration;
- readings UI redesign.

---

# Milestone 2 — Make lesson-reading references fail closed and structurally rendered

### Goal

Every configured reading resolves exactly once to canonical bibliography data, and pedagogical content never needs to
pass through manually constructed HTML.

### Scope

- `lesson-readings.ts`
- readings page
- `GuidedReferenceEntry.astro`
- `ReferenceEntry.astro`
- bibliography/readings integrity tests

### Suggested phases

**2.1 — Introduce a pure reading resolver**

Model:

```text
LessonReadings
+
BibliographyCatalog
        ↓
resolveLessonReadings
        ↓
ResolvedLessonReadings | findings
```

Write DDT first for:

- missing references;
- duplicate references;
- normalization;
- stage/order preservation.

**2.2 — Remove silent omission**

The page must receive a resolved configuration. There should be no:

```ts
reference ? ... : null
```

path.

**2.3 — Remove string-built editorial HTML**

Characterize current rendered output, then convert pedagogical fields to regular Astro markup.

Special-character regression cases should include `<`, `>`, `&`, and quotes.

### Acceptance criteria

- one mistyped reference ID fails the build with a structured, actionable diagnostic;
- no reading disappears silently;
- bibliography metadata remains catalog-owned;
- pedagogical metadata remains lesson-owned;
- no pedagogical plain string is interpolated into a `set:html` sink;
- existing visible reading content and order are preserved.

### Non-goals

- modifying catalog IDs;
- implementing the planned wide readings workspace;
- generic CMS infrastructure.

---

# Milestone 3 — Consolidate render semantics and reading-time correctness

### Goal

Presentation components have one deterministic rendering path per slot, and reading-time calculations faithfully reflect
the site's supported semantic content.

### Scope

- `CodeLayout.astro`
- reference components and `reference-content.ts`
- reading-time components/utilities
- affected render-contract tests

### Suggested phases

**3.1 — Render meaningful slots once**

Use existing prop/slot characterization tests as the Red safety net.

Refactor every inspected slot to follow one policy:

```text
render → classify → emit captured rendering
```

or:

```text
has → emit slot
```

but never both for the same content.

**3.2 — Complete readable-text boundaries**

Add DDT for:

- tables;
- definition lists;
- figure captions;
- existing list/paragraph/code/details cases.

Then extend the boundary model with the smallest coherent implementation.

**3.3 — Strengthen metamorphic assurance**

Because `fast-check` is already present, optionally turn existing metamorphic examples into generated properties for:

- formatting-whitespace invariance;
- neutral inline-wrapper invariance.

Do this only after concrete example/DDT coverage is strong.

**3.4 — Remove obsolete live-region semantics**

Characterize the static output, then remove `aria-live` from reading-time markup.

### Acceptance criteria

- inspected slots have one rendering path;
- existing rich-slot precedence remains unchanged;
- table/definition-list text cannot collapse into accidental single tokens;
- static reading time has no live-region semantics;
- no client-side reading-time hydration returns;
- existing production lesson reading estimates remain within the declared algorithm's semantics.

### Non-goals

- changing WPM/multiplier policy;
- replacing Cheerio without evidence that another parser improves the contract;
- restoring React.

---

# Milestone 4 — Modernize the Astro/TypeScript/pnpm platform

### Goal

Bring the project onto supported current tooling without combining framework migration with unrelated behavior changes.

### Scope

- runtime metadata;
- `package.json`;
- lockfile/workspace configuration;
- Astro and official integrations;
- TypeScript;
- pnpm;
- build/render/PDF compatibility evidence.

### Phase 4.1 — Pin the runtime/toolchain contract

Add an explicit project-level package-manager/runtime contract rather than keeping the pnpm version only in GitLab
variables.

For example, use the repository's preferred mechanism for:

```text
Node 24 LTS
exact supported pnpm version
```

so local and CI execution agree.

### Phase 4.2 — pnpm 9 → current pnpm 11

Treat this as an explicit migration because pnpm 11 changes configuration/security semantics. ([pnpm][29])

Verify:

- workspace resolution;
- lifecycle/build permissions;
- publishing scripts;
- GitLab registry behavior;
- lockfile reproducibility.

Do not adopt pnpm 12 yet.

### Phase 4.3 — Astro 5 → 6

Follow Astro's official migration path and run the full render-contract corpus. Astro 6 raises the Node baseline, which
is already satisfied by Milestone 1's Node 24 migration. ([Astro Docs][30])

### Phase 4.4 — Astro 6 → 7

Pay particular attention to:

- JSX/inline whitespace;
- Vite/Rolldown integration;
- custom plugins;
- static HTML output;
- PDF exports;
- Astro component render tests.

Astro 7 switches to Vite 8/Rolldown and includes changes to JSX whitespace behavior, making the existing render-contract
tests particularly valuable during this upgrade. ([Astro][31])

### Phase 4.5 — TypeScript 7

After Astro 7 and its integrations are stable, migrate TypeScript separately.

Treat it as a compiler/tooling migration rather than a routine dependency bump.

### Acceptance criteria

- current supported Node LTS;
- current stable pnpm major;
- current stable Astro major;
- TypeScript 7 or a documented, evidence-backed temporary exception;
- all Astro render-contract tests green;
- static site and PDF builds reproducible;
- no unexpected lesson whitespace/content changes;
- release tooling remains functional.

### Non-goals

- adopting pnpm 12 pre-release tooling;
- adopting experimental Astro functionality merely because it is available;
- redesigning architecture during framework migration.

---

# Intentional follow-up — Lesson semantic structure and terminology

I would keep this separate because it modifies educational/document semantics rather than infrastructure.

Apply two focused changes:

1. promote `#h2-observable-change` to an actual top-level H2 while preserving its existing fragment identifier;
2. replace the lesson-local wording around _“romper una API”_ with neutral incompatibility terminology.

Acceptance should be based on the lesson's existing render-contract test:

```text
surface
→ contract
→ encapsulation
→ observable behavior
→ stability
```

with fragment IDs unchanged where externally observable.

---

## Suggested execution order

The critical path is:

```text
Milestone 1
restore trustworthy verification
        ↓
Milestone 2
harden readings/reference boundaries
        ↓
Milestone 3
consolidate rendering contracts
        ↓
semantic lesson cleanup
        ↓
Milestone 4
platform modernization
        ↓
wide readings UI implementation
```

I would specifically **not start the planned readings-workspace UI refactor yet**. The latest commit already contains a
good design plan, but the current implementation still has the narrow `max-w-4xl` page and, more importantly, the
underlying readings resolver and guided-reference composition currently have fail-open/raw-HTML problems. ([GitLab][14])
Fixing those boundaries first gives the later UI work a much cleaner substrate.

The minimum useful next vertical slice is therefore quite small:

```text
4-space inventory serialization
        +
portable CI runner
        +
one green clean-checkout pipeline
```

Only after that green baseline exists would I consider any subsequent commit “verified.”

[1]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/commits/9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/commits/9823d7c1"
[2]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/commits/a3146305 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/commits/a3146305"
[3]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/.gitlab-ci.yml/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/.gitlab-ci.yml/raw?ref=9823d7c1"
[4]: https://docs.gitlab.com/ci/runners/configure_runners/ "https://docs.gitlab.com/ci/runners/configure_runners/"
[5]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/pipelines/2758481429/jobs?per_page=100 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/pipelines/2758481429/jobs?per_page=100"
[6]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/pipelines/2758907690/jobs?per_page=100 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/pipelines/2758907690/jobs?per_page=100"
[7]: https://docs.gitlab.com/ci/caching/ "https://docs.gitlab.com/ci/caching/"
[8]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/package.json/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/package.json/raw?ref=9823d7c1"
[9]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/packages%2Fastro-icons%2Fpackage.json/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/packages%2Fastro-icons%2Fpackage.json/raw?ref=9823d7c1"
[10]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/packages%2Fastro-icons%2Fscripts%2Ftest%2Ficon-inventory.contract.test.mjs/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/packages%2Fastro-icons%2Fscripts%2Ftest%2Ficon-inventory.contract.test.mjs/raw?ref=9823d7c1"
[11]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/packages%2Fastro-icons%2Fscripts%2Faudit-icons.mjs/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/packages%2Fastro-icons%2Fscripts%2Faudit-icons.mjs/raw?ref=9823d7c1"
[12]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/packages%2Fastro-icons%2Fmigration%2Ficon-inventory.json/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/packages%2Fastro-icons%2Fmigration%2Ficon-inventory.json/raw?ref=9823d7c1"
[13]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fdata%2Freadings%2Flesson-readings.ts/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fdata%2Freadings%2Flesson-readings.ts/raw?ref=9823d7c1"
[14]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fpages%2Freadings%2Fsoftware-libraries%2Fwhat-is%2Findex.astro/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fpages%2Freadings%2Fsoftware-libraries%2Fwhat-is%2Findex.astro/raw?ref=9823d7c1"
[15]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Fui%2Freferences%2FGuidedReferenceEntry.astro/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Fui%2Freferences%2FGuidedReferenceEntry.astro/raw?ref=9823d7c1"
[16]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Fui%2Freferences%2FReferenceEntry.astro/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Fui%2Freferences%2FReferenceEntry.astro/raw?ref=9823d7c1"
[17]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Fui%2Fcode%2FCodeLayout.astro/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Fui%2Fcode%2FCodeLayout.astro/raw?ref=9823d7c1"
[18]: https://docs.astro.build/en/reference/astro-syntax/ "https://docs.astro.build/en/reference/astro-syntax/"
[19]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Fui%2Freferences%2Freference-content.ts/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Fui%2Freferences%2Freference-content.ts/raw?ref=9823d7c1"
[20]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/commits/5947017c "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/commits/5947017c"
[21]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Freading-time%2Freading-time.ts/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Freading-time%2Freading-time.ts/raw?ref=9823d7c1"
[22]: https://cheerio.js.org/docs/basics/manipulation/ "https://cheerio.js.org/docs/basics/manipulation/"
[23]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Freading-time%2FReadingTime.astro/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fcomponents%2Freading-time%2FReadingTime.astro/raw?ref=9823d7c1"
[24]: https://www.w3.org/TR/wai-aria-1.2/ "https://www.w3.org/TR/wai-aria-1.2/"
[25]: https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fpages%2Fnotes%2Fsoftware-libraries%2Fwhat-is%2Findex.astro/raw?ref=9823d7c1 "https://gitlab.com/api/v4/projects/r8vnhill%2Fdibs-astro-website/repository/files/src%2Fpages%2Fnotes%2Fsoftware-libraries%2Fwhat-is%2Findex.astro/raw?ref=9823d7c1"
[26]: https://nodejs.org/en/about/previous-releases "https://nodejs.org/en/about/previous-releases"
[27]: https://docs.astro.build/en/upgrade-astro/ "https://docs.astro.build/en/upgrade-astro/"
[28]: https://www.typescriptlang.org/ "https://www.typescriptlang.org/"
[29]: https://pnpm.io/blog/releases/11.0 "https://pnpm.io/blog/releases/11.0"
[30]: https://docs.astro.build/en/guides/upgrade-to/v6/ "https://docs.astro.build/en/guides/upgrade-to/v6/"
[31]: https://astro.build/blog/astro-7/ "https://astro.build/blog/astro-7/"
