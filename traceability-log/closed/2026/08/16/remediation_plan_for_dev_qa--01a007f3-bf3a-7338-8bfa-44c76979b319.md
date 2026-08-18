# Remediation plan for `dev/qa`

## Goal

Bring the current `dev/qa` branch back to a state where its implementation, documentation, traceability records, and
automated evidence agree.

The work must:

- restore a reproducible package-registry topology before DIBS depends on it;
- correct student-facing Nushell code and explanations;
- make runnable lesson examples executable test artifacts rather than unchecked prose;
- verify browser-visible behavior at the browser boundary;
- remove duplicated semantic-style ownership where practical;
- make reading-guide APIs describe semantic presentation rather than incidental layout;
- ensure traceability records are closed only when their required evidence actually exists.

## Merge gate

The branch is **not merge-ready** until the following required conditions hold:

1. the configured `@ravenhill` registry endpoint actually serves every dependency referenced by the DIBS lockfile;
2. clean dependency installation succeeds without hidden local state;
3. the current Nushell code typo is corrected and executable validation exists for the affected example;
4. the `album-title` explanation agrees with its declared `record -> string` pipeline contract;
5. traceability records no longer claim completion for required evidence that is still absent;
6. a fresh branch/MR pipeline at the final commit is green.

The browser-contract work below is **high-value and should be completed in this remediation if practical**, particularly
because those changes were previously declared complete. The reading-guide API rename is useful but may be deferred if
necessary without blocking correctness.

---

# Phase 1 — Restore registry and dependency-installation correctness

## Priority

**Required — merge blocking**

## Goal

A clean DIBS checkout resolves every `@ravenhill/*` dependency from the registry endpoint represented by repository
configuration and the lockfile, without depending on developer-machine caches, credentials, or package artifacts stored
in an obsolete project.

The desired invariant is:

```text
repository .npmrc
        +
committed lockfile
        +
public canonical registry
        ↓
clean reproducible installation
```

## Scope

Relevant systems include:

- DIBS `.npmrc`;
- DIBS lockfile;
- `r8vnhill/npm-packages`;
- existing `@ravenhill/astro-icons` package history;
- `astro-icons` release/registry verification;
- registry migration evidence and traceability.

Avoid changing package APIs in this phase.

---

## TDD cycle 1 — Clean consumer registry contract

### Red

Add an integration test that starts from an intentionally clean installation environment:

- no `node_modules`;
- empty isolated pnpm store;
- no user-level `.npmrc`;
- no GitLab npm authentication;
- repository configuration only.

Verify representative routes:

| Dependency                   | Expected source                             |
| ---------------------------- | ------------------------------------------- |
| `@ravenhill/astro-icons`     | canonical GitLab npm project                |
| `@ravenhill/astro-semantics` | canonical GitLab npm project, once consumed |
| `astro`                      | ordinary npm registry                       |
| another unscoped dependency  | ordinary npm registry                       |

The test should verify actual successful installation, not merely parse `.npmrc`.

### Green

Choose exactly one consistent state.

**Preferred:** complete the `astro-icons` migration to `r8vnhill/npm-packages`, prove artifact preservation, and keep
the current DIBS endpoint.

**Fallback:** revert the DIBS registry and lockfile cutover to the last working configuration until the canonical
migration is complete.

Do not keep a state where:

```text
lockfile → canonical registry
canonical registry → artifact missing
```

### Refactor

Centralize the canonical registry identity in one project-local configuration contract where practical.

Avoid independently hardcoding the same registry project path/ID in:

- CI scripts;
- tests;
- documentation;
- package-verification scripts.

### Acceptance criteria

- a clean install succeeds;
- `@ravenhill/*` resolves through the intended endpoint;
- unscoped dependencies continue using the ordinary npm registry;
- no developer credentials are required for public consumption;
- no stale source-project package URL remains in the DIBS lockfile.

---

## TDD cycle 2 — Preserve migrated package evidence

### Red

Inventory all currently published `@ravenhill/astro-icons` versions.

Use DDT over the complete set rather than assuming only:

```text
0.1.0
0.2.0
```

Record for every version:

```text
package
version
old registry artifact
SHA-256
package metadata
```

Add a migration check expecting:

```text
original published archive SHA-256
        =
preserved migration archive SHA-256
        =
canonical registry download SHA-256
```

### Green

Migrate the exact preserved archives.

Do **not** rebuild historical versions from Git commits if their originally published tarballs are available.

### Refactor

