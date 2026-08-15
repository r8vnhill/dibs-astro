# Restore the `f441621c` pipeline deterministically

## Summary

Reproduce and resolve the independent failures in `test:check`, `test:unit`, and `test:astro-render` for commit
`f441621c` using the pipeline's canonical environment:

- Node.js `24.11.0`;
- pnpm `11.8.0`;
- frozen dependency installation.

Treat each failing job as an independent diagnostic boundary until evidence establishes a shared cause.

Preserve current externally observable site behavior, architectural rules, deployment conditions, and the
already-passing E2E contract.

Do not broaden the work into dependency modernization, TypeScript migration, or CI optimization unless the observed
diagnostics make one of those changes necessary for correctness.

---

## Phase 1 — Establish the canonical failure baseline

### Goal

Produce a minimal, deterministic reproducer for every failing CI job before changing production code or configuration.

### Scope

Inspect and reproduce:

- `test:check`;
- `test:unit`;
- `test:astro-render`.

Use the exact commands and toolchain declared by the pipeline.

For `pnpm check`, decompose the aggregate command and execute each constituent check independently so the actual owning
boundary is identified.

For Vitest, preserve the distinction between:

- ordinary tests selected by `vitest.config.ts`;
- Astro render tests selected by `vitest.astro.config.ts`.

### TDD cycle 1 — Characterize each current regression

**Red**

For every failing job:

1. reproduce it from a clean dependency installation;
2. identify the first meaningful diagnostic or failing test;
3. reduce it to the smallest command, test, fixture, or component that still reproduces the condition.

Record whether failures are:

- independent;
- causally related;
- consequences of an earlier failed generation/check step.

**Green**

No production fix is required in this cycle.

Establish stable reproduction commands for each observed problem.

**Refactor**

Remove unnecessary setup from the reproducer while retaining the behavior that exposes the regression.

Where useful, improve test descriptions so they express the expected observable contract rather than the implementation
detail currently producing the diagnostic.

### Acceptance criteria

- Each failed CI job has an exact locally reproducible diagnostic.
- `pnpm check` is narrowed to its specific failing subcommand or subcommands.
- Unit and Astro-render failures are identified independently.
- The classification of failures is evidence-based rather than inferred from job names.
- Reproduction works with Node `24.11.0`, pnpm `11.8.0`, and `pnpm install --frozen-lockfile`.
- No tracked project files are modified merely by establishing the baseline.

### Non-goals

- fixing code;
- changing architectural rules;
- upgrading dependencies;
- changing TypeScript versions;
- modifying GitLab CI structure.

---

## Phase 2 — Correct failures at their owning boundaries

### Goal

Restore `test:check`, `test:unit`, and `test:astro-render` without weakening existing contracts or introducing unrelated
behavioral changes.

Each independent cause identified in Phase 1 becomes its own short TDD cycle.

### Cycle 2A — Restore the static/project checks

#### Red

Retain the smallest reproducer for the failing `pnpm check` component.

Prefer a behavioral description such as:

> given the canonical repository state when the project consistency checks are executed then the source, generated
> artifacts, metadata, and architectural dependencies conform to their declared contracts

#### Green

Correct the problem in the component that owns the constraint.

Examples may include:

- source typing;
- generated metadata consistency;
- architectural dependencies;
- Astro configuration;
- generated artifacts;
- bibliography/content generation;
- toolchain interoperability.

Do **not**:

- remove the failing check;
- globally suppress its diagnostic;
- weaken an architectural dependency rule merely to obtain a green pipeline.

If the diagnostic exposes a genuine mismatch between a rule and the intended architecture, treat changing that rule as
an explicit design decision with regression coverage.

#### Refactor

After the check is green:

- remove duplicated configuration;
- clarify ownership of generated artifacts;
- improve names or module boundaries where the regression exposed ambiguity;
- keep the affected implementation focused and appropriately sized.

#### Acceptance criteria

- `pnpm check` passes independently.
- All existing architectural and metadata checks remain enabled unless an intentional contract change is separately
  justified.
- Generator/check commands do not leave unexplained tracked changes.
- Existing behavior outside the corrected boundary remains unchanged.

---

### Cycle 2B — Restore the ordinary Vitest suite

#### Red

For each failing ordinary Vitest case, create or retain the smallest BDD-style regression test that describes the
expected public or module-level behavior.

Do not mix `.render.test.ts` behavior into this cycle.

#### Green

Correct the owning implementation according to the existing contract.

If a test expectation is no longer valid, first establish evidence that the behavior was intentionally changed. Update
the test only as part of that explicit contract change.

Prefer:

1. pure domain behavior;
2. in-memory collaborators;
3. lightweight fakes;
4. mocks only where interaction itself is the behavior under test.

#### Refactor

After restoring behavior:

- consolidate genuinely repeated fixtures;
- remove duplicated test setup;
- retain explicit test intent;
- avoid introducing a generalized testing abstraction for a single regression.

#### Acceptance criteria

- `vitest.config.ts` passes independently.
- No `.render.test.ts` test is required for the ordinary suite to pass.
- Unrelated passing tests require no behavioral changes.
- Tests describe observable contracts rather than private call sequences.

---

### Cycle 2C — Restore Astro component rendering

#### Red

Reduce the Astro-render problem to the smallest fixture exercising the affected integration.

At minimum, retain a regression test equivalent to:

> given an Astro component using the configured framework integrations when it is rendered through the project test
> adapter then it produces the expected server-rendered output

Add the failing real component or page only after the minimal fixture exposes the relevant contract.

#### Green

Correct the rendering boundary in `src/test-utils/astro-render.ts` or the actual owning component/configuration
identified by Phase 1.