Represent migration evidence in a machine-readable manifest rather than prose-only notes.

For example:

```json
{
    "package": "@ravenhill/astro-icons",
    "versions": [
        {
            "version": "0.2.0",
            "sha256": "...",
            "sourceRegistry": "...",
            "targetRegistry": "..."
        }
    ]
}
```

### Testing strategy

This cycle should use:

- **DDT** across all migrated versions;
- **differential testing** for old versus canonical artifacts;
- **runtime boundary assertions** for package name/version/digest;
- existing **state-machine tests** for publication reconciliation;
- targeted **mutation testing** of the pure publication/reconciliation decision logic if that logic exists and is not
  already mutation-tested.

### Acceptance criteria

- every historical version expected to remain available exists in the canonical project;
- every migrated artifact preserves its original digest;
- future `astro-icons` publication targets only the canonical registry;
- public installation succeeds from that registry.

---

## TDD cycle 3 — Retry and publication-state contract

Preserve or establish the explicit state model:

```text
ABSENT
PRESENT_MATCHING
PRESENT_DIFFERENT
```

Required behavior:

| State     | Result                                      |
| --------- | ------------------------------------------- |
| absent    | publish exact validated archive             |
| matching  | perform no upload; continue verification    |
| different | stop with structured artifact inconsistency |

Also test the distinction:

```text
source GitLab project
≠
npm registry GitLab project
```

Changing the source-project ID must not change the registry destination.

### Acceptance criteria

- retry after a successful package write is convergent;
- a different existing artifact cannot be replaced silently;
- package publication never derives the target from `CI_PROJECT_ID`.

---

# Phase 2 — Make Nushell lesson examples executable contracts

## Priority

**Required — merge blocking**

## Goal

Every example presented to students as runnable Nushell must be:

1. syntactically valid;
2. executable/type-checkable under the course-supported Nushell version;
3. exactly the source validated by CI;
4. semantically consistent with the lesson prose.

The important contract is:

```text
student-visible code
        =
code checked by Nushell
```

not:

```text
student-visible code
        ≈
similar test fixture
```

---

## TDD cycle 1 — Correct the current regressions

### Red

Add focused BDD regressions.

```text
given the check-library-layout example
when its visible source is inspected
then it references $expected_paths
and contains no reference to $expected_pathsh
```

And:

```text
given album-title with signature record -> string
when the lesson explains an incompatible string pipeline
then it states that album-title expects a record from pipeline input
```

### Green

Correct:

```nu
$expected_pathsh
```

to:

```nu
$expected_paths
```

Correct the lesson explanation to something equivalent to:

> `album-title` está definida para recibir un `record` como entrada de pipeline. Al escribir
> `"Powerslave" | album-title`, el pipeline intenta entregar un `string` donde la firma declara que espera un `record`.

Do not rewrite unrelated pedagogical content in this cycle.

### Refactor

Remove any duplicated prose assertion that could contradict the declared signature again.

### Acceptance criteria

- the typo is absent;
- the explanation consistently describes `record -> string`;
- lesson render tests remain green.

---

## TDD cycle 2 — Establish canonical runnable examples

### Red

Select the lesson snippets that are explicitly presented as runnable scripts, beginning with:

```text
check-expected-files.nu
check-library-layout.nu
album-title-related example
```

Add tests that execute or validate **the exact source rendered by the lesson**.

### Green

Move reusable executable source out of anonymous template literals into a cohesive canonical source module or fixture
area, for example:

```text
src/data/examples/nushell/
├── checkExpectedFiles.ts
├── checkLibraryLayout.ts
└── albumTitle.ts
```

The naming/location can follow existing repository taxonomy; the architectural requirement is more important than the
exact path.

The page imports and renders these values.

The test suite writes those same values to temporary `.nu` files and validates them using the supported Nushell
executable.

### Refactor

Keep presentation metadata separate from executable source:

```text
executable Nushell source
        ↓
lesson rendering

title/explanation/source link
        ↓
Astro presentation
```

This keeps changes to prose from affecting code validation and vice versa.

---

## TDD cycle 3 — Pin and verify the Nushell execution environment

If CI does not already contain Nushell, add a dedicated verification job with an explicit supported version.

Do not:

- silently skip the validation when `nu` is absent;
- depend on whatever Nushell happens to be installed on a developer workstation.

Record the version in one reproducible location.

### Acceptance criteria

- CI validates the exact lesson snippets using the supported Nushell version;
- clean CI does not depend on developer-machine tooling;
- validation fails if a displayed runnable example becomes syntactically/type invalid.