Keep Astro Container API setup centralized behind `src/test-utils/astro-render.ts` so individual tests do not need to
know:

- renderer-registration details;
- framework integration initialization;
- Container API setup.

Retain `@astrojs/react/container-renderer` unless the observed diagnostic demonstrates that a different supported Astro
API is required.

#### Refactor

Once rendering works:

- centralize only shared container initialization;
- keep component-specific expectations in their own tests;
- minimize framework-specific knowledge outside the adapter.

#### Acceptance criteria

- `vitest.astro.config.ts` passes independently.
- A minimal rendering fixture passes.
- Every component that previously exposed the regression passes.
- Rendered output semantics remain unchanged unless an intentional behavior change is documented.
- Tests do not duplicate renderer/container configuration.

---

## Phase 3 — Validate the complete pipeline from a clean checkout

### Goal

Demonstrate that all required jobs succeed from one canonical repository state without depending on execution order,
local artifacts, or mutable workspace state.

### TDD cycle 3 — Clean-checkout reproducibility

**Red**

Start from a clean checkout of the repaired commit and remove all locally generated or cached project state that CI does
not provide.

**Green**

Execute the canonical sequence:

```text
pnpm install --frozen-lockfile
pnpm check
unit Vitest suite
Astro-render Vitest suite
E2E suite
pnpm build
```

After generation/check commands, verify that the tracked working tree remains in the expected state.

**Refactor**

Only after every required job is green, improve diagnostics where the incident showed that job output was unnecessarily
difficult to interpret.

Prefer adding clearer command boundaries or CI log grouping rather than introducing additional orchestration
abstractions.

### Acceptance criteria

- `test:check` passes.
- `test:unit` passes.
- `test:astro-render` passes.
- `test:e2e` remains green.
- `build` passes.
- All results come from the same commit.
- A second clean execution produces the same result.
- Generated artifacts are deterministic.
- No job depends on mutable `node_modules` copied from another job.
- Existing deployment branch/tag conditions are unchanged.

---

## Phase 4 — Harden CI only where the incident provides evidence

### Goal

Reduce future diagnosis cost without expanding the pipeline-recovery change into a general CI redesign.

This phase is **high value but secondary to restoring correctness**.

### Scope

Review only CI weaknesses encountered while diagnosing this pipeline.

Candidates include:

- clearer separation of aggregate `check` diagnostics;
- reusable GitLab CI fragments for repeated Node/pnpm setup;
- lockfile-keyed pnpm store caching;
- explicit environment/version reporting;
- better preservation of test reports when a job fails.

Keep each test job independently reproducible.

### Constraints

Do not:

- share mutable `node_modules` between jobs;
- introduce a new CI abstraction merely to remove a few YAML lines;
- modify deployment conditions;
- combine independent test suites into one opaque job;
- introduce CI caching that becomes necessary for correctness.

### Acceptance criteria

- Every required job still succeeds without relying on cache state.
- Failure output identifies the responsible command/test clearly.
- Repeated setup is reduced only where doing so improves maintainability.
- Pipeline semantics remain equivalent to the repaired baseline.

---

## TypeScript strategy

Do **not** make TS6/TS7 changes part of the baseline implementation plan.

Instead:

1. preserve the versions currently required by the repository while reproducing the failure;
2. if Phase 1 identifies TypeScript/API interoperability as a cause, document the exact consumer requiring the
   programmatic TypeScript API;
3. introduce a TS6/TS7 split only if it is necessary and supported by the relevant Astro/TypeScript tooling;
4. test each compiler/tool boundary independently;
5. document the resulting responsibilities explicitly.

A broad TypeScript 7 migration is therefore **deferred unless evidence from this pipeline requires it**.

This keeps the remediation aligned with the project's principle of preferring the smallest justified architectural
change rather than introducing novelty without a concrete benefit.

---

## Repository-state constraints

Preserve unrelated working-tree changes, including:

- `config.toml`;
- already-generated metadata unrelated to this regression;
- other open improvement plans;
- unrelated local artifacts.

Before modifying a file, distinguish pipeline-related state from pre-existing checkout state.

Do not clean, reset, regenerate, or overwrite unrelated modifications merely to establish a clean validation
environment; use a separate clean checkout/worktree when necessary.

---

## Deferred work

Unless required by an observed diagnostic, defer:

- broad dependency upgrades;
- full TypeScript 7 migration;
- Astro major-version migration;
- general CI redesign;
- architectural layer reorganization;
- test-suite consolidation;
- changelog/version changes;
- deployment changes;
- unrelated generated-artifact cleanup.

If any of these becomes necessary for the repair, document the evidence and promote it explicitly into the relevant
phase rather than allowing it to enter the implementation implicitly.

---

## Final acceptance criteria

The work is complete when:

- `test:check`, `test:unit`, `test:astro-render`, `test:e2e`, and `build` pass from the same commit;
- the result is reproducible from a clean checkout with Node `24.11.0`, pnpm `11.8.0`, and a frozen lockfile;
- generated/check artifacts are deterministic;
- existing architecture checks remain active;
- ordinary and Astro-render tests retain distinct responsibilities;
- `src/test-utils/astro-render.ts` remains the single project-owned Astro Container API boundary if that abstraction is
  still appropriate after diagnosis;
- existing externally observable site behavior is preserved except for explicitly identified defect corrections;
- deployment semantics are unchanged;
- unrelated checkout modifications remain untouched;
- any TS6/TS7 decision is based on an observed tooling requirement rather than being introduced speculatively.

This version gives the implementation a much better **stop condition**: first recover correctness, then make only the
hardening changes justified by what the incident actually exposed. It also removes the riskiest assumption in the
current plan—that the TypeScript strategy and CI redesign are already known to be part of the solution before the
failing diagnostics have been captured.