---

## TDD cycle 4 — Companion-code differential contract

### Goal

Detect divergence between the website lesson and the canonical companion repository.

### Red

For scripts that deliberately exist in both places, define explicit equivalence.

For example:

```text
lesson check-library-layout.nu
        =
companion check-library-layout.nu
```

Compare normalized content rather than maintaining two independent behavioral tests.

### Green

Add a dedicated cross-repository integration check.

Do not make every fast unit-test invocation depend on network access.

Suitable execution contexts include:

- a scheduled integration job;
- a release/QA job;
- a local verification command when the sibling checkout is available.

### Acceptance criteria

- duplicated executable examples have a detectable synchronization contract;
- ordinary render tests remain responsible for DOM/pedagogy rather than pretending to validate Nushell execution.

---

# Phase 3 — Close browser-visible UI contracts

## Priority

**High-value; required to legitimately close the affected traceability items**

## Goal

Verify the actual behavior introduced by the diagnostic styling and Mermaid viewport changes using the testing layer
capable of observing CSS/layout behavior.

Render-level Astro tests remain useful but are insufficient for:

- computed colors;
- scrolling;
- overflow;
- responsive layout;
- copy-control interaction;
- print behavior.

---

## TDD cycle 1 — Nushell diagnostic browser contract

Use the existing Playwright infrastructure.

### DDT matrix

At minimum:

| Theme | Viewport |
| ----- | -------- |
| light | desktop  |
| dark  | desktop  |
| light | narrow   |
| dark  | narrow   |

### Red

Assert observable requirements:

```text
given the incompatible pipeline diagnostic
then "Error de tipo" is visible
and a warning icon is present
and its header/border is visually differentiated from ordinary output
and the diagnostic body remains neutral
```

Also verify:

- copy control remains reachable and usable;
- label and title do not overlap the copy control;
- raw diagnostic text remains unchanged;
- the compatible `Powerslave` result retains default styling;
- meaning remains available through text rather than color alone.

### Green

Adjust styling only as necessary.

### Refactor

Prefer semantic theme tokens over lesson-local classes.

### Acceptance criteria

- all four theme/viewport combinations pass;
- diagnostic meaning does not rely solely on red/pink;
- body background remains neutral;
- no text/control collision occurs.

---

## TDD cycle 2 — Mermaid responsive layout contract

### Fixtures

Reuse the canonical diagram fixtures already introduced rather than creating page-specific duplicates.

Include at least:

- a small linear diagram;
- a wide diagram with long labels;
- a grouped/nested diagram.

### Red

At narrow width:

```text
wide SVG
        ↓
diagram viewport has local horizontal overflow
        ↓
document viewport does not horizontally overflow
```

Also verify that a small diagram does not receive unnecessary horizontal scrolling.

### Print contract

Emulate print media and verify:

- the diagram is visible;
- it does not rely on a scroll-only viewport;
- the SVG remains inside printable content bounds as far as Playwright's layout measurements can establish.

Avoid brittle pixel-perfect screenshot comparison unless there is a demonstrated need.

### Acceptance criteria

- large diagrams scroll locally on narrow screens;
- page-level horizontal overflow remains absent;
- small diagrams remain naturally sized;
- print styling avoids obvious clipping;
- existing accessible description/content remains intact.

---

## TDD cycle 3 — Make semantic colors genuinely canonical

### Goal

Ensure the semantic error palette has one enforceable source of truth.

Current architecture should move from:

```text
semanticColors.ts ──→ Callout

duplicated literals ──→ OutputBlock
```

toward:

```text
semantic error tokens
       ↙       ↘
Callout       OutputBlock
```

### Preferred Green implementation

If compatible with the current Tailwind setup, define stable CSS custom properties:

```css
--semantic-error-border
--semantic-error-foreground
```

and use statically discoverable Tailwind arbitrary-property classes such as:

```text
border-[var(--semantic-error-border)]
text-[var(--semantic-error-foreground)]
```

Do not introduce a site-wide token framework merely for this fix.

If the tooling makes this disproportionately complex, retain the present structure temporarily but add an executable
consistency contract. A comment saying values must remain synchronized is not sufficient.

### Acceptance criteria

- there is no independently editable duplicate palette without a consistency check;
- light/dark semantic values remain unchanged;
- callouts retain their current appearance.

---

# Phase 4 — Reconcile semantic APIs and traceability evidence

## Priority

Split internally:

- traceability correctness: **required**;
- reading-guide API rename: **high-value, non-blocking if necessary**.

---

## TDD cycle 1 — Replace layout-oriented `compact` with a semantic mode

## Goal

Make the component API describe what information is shown rather than how visually dense it appears.

### Red

Use DDT over the presentation contract:

| Presentation | Expected information                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| `full`       | Tipo, Dificultad, Extensión, Por qué leerlo, En qué enfocarse, Después de leer |
| `student`    | Nivel, Qué buscar, Idea que deberías llevarte, Pregunta guía when present      |

Also characterize the existing default behavior before changing the prop.

### Green

Replace:

```ts
compact?: boolean;
```

with:

```ts
presentation?: "full" | "student";
```

Default:

```text
full
```

to preserve existing callers.

### Refactor

If both branches duplicate `<dt>/<dd>` markup, derive typed presentation rows first:

```ts
type GuideField = {
    label: string;
    value?: string;
};
```

then render the resulting rows once.

Do not generalize this into a dynamic content-schema framework.

### Acceptance criteria

- existing callers without the prop retain the full presentation;
- student-facing pages retain the simplified information hierarchy;
- the API name accurately describes semantic behavior.

---

## TDD cycle 2 — Establish a traceability completion contract

## Goal

Ensure `[DONE]` and movement into `closed/` mean that all **required** acceptance evidence exists.

### Contract

A closed record should contain, when applicable:

- final commit or implementation reference;
- test commands actually executed;
- relevant pipeline ID/result;
- package/artifact digests;
- browser evidence when browser behavior was a required acceptance criterion;
- explicitly deferred **optional** work;
- explanation of any acceptance criterion intentionally revised during implementation.

Required work cannot simply appear under:

> not done

inside a `[DONE]` record.

### Red

Add a lightweight traceability validation test for mechanically checkable invariants.

Do **not** try to interpret arbitrary Markdown prose with an elaborate parser.

Reasonable checks include:

```text
closed record
+
status [DONE]
+
explicit "Required evidence missing"
→ fail
```

or a structured frontmatter/status field if the repository already has or is willing to introduce one.

### Green

Reopen or amend the current records whose evidence does not match their completion status.

Specifically, browser work should either:

1. be completed; or
2. be reclassified explicitly as optional/deferred with the acceptance criteria updated and rationale recorded.

### Refactor

If traceability documents have enough recurring metadata, consider minimal structured frontmatter such as:

```yaml
status: closed
required-evidence:
    - unit
    - browser
```

Only introduce this if it simplifies an actual recurring workflow; do not turn traceability Markdown into a bespoke
workflow engine.

### Acceptance criteria

- no closed record claims completion while simultaneously documenting an unmet required acceptance criterion;
- current remediation records point to concrete evidence;
- project status can be trusted without reconstructing history manually.

---

# Testing-strategy disposition

The project guidelines require considering all declared styles, but explicitly caution against introducing techniques
whose expected assurance value does not justify their complexity.

| Technique                  | Decision                             | Application                                                                                        |
| -------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Example-based / BDD        | **Required**                         | Nushell regressions, UI behavior, reading presentation, registry decisions                         |
| Data-driven testing        | **Required**                         | Package-version matrix, theme/viewport matrix, reading modes, registry states                      |
| Property-based testing     | **Selective**                        | Retain where existing Mermaid properties have meaningful generated input spaces                    |
| Differential testing       | **Required**                         | Old/new package artifacts and lesson/companion source equivalence                                  |
| Metamorphic testing        | **High value**                       | Diagnostic variant must not alter raw error text; source project ID must not alter registry target |
| Mutation testing           | **Targeted**                         | Registry reconciliation/digest decisions only                                                      |
| Fuzz testing               | **Not justified currently**          | No newly introduced parser/decoder or untrusted binary/text protocol boundary                      |
| Mock testing               | **Minimize**                         | Prefer real Astro rendering, real browser, real package install, real Nushell                      |
| Model-based testing        | **Optional**                         | Only if registry lifecycle grows beyond the current explicit state model                           |
| State-machine testing      | **Required for publication**         | absent / matching / different / retry behavior                                                     |
| Contract testing           | **Required**                         | Registry topology, package artifacts, runnable examples, component APIs                            |
| Snapshot/golden            | **Selective**                        | Small canonical code/manifest fixtures; avoid entire pages                                         |
| Concurrency testing        | **Registry-specific**                | Simultaneous publication/retry of one immutable package version                                    |
| Deterministic simulation   | **Useful**                           | Pure registry publication planner with synthetic observations                                      |
| Static analysis            | **Required**                         | Astro/TypeScript, package metadata, CI configuration where supported                               |
| Symbolic execution         | **Not justified**                    | Relevant state spaces are small and directly enumerable                                            |
| Formal specification/proof | **Not justified**                    | Typed contracts and explicit transition tables are sufficient                                      |
| Runtime assertions         | **Required at external boundaries**  | Package name/version/digest/registry destination                                                   |
| Sanitizer-style tooling    | **Not applicable**                   | No native-memory boundary                                                                          |
| Cross-version testing      | **Required for published libraries** | Supported Astro consumer versions                                                                  |
| Browser/E2E                | **Required for visual behavior**     | Diagnostic styling and Mermaid responsive/print behavior                                           |
| Accessibility testing      | **Required at affected UI boundary** | Error meaning, icon semantics, diagram accessible descriptions                                     |

### Two particularly valuable combinations

For the registry:

```text
state-machine tests
+
DDT
+
differential artifact checks
+
targeted mutation testing
+
real clean-consumer integration
```

For student-facing code:

```text
BDD render contract
+
real Nushell execution/type validation
+
differential companion check
```

These combinations test different failure modes rather than duplicating the same assurance at multiple levels.

---

# Global acceptance criteria

The remediation is complete when all of the following are true.

## Registry/reproducibility

- the canonical registry serves every `@ravenhill/*` version referenced by DIBS;
- a clean dependency installation succeeds with an isolated pnpm store;
- historical `astro-icons` package bytes have preserved digest evidence;
- unscoped dependencies continue resolving normally;
- package publication reconciliation remains retry-safe.

## Nushell correctness

- `$expected_pathsh` no longer appears;
- `check-library-layout.nu` passes real Nushell validation;
- `album-title` prose consistently describes `record` pipeline input;
- displayed runnable examples are the exact sources CI validates;
- relevant companion scripts have an explicit synchronization check.

## UI assurance

- diagnostic styling has browser evidence in light/dark and narrow/desktop combinations;
- raw Nushell diagnostic text remains unchanged;
- diagnostic semantics do not depend solely on color;
- wide Mermaid diagrams overflow locally rather than widening the page;
- representative print behavior is verified.

## Architecture/maintainability

- semantic error colors have one enforceable source of truth;
- reading-guide presentation is represented semantically rather than by `compact`;
- no unnecessary new abstraction layer is introduced.

## Traceability

- required evidence exists before records are marked closed;
- currently inaccurate `[DONE]` records are corrected;
- final verification commands and CI evidence are recorded.

## CI

At the final candidate commit:

- formatting passes;
- static checks pass;
- Astro/unit/render tests pass;
- executable Nushell checks pass;
- browser tests pass for required UI contracts;
- package/registry contracts pass;
- clean dependency installation passes;
- both push/MR pipelines are green as applicable.

---

# Non-goals

To keep the remediation bounded, do not use it to:

- redesign the whole package registry architecture again after the canonical endpoint works;
- rewrite unrelated Nushell lessons;
- execute every historical code snippet in the website;
- introduce a general-purpose literate-programming system;
- redesign all code/output components;
- rebuild the site's entire design-token system;
- redesign Mermaid itself;
- migrate all reading guides to a new content model;
- convert every traceability document to structured data;
- introduce testing techniques solely to increase technique count or coverage metrics.

---

# Suggested execution order

```text
Phase 1: registry correctness
        ↓
canonical artifacts actually available
        ↓
clean DIBS install proves topology
        ↓
Phase 2: Nushell correctness
        ↓
fix current regressions
        ↓
make displayed examples executable
        ↓
companion differential check
        ↓
MERGE-BLOCKING CORRECTNESS GATE
        ↓
Phase 3: browser-visible contracts
        ↓
diagnostic theme/viewport tests
        ↓
Mermaid overflow + print tests
        ↓
semantic color consolidation
        ↓
Phase 4: process/API cleanup
        ↓
reconcile traceability records
        ↓
rename reading-guide presentation API
        ↓
fresh complete CI
```

The main improvement over the current plan is that it now has a **clear evidence hierarchy**: first make external
dependencies and teaching content correct, then verify the browser-visible behavior at the correct test boundary, and
finally clean up semantic APIs and project-process contracts. It also prevents a green render test or a `[DONE]`
Markdown marker from being mistaken for evidence that a package, script, or UI behavior actually works.
